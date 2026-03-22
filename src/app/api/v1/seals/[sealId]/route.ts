import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/seals/{sealId}
 * Get seal details by ID. Requires API key auth.
 */
export async function GET(
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
      where: { id: sealId, organizationId: auth.organizationId },
      include: {
        certificate: {
          select: {
            serialNumber: true,
            validTo: true,
            revoked: true,
          },
        },
        _count: {
          select: { appliedSeals: true },
        },
      },
    });

    if (!seal) return apiError("Vula nuk u gjet ose nuk i perket organizates suaj", 404);

    return apiSuccess({
      id: seal.id,
      name: seal.name,
      description: seal.description,
      type: seal.type,
      template: seal.template,
      primaryColor: seal.primaryColor,
      secondaryColor: seal.secondaryColor,
      borderText: seal.borderText,
      centerText: seal.centerText,
      eidasLevel: seal.eidasLevel,
      etsiPolicy: seal.etsiPolicy,
      status: seal.status,
      activatedAt: seal.activatedAt,
      expiresAt: seal.expiresAt,
      createdAt: seal.createdAt,
      certificate: seal.certificate
        ? {
            serialNumber: seal.certificate.serialNumber,
            validTo: seal.certificate.validTo,
            revoked: seal.certificate.revoked,
          }
        : null,
      totalApplications: seal._count.appliedSeals,
    });
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
