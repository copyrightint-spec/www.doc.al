import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";

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
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: "Fjalekalimi u ndryshua me sukses",
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
