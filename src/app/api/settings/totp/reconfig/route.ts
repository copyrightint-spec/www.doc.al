import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import { sendVerificationCode } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";

// Store temporary reconfig sessions in memory (per-process)
const reconfigSessions = new Map<
  string,
  { passwordVerified: boolean; emailVerified: boolean; expiresAt: number }
>();

function cleanupSessions() {
  const now = Date.now();
  for (const [key, session] of reconfigSessions.entries()) {
    if (session.expiresAt < now) {
      reconfigSessions.delete(key);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    cleanupSessions();

    const { step, password, code, token } = await req.json();
    const userId = session.user.id;

    if (step === "verify-password") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true, totpEnabled: true, email: true },
      });

      if (!user?.totpEnabled) {
        return NextResponse.json(
          { error: "2FA nuk eshte i aktivizuar" },
          { status: 400 }
        );
      }

      if (!user.password) {
        return NextResponse.json(
          { error: "Llogaria nuk ka fjalekalim (Google login)" },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Fjalekalimi i gabuar" },
          { status: 400 }
        );
      }

      // Generate email OTP code
      const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = crypto.createHash("sha256").update(emailOtp).digest("hex");

      // Store in VerificationCode table
      await prisma.verificationCode.create({
        data: {
          code: hashedOtp,
          type: "EMAIL",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
          userId,
        },
      });

      // Send email with OTP
      const sent = await sendVerificationCode(user.email!, emailOtp, userId);
      if (!sent) {
        return NextResponse.json(
          { error: "Nuk u dergua email-i. Provoni perseri." },
          { status: 500 }
        );
      }

      // Store reconfig session
      reconfigSessions.set(userId, {
        passwordVerified: true,
        emailVerified: false,
        expiresAt: Date.now() + 15 * 60 * 1000,
      });

      return NextResponse.json({ success: true });
    }

    if (step === "verify-email-otp") {
      const reconfigSession = reconfigSessions.get(userId);
      if (!reconfigSession?.passwordVerified) {
        return NextResponse.json(
          { error: "Filloni nga hapi i pare" },
          { status: 400 }
        );
      }

      if (reconfigSession.expiresAt < Date.now()) {
        reconfigSessions.delete(userId);
        return NextResponse.json(
          { error: "Sesioni ka skaduar. Filloni perseri." },
          { status: 400 }
        );
      }

      // Find the latest unused verification code for this user
      const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          userId,
          type: "EMAIL",
          code: hashedCode,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verificationCode) {
        return NextResponse.json(
          { error: "Kodi i gabuar ose ka skaduar" },
          { status: 400 }
        );
      }

      // Mark code as used
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      });

      // Generate new TOTP secret
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const { secret: newSecret, uri } = generateTotpSecret(user!.email);
      const qrCode = await QRCode.toDataURL(uri);

      // Store the new secret (not yet fully committed until verified)
      await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: newSecret },
      });

      reconfigSession.emailVerified = true;

      return NextResponse.json({ success: true, qrCode, secret: newSecret });
    }

    if (step === "verify-new-totp") {
      const reconfigSession = reconfigSessions.get(userId);
      if (!reconfigSession?.passwordVerified || !reconfigSession?.emailVerified) {
        return NextResponse.json(
          { error: "Filloni nga hapi i pare" },
          { status: 400 }
        );
      }

      if (reconfigSession.expiresAt < Date.now()) {
        reconfigSessions.delete(userId);
        return NextResponse.json(
          { error: "Sesioni ka skaduar. Filloni perseri." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpSecret: true },
      });

      if (!user?.totpSecret) {
        return NextResponse.json(
          { error: "TOTP nuk eshte konfiguruar" },
          { status: 400 }
        );
      }

      const isValid = verifyTotp(user.totpSecret, token);
      if (!isValid) {
        return NextResponse.json(
          { error: "Kodi i pavlefshem" },
          { status: 400 }
        );
      }

      // Generate new backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString("hex").toUpperCase()
      );
      const hashedBackupCodes = backupCodes.map((c) =>
        crypto.createHash("sha256").update(c).digest("hex")
      );

      await prisma.user.update({
        where: { id: userId },
        data: {
          totpEnabled: true,
          totpBackupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "TOTP_RECONFIGURED",
          entityType: "User",
          entityId: userId,
          userId,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      reconfigSessions.delete(userId);

      return NextResponse.json({ message: "2FA u rikonfigurua", backupCodes });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
