import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            fileName: true,
            fileUrl: true,
            owner: { select: { name: true, email: true } },
            signatures: {
              select: {
                id: true,
                signerName: true,
                signerEmail: true,
                status: true,
                order: true,
                signedAt: true,
              },
              orderBy: { order: "asc" },
            },
            signingRequests: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: {
                companyName: true,
                companyLogo: true,
                brandColor: true,
                message: true,
                expiresAt: true,
              },
            },
          },
        },
      },
    });

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Link i pavlefshem ose i skaduar" },
        { status: 404 }
      );
    }

    // Track view
    if (!signature.viewedAt) {
      await prisma.signature.update({
        where: { id: signature.id },
        data: { viewedAt: new Date() },
      });
    }

    const signingRequest = signature.document.signingRequests[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        id: signature.id,
        signerName: signature.signerName,
        signerEmail: signature.signerEmail,
        status: signature.status,
        order: signature.order,
        document: {
          id: signature.document.id,
          title: signature.document.title,
          fileName: signature.document.fileName,
          fileUrl: signature.document.fileUrl,
          owner: signature.document.owner,
          signatures: signature.document.signatures,
        },
        signingRequest,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
