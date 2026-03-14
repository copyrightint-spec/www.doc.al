import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/constants/plans";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const plan = searchParams.get("plan") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { domain: { contains: search, mode: "insensitive" } },
    ];
  }
  if (plan) where.plan = plan;

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            users: true,
            documents: true,
            certificates: true,
            apiKeys: true,
            signingTemplates: true,
            companySeals: true,
          },
        },
        users: {
          select: { id: true, name: true, email: true, role: true, kycStatus: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        companySeals: {
          select: { id: true, name: true, type: true, status: true, eidasLevel: true, createdAt: true, _count: { select: { appliedSeals: true } } },
          orderBy: { createdAt: "desc" },
        },
        planQuotas: {
          where: { periodEnd: { gt: new Date() } },
          orderBy: { periodStart: "desc" },
          take: 1,
        },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  // Plan distribution stats
  const [freeCount, proCount, enterpriseCount] = await Promise.all([
    prisma.organization.count({ where: { plan: "FREE" } }),
    prisma.organization.count({ where: { plan: "PRO" } }),
    prisma.organization.count({ where: { plan: "ENTERPRISE" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      organizations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      planStats: { FREE: freeCount, PRO: proCount, ENTERPRISE: enterpriseCount },
      planDefinitions: PLANS,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Super Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { organizationId, name, plan, apiQuota, webhookUrl, primaryColor, emailFromName, billingCycle, customQuotas, planExpiresAt, verifiedAt } = body;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (plan !== undefined && ["FREE", "PRO", "ENTERPRISE"].includes(plan)) updateData.plan = plan;
  if (apiQuota !== undefined) updateData.apiQuota = parseInt(apiQuota);
  if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;
  if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
  if (emailFromName !== undefined) updateData.emailFromName = emailFromName;
  if (billingCycle !== undefined && ["MONTHLY", "YEARLY"].includes(billingCycle)) updateData.billingCycle = billingCycle;
  if (customQuotas !== undefined) updateData.customQuotas = customQuotas;
  if (planExpiresAt !== undefined) updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
  if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt ? new Date() : null;

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  // If plan changed, create/update quota record for current period
  if (plan) {
    const planDef = PLANS[plan];
    if (planDef) {
      const now = new Date();
      const cycle = (billingCycle || organization.billingCycle || "MONTHLY") as string;
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = cycle === "YEARLY"
        ? new Date(now.getFullYear() + 1, 0, 1)
        : new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const custom = (customQuotas || organization.customQuotas) as Record<string, number> | null;

      await prisma.planQuota.upsert({
        where: {
          organizationId_periodStart_periodEnd: {
            organizationId,
            periodStart,
            periodEnd,
          },
        },
        update: {
          maxTimestamps: custom?.maxTimestamps ?? planDef.quotas.maxTimestamps,
          maxSignatures: custom?.maxSignatures ?? planDef.quotas.maxSignatures,
          maxSeals: custom?.maxSeals ?? planDef.quotas.maxSeals,
          maxSealTemplates: custom?.maxSealTemplates ?? planDef.quotas.maxSealTemplates,
          maxApiCalls: custom?.maxApiCalls ?? planDef.quotas.maxApiCalls,
          maxDocuments: custom?.maxDocuments ?? planDef.quotas.maxDocuments,
          maxUsers: custom?.maxUsers ?? planDef.quotas.maxUsers,
          billingCycle: cycle,
        },
        create: {
          organizationId,
          periodStart,
          periodEnd,
          billingCycle: cycle,
          maxTimestamps: custom?.maxTimestamps ?? planDef.quotas.maxTimestamps,
          maxSignatures: custom?.maxSignatures ?? planDef.quotas.maxSignatures,
          maxSeals: custom?.maxSeals ?? planDef.quotas.maxSeals,
          maxSealTemplates: custom?.maxSealTemplates ?? planDef.quotas.maxSealTemplates,
          maxApiCalls: custom?.maxApiCalls ?? planDef.quotas.maxApiCalls,
          maxDocuments: custom?.maxDocuments ?? planDef.quotas.maxDocuments,
          maxUsers: custom?.maxUsers ?? planDef.quotas.maxUsers,
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "ADMIN_ORGANIZATION_UPDATED",
      entityType: "Organization",
      entityId: organizationId,
      userId: session.user.id,
      metadata: { changes: Object.keys(updateData), organizationName: organization.name },
    },
  });

  return NextResponse.json({ success: true, data: organization });
}

// POST - Create new organization - SUPER_ADMIN only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Vetem Super Admin" }, { status: 403 });
  }

  const body = await req.json();
  const { name, domain, plan, billingCycle } = body;

  if (!name) {
    return NextResponse.json({ error: "Emri eshte i detyrueshem" }, { status: 400 });
  }

  const org = await prisma.organization.create({
    data: {
      name,
      domain: domain || null,
      plan: plan || "FREE",
      billingCycle: billingCycle || "MONTHLY",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "ADMIN_ORGANIZATION_CREATED",
      entityType: "Organization",
      entityId: org.id,
      userId: session.user.id,
      metadata: { organizationName: org.name, plan: org.plan },
    },
  });

  return NextResponse.json({ success: true, data: org }, { status: 201 });
}
