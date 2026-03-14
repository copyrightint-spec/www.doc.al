import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { applyCompanySeal } from "@/lib/crypto/company-seal";
import { checkQuota, incrementQuota } from "@/lib/quota";

// POST - Apply specific seal to a document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  const { sealId } = await params;

  try {
    if (!auth.organizationId) {
      return apiError("API key duhet te jete i lidhur me nje organizate", 403);
    }

    const seal = await prisma.companySeal.findFirst({
      where: { id: sealId, organizationId: auth.organizationId, status: "ACTIVE" },
    });
    if (!seal) return apiError("Vula nuk u gjet ose nuk eshte aktive", 404);

    // Check API quota
    const apiQuota = await checkQuota(auth.organizationId, "apiCalls");
    if (!apiQuota.allowed) return apiError("Kuota e API thirrjeve u tejkalua", 429);
    await incrementQuota(auth.organizationId, "apiCalls");

    const body = await req.json();
    const { documentId, position, embedInPdf } = body;

    if (!documentId) return apiError("documentId eshte i detyrueshem", 400);

    // Apply seal
    const result = await applyCompanySeal({
      documentId,
      sealId,
      userId: auth.userId!,
      position,
    });

    const response: Record<string, unknown> = {
      appliedSealId: result.appliedSealId,
      certificationHash: result.certificationHash,
      verificationUrl: result.verificationUrl,
      timestamp: {
        serverId: result.timestampResult.serverId,
        serverSequence: result.timestampResult.serverSequence,
        otsSubmitted: result.timestampResult.otsSubmitted,
      },
    };

    // Optionally embed seal in PDF and return it
    if (embedInPdf) {
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (doc?.fileUrl) {
        response.note = "Use GET /api/v1/documents/{id}/sealed-pdf to download the sealed PDF";
      }
    }

    return apiSuccess(response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim ne server";
    return apiError(message, message.includes("nuk u gjet") ? 404 : 500);
  }
}
