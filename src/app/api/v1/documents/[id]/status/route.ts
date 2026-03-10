import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  try {
    const { id } = await params;

    const document = await prisma.document.findFirst({
      where: { id, ownerId: auth.userId },
      include: {
        signatures: {
          select: {
            id: true,
            signerName: true,
            signerEmail: true,
            status: true,
            signedAt: true,
            order: true,
          },
        },
        timestampEntries: {
          select: {
            id: true,
            sequenceNumber: true,
            fingerprint: true,
            otsStatus: true,
            btcBlockHeight: true,
          },
        },
      },
    });

    if (!document) return apiError("Dokumenti nuk u gjet", 404);

    return apiSuccess({
      id: document.id,
      title: document.title,
      status: document.status,
      fileHash: document.fileHash,
      signatures: document.signatures,
      timestamps: document.timestampEntries,
    });
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
