import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  sendSigningOtp,
  verifySigningOtp,
  verifySigningTotp,
  canUserSign,
} from "@/lib/signing-verification";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { action, code, token } = await req.json();

    // Check if user can sign
    if (action === "check") {
      const result = await canUserSign(session.user.id);
      return NextResponse.json(result);
    }

    // Step 1: Send email OTP
    if (action === "send-otp") {
      const result = await sendSigningOtp(session.user.id, session.user.email);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await prisma.auditLog.create({
        data: {
          action: "SIGNING_OTP_SENT",
          entityType: "User",
          entityId: session.user.id,
          userId: session.user.id,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
        },
      });

      return NextResponse.json({ message: "Kodi u dergua ne email" });
    }

    // Step 1 verify: Check email OTP
    if (action === "verify-otp") {
      if (!code) {
        return NextResponse.json({ error: "Kodi eshte i detyrueshem" }, { status: 400 });
      }

      const result = await verifySigningOtp(session.user.id, code);

      await prisma.auditLog.create({
        data: {
          action: result.success ? "SIGNING_OTP_VERIFIED" : "SIGNING_OTP_FAILED",
          entityType: "User",
          entityId: session.user.id,
          userId: session.user.id,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
        },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ message: "Email OTP i verifikuar", step: 2 });
    }

    // Step 2: Verify TOTP
    if (action === "verify-totp") {
      if (!token) {
        return NextResponse.json({ error: "TOTP kodi eshte i detyrueshem" }, { status: 400 });
      }

      const result = await verifySigningTotp(session.user.id, token);

      await prisma.auditLog.create({
        data: {
          action: result.success ? "SIGNING_TOTP_VERIFIED" : "SIGNING_TOTP_FAILED",
          entityType: "User",
          entityId: session.user.id,
          userId: session.user.id,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
        },
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        message: "Verifikimi i plote. Mund te nenshkruani.",
        verified: true,
      });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
