import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const orgId = searchParams.get("organizationId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orgId) where.organizationId = orgId;

  const [seals, total] = await Promise.all([
    prisma.companySeal.findMany({
      where,
      include: {
        organization: { select: { name: true, plan: true } },
        certificate: { select: { serialNumber: true, validTo: true, revoked: true } },
        createdBy: { select: { name: true } },
        _count: { select: { appliedSeals: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.companySeal.count({ where }),
  ]);

  // Stats
  const [totalSeals, activeSeals, totalApplications] = await Promise.all([
    prisma.companySeal.count(),
    prisma.companySeal.count({ where: { status: "ACTIVE" } }),
    prisma.appliedSeal.count(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      seals,
      stats: { totalSeals, activeSeals, totalApplications },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  });
}

// PATCH - Admin actions on seals (revoke, activate, etc.) - SUPER_ADMIN only
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Vetem Super Admin" }, { status: 403 });
  }

  const body = await req.json();
  const { id, action, reason } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updateData: Record<string, unknown> = {};

  switch (action) {
    case "revoke":
      updateData.status = "REVOKED";
      updateData.revokedAt = new Date();
      updateData.revokeReason = reason || "Revoked by admin";
      break;
    case "activate":
      updateData.status = "ACTIVE";
      updateData.activatedAt = new Date();
      break;
    case "deactivate":
      updateData.status = "INACTIVE";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const seal = await prisma.companySeal.update({
    where: { id },
    data: updateData,
    include: { organization: { select: { name: true } } },
  });

  await prisma.auditLog.create({
    data: {
      action: `ADMIN_SEAL_${action.toUpperCase()}`,
      entityType: "CompanySeal",
      entityId: id,
      userId: session.user.id,
      metadata: { sealName: seal.name, organizationName: seal.organization.name, reason },
    },
  });

  return NextResponse.json({ success: true, data: seal });
}
