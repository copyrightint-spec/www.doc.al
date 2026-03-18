import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

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

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Fjalekalimi duhet te kete te pakten 8 karaktere" },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ResetPassword] Error:", error);
    return NextResponse.json(
      { error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
