import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "docal-mail",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  tls: { rejectUnauthorized: false },
});

/**
 * POST /api/auth/reset-password
 *
 * Reset password using a valid token from forgot-password email.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token dhe fjalekalimi jane te detyrueshem" },
        { status: 400 }
      );
    }

    if (!PASSWORD_REGEX.test(password)) {
      return NextResponse.json(
        { error: "Fjalekalimi duhet te kete min. 10 karaktere, shkronja te medha/vogla, numra dhe simbole" },
        { status: 400 }
      );
    }

    // Find valid token
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        code: token,
        type: "EMAIL",
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Linku ka skaduar ose eshte i pavlefshem. Kerkoni nje link te ri." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationCode.userId },
        data: { password: hashedPassword },
      }),
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      }),
    ]);

    // Send password reset confirmation email
    try {
      await transporter.sendMail({
        from: "doc.al <noreply@doc.al>",
        to: verificationCode.user.email,
        subject: "Fjalekalimi u Rivendos - doc.al",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Fjalekalimi u Rivendos</h2>
            <p style="color: #64748b;">Fjalekalimi i llogarise tuaj ne doc.al u rivendos me sukses.</p>
            <p style="color: #64748b;">Nese nuk e keni bere kete ndryshim, kontaktoni mbeshtetjen menjehere.</p>
            <p style="color: #94a3b8; font-size: 12px;">Data: ${new Date().toLocaleString("sq-AL")}</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[ResetPassword] Confirmation email failed:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
