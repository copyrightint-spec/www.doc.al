import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { action, token } = await req.json();

    if (action === "setup") {
      const { secret, uri } = generateTotpSecret(session.user.email);
      const qrCode = await QRCode.toDataURL(uri);

      await prisma.user.update({
        where: { id: session.user.id },
        data: { totpSecret: secret },
      });

      return NextResponse.json({ qrCode, secret });
    }

    if (action === "verify") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
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

      await prisma.user.update({
        where: { id: session.user.id },
        data: { totpEnabled: true },
      });

      return NextResponse.json({ message: "TOTP u aktivizua" });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
