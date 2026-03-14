import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCompanySeal } from "@/lib/crypto/company-seal";

// GET - List seals for user's organization
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (!user?.organizationId) {
    return NextResponse.json({ error: "Nuk jeni pjese e nje organizate" }, { status: 403 });
  }

  const seals = await prisma.companySeal.findMany({
    where: { organizationId: user.organizationId },
    include: {
      certificate: { select: { serialNumber: true, validTo: true, revoked: true } },
      createdBy: { select: { name: true } },
      _count: { select: { appliedSeals: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get usage stats
  const appliedCount = await prisma.appliedSeal.count({
    where: { seal: { organizationId: user.organizationId } },
  });

  return NextResponse.json({
    success: true,
    data: {
      seals,
      stats: {
        totalSeals: seals.length,
        activeSeals: seals.filter(s => s.status === "ACTIVE").length,
        totalApplications: appliedCount,
      },
    },
  });
}

// POST - Create a new seal
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true, role: true },
  });

  if (!user?.organizationId) {
    return NextResponse.json({ error: "Nuk jeni pjese e nje organizate" }, { status: 403 });
  }

  // Check seal template limit
  const [currentSealCount, org] = await Promise.all([
    prisma.companySeal.count({ where: { organizationId: user.organizationId } }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { plan: true, customQuotas: true },
    }),
  ]);

  // Get template limit from active quota or plan defaults
  const activeQuota = await prisma.planQuota.findFirst({
    where: { organizationId: user.organizationId, periodEnd: { gt: new Date() } },
    orderBy: { periodStart: "desc" },
    select: { maxSealTemplates: true },
  });

  const { PLANS } = await import("@/lib/constants/plans");
  const planDef = PLANS[org?.plan || "FREE"];
  const customQuotas = org?.customQuotas as Record<string, number> | null;
  const maxTemplates = activeQuota?.maxSealTemplates ?? customQuotas?.maxSealTemplates ?? planDef?.quotas.maxSealTemplates ?? 0;

  if (maxTemplates <= 0) {
    return NextResponse.json({ error: "Plani juaj nuk perfshin vula dixhitale. Kontaktoni administratorin." }, { status: 403 });
  }

  if (currentSealCount >= maxTemplates) {
    return NextResponse.json({
      error: `Keni arritur limitin e vulave (${currentSealCount}/${maxTemplates}). Kontaktoni administratorin per te rritur kuoten.`,
    }, { status: 403 });
  }

  try {
    const body = await req.json();
    const seal = await createCompanySeal({
      organizationId: user.organizationId,
      userId: session.user.id,
      name: body.name,
      description: body.description,
      type: body.type,
      template: body.template,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
      borderText: body.borderText,
      centerText: body.centerText,
      logoUrl: body.logoUrl,
      eidasLevel: body.eidasLevel,
      generateCertificate: body.generateCertificate ?? true,
      validityYears: body.validityYears,
    });

    return NextResponse.json({ success: true, data: seal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim ne server";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
