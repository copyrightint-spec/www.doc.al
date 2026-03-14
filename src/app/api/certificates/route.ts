import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exportCertificateP12 } from "@/lib/crypto/certificates";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        serialNumber: true,
        subjectDN: true,
        issuerDN: true,
        validFrom: true,
        validTo: true,
        type: true,
        revoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: certificates });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

// Export certificate as P12
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { certificateId, password } = await req.json();
    if (!certificateId || !password) {
      return NextResponse.json({ error: "Certificate ID dhe password jane te detyrueshem" }, { status: 400 });
    }

    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId: session.user.id },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certifikata nuk u gjet" }, { status: 404 });
    }

    const p12Buffer = await exportCertificateP12(certificateId, password);

    return new NextResponse(new Uint8Array(p12Buffer), {
      headers: {
        "Content-Type": "application/x-pkcs12",
        "Content-Disposition": `attachment; filename="${session.user.name.replace(/\s/g, "_")}_certificate.p12"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
