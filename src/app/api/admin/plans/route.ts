import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/constants/plans";

// GET - Get all organizations with their plan and quota info
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const plan = searchParams.get("plan") || "";

  const where: Record<string, unknown> = {};
  if (plan) where.plan = plan;

  const organizations = await prisma.organization.findMany({
    where,
    include: {
      _count: { select: { users: true, documents: true, certificates: true, companySeals: true } },
      planQuotas: {
        where: { periodEnd: { gt: new Date() } },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Plan distribution stats
  const planStats = {
    FREE: await prisma.organization.count({ where: { plan: "FREE" } }),
    PRO: await prisma.organization.count({ where: { plan: "PRO" } }),
    ENTERPRISE: await prisma.organization.count({ where: { plan: "ENTERPRISE" } }),
  };

  return NextResponse.json({
    success: true,
    data: {
      organizations,
      planStats,
      planDefinitions: PLANS,
    },
  });
}

// PATCH - Update organization plan or quotas - SUPER_ADMIN only
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Vetem Super Admin" }, { status: 403 });
  }

  const body = await req.json();
  const { organizationId, plan, billingCycle, customQuotas, planExpiresAt } = body;

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (plan && ["FREE", "PRO", "ENTERPRISE"].includes(plan)) updateData.plan = plan;
  if (billingCycle && ["MONTHLY", "YEARLY"].includes(billingCycle)) updateData.billingCycle = billingCycle;
  if (customQuotas) updateData.customQuotas = customQuotas;
  if (planExpiresAt) updateData.planExpiresAt = new Date(planExpiresAt);

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: "ADMIN_PLAN_UPDATED",
      entityType: "Organization",
      entityId: organizationId,
      userId: session.user.id,
      metadata: { changes: Object.keys(updateData), organizationName: org.name },
    },
  });

  return NextResponse.json({ success: true, data: org });
}
