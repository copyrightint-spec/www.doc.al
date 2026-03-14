import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const signingRequest = await prisma.signingRequest.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            signatures: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                signerName: true,
                signerEmail: true,
                status: true,
                order: true,
                signedAt: true,
                viewedAt: true,
                verificationSentAt: true,
                lastReminderAt: true,
                notificationChannel: true,
                signatureImageUrl: true,
                createdAt: true,
              },
            },
            owner: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        requester: {
          select: { id: true, name: true, email: true, image: true },
        },
        template: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    if (!signingRequest) {
      return NextResponse.json({ error: "Kontrata nuk u gjet" }, { status: 404 });
    }

    // Authorization: user must be owner, requester, or a signer
    const isOwner = signingRequest.document.ownerId === session.user.id;
    const isRequester = signingRequest.requesterId === session.user.id;
    const isSigner = signingRequest.document.signatures.some(
      (sig) => sig.signerEmail === session.user.email
    );

    if (!isOwner && !isRequester && !isSigner) {
      return NextResponse.json({ error: "Nuk keni akses" }, { status: 403 });
    }

    // Fetch audit logs related to this document
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "Document", entityId: signingRequest.documentId },
          { entityType: "SigningRequest", entityId: signingRequest.id },
          {
            entityType: "Signature",
            entityId: {
              in: signingRequest.document.signatures.map((s) => s.id),
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: signingRequest.id,
        status: signingRequest.status,
        message: signingRequest.message,
        companyName: signingRequest.companyName,
        companyLogo: signingRequest.companyLogo,
        brandColor: signingRequest.brandColor,
        expiresAt: signingRequest.expiresAt,
        completedAt: signingRequest.completedAt,
        cancelledAt: signingRequest.cancelledAt,
        createdAt: signingRequest.createdAt,
        document: {
          id: signingRequest.document.id,
          title: signingRequest.document.title,
          fileName: signingRequest.document.fileName,
          fileSize: signingRequest.document.fileSize,
          fileHash: signingRequest.document.fileHash,
          status: signingRequest.document.status,
          createdAt: signingRequest.document.createdAt,
          owner: signingRequest.document.owner,
        },
        signatures: signingRequest.document.signatures,
        requester: signingRequest.requester,
        template: signingRequest.template,
        auditLogs,
        isOwner,
        isRequester,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
