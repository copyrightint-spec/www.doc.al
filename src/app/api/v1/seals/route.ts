import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { applyCompanySeal } from "@/lib/crypto/company-seal";
import { checkQuota, incrementQuota } from "@/lib/quota";

// POST - Apply a seal to a document via API
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  try {
    const body = await req.json();
    const { documentId, sealId, position } = body;

    if (!documentId) return apiError("documentId eshte i detyrueshem", 400);
    if (!sealId) return apiError("sealId eshte i detyrueshem", 400);

    // Verify the seal belongs to the user's organization
    if (!auth.organizationId) {
      return apiError("API key duhet te jete i lidhur me nje organizate", 403);
    }

    const seal = await prisma.companySeal.findFirst({
      where: { id: sealId, organizationId: auth.organizationId },
    });
    if (!seal) return apiError("Vula nuk u gjet ose nuk i perket organizates suaj", 404);

    // Check API quota
    const apiQuota = await checkQuota(auth.organizationId, "apiCalls");
    if (!apiQuota.allowed) return apiError("Kuota e API thirrjeve u tejkalua", 429);
    await incrementQuota(auth.organizationId, "apiCalls");

    const result = await applyCompanySeal({
      documentId,
      sealId,
      userId: auth.userId!,
      position,
    });

    return apiSuccess({
      appliedSealId: result.appliedSealId,
      certificationHash: result.certificationHash,
      verificationUrl: result.verificationUrl,
      timestamp: {
        serverSequence: result.timestampResult.serverSequence,
        otsSubmitted: result.timestampResult.otsSubmitted,
        note: "Bitcoin confirmation typically takes 1-2 hours",
      },
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim ne server";
    const status = message.includes("Kuota") ? 429 : message.includes("nuk u gjet") ? 404 : 500;
    return apiError(message, status);
  }
}

// GET - List seals for the organization
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  if (!auth.organizationId) {
    return apiError("API key duhet te jete i lidhur me nje organizate", 403);
  }

  try {
    const seals = await prisma.companySeal.findMany({
      where: { organizationId: auth.organizationId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        eidasLevel: true,
        etsiPolicy: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(seals);
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
