import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "docal-mail",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  tls: { rejectUnauthorized: false },
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { currentPassword, newPassword, totpCode } = await req.json();

    if (!currentPassword || !newPassword || !totpCode) {
      return NextResponse.json(
        { error: "Te gjitha fushat jane te detyrueshme" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Fjalekalimi i ri duhet te kete te pakten 8 karaktere" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, totpEnabled: true, totpSecret: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Perdoruesi nuk u gjet" },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { error: "Llogaria juaj nuk ka fjalekalim" },
        { status: 400 }
      );
    }

    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Duhet te aktivizoni 2FA para se te ndryshoni fjalekalimin" },
        { status: 400 }
      );
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Fjalekalimi aktual eshte i gabuar" },
        { status: 400 }
      );
    }

    const isTotpValid = verifyTotp(user.totpSecret, totpCode);
    if (!isTotpValid) {
      return NextResponse.json(
        { error: "Kodi 2FA eshte i pavlefshem" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(), // Force session refresh
      },
    });

    // Invalidate all existing sessions and verification codes
    await prisma.session.deleteMany({
      where: { userId: session.user.id },
    });
    await prisma.verificationCode.deleteMany({
      where: { userId: session.user.id, used: false },
    });

    // Send password change confirmation email
    try {
      await transporter.sendMail({
        from: "doc.al <noreply@doc.al>",
        to: session.user.email,
        subject: "Fjalekalimi u Ndryshua - doc.al",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Fjalekalimi u Ndryshua</h2>
            <p style="color: #64748b;">Fjalekalimi i llogarise tuaj ne doc.al u ndryshua me sukses.</p>
            <p style="color: #64748b;">Nese nuk e keni bere kete ndryshim, kontaktoni mbeshtetjen menjehere.</p>
            <p style="color: #94a3b8; font-size: 12px;">Data: ${new Date().toLocaleString("sq-AL")}</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[PasswordChange] Confirmation email failed:", emailErr);
    }

    return NextResponse.json({
      message: "Fjalekalimi u ndryshua me sukses",
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
