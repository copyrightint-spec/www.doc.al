import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { certificateId, reason } = await req.json();

    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, userId: session.user.id },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certifikata nuk u gjet" }, { status: 404 });
    }

    if (cert.revoked) {
      return NextResponse.json({ error: "Certifikata eshte revokuar tashme" }, { status: 400 });
    }

    await prisma.certificate.update({
      where: { id: certificateId },
      data: { revoked: true, revokedAt: new Date(), revokeReason: reason },
    });

    await prisma.auditLog.create({
      data: {
        action: "CERTIFICATE_REVOKED",
        entityType: "Certificate",
        entityId: certificateId,
        userId: session.user.id,
        metadata: { reason },
      },
    });

    return NextResponse.json({ success: true, message: "Certifikata u revokua" });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
