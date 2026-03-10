import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, action } = await req.json();

    if (action === "send") {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
      }

      const code = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code,
          type: "EMAIL",
          expiresAt,
        },
      });

      await sendVerificationCode(email, code);

      return NextResponse.json({ message: "Kodi u dergua" });
    }

    if (action === "verify") {
      const { code } = await req.json();
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

      return NextResponse.json({ message: "Email u verifikua" });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
