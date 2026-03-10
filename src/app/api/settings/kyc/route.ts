import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Dokumenti eshte i detyrueshem" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipi i skedarit nuk lejohet. Perdorni JPG, PNG, ose PDF." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Skedari nuk duhet te kaloje 10MB" },
        { status: 400 }
      );
    }

    // TODO: Upload to S3 and get URL
    const kycDocumentUrl = `/uploads/kyc/${session.user.id}/${file.name}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        kycDocumentUrl,
        kycStatus: "PENDING",
      },
    });

    return NextResponse.json({
      message: "Dokumenti u ngarkua. KYC eshte ne pritje te verifikimit.",
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true, kycDocumentUrl: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
