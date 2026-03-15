import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, code } = body;

    if (!email) {
      return NextResponse.json({ error: "Email eshte i detyrueshem" }, { status: 400 });
    }

    if (action === "send") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
      }

      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code: verificationCode,
          type: "EMAIL",
          expiresAt,
        },
      });

      await sendVerificationCode(email, verificationCode, user.id);

      return NextResponse.json({ message: "Kodi u dergua" });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "Kodi eshte i detyrueshem" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
      }

      const verificationCode = await prisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code,
          type: "EMAIL",
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verificationCode) {
        return NextResponse.json({ error: "Kodi i pavlefshem ose i skaduar" }, { status: 400 });
      }

      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: "EMAIL_VERIFIED",
          entityType: "User",
          entityId: user.id,
          userId: user.id,
          metadata: { email },
        },
      });

      return NextResponse.json({ message: "Email u verifikua me sukses" });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
