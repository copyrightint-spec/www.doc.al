import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileBuffer } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        signatures: {
          select: { signerEmail: true, signerId: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokumenti nuk u gjet" }, { status: 404 });
    }

    // Access control: owner, signer, or admin
    const isOwner = document.ownerId === session.user.id;
    const isSigner =
      document.signatures.some(
        (s) => s.signerId === session.user.id || s.signerEmail === session.user.email
      );
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

    if (!isOwner && !isSigner && !isAdmin) {
      return NextResponse.json({ error: "Nuk keni akses" }, { status: 403 });
    }

    if (!document.fileUrl) {
      return NextResponse.json(
        { error: "Ky dokument nuk eshte me i disponueshem per shkarkim. Per arsye privatesi, dokumentet fshihen pas dergimit me email." },
        { status: 410 }
      );
    }

    const buffer = await getFileBuffer(document.fileUrl);

    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_DOWNLOADED",
        entityType: "Document",
        entityId: document.id,
        userId: session.user.id,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        metadata: { fileName: document.fileName },
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
