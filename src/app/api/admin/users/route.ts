import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const kycStatus = searchParams.get("kycStatus") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (kycStatus) where.kycStatus = kycStatus;

  const unassigned = searchParams.get("unassigned");
  const organizationId = searchParams.get("organizationId");
  if (unassigned === "true") where.organizationId = null;
  else if (organizationId) where.organizationId = organizationId;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        kycDocumentUrl: true,
        kycMetadata: true,
        kycVerifiedAt: true,
        totpEnabled: true,
        emailVerified: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
        _count: { select: { documents: true, signatures: true, certificates: true, apiKeys: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Super Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, role, kycStatus, organizationId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (kycStatus) {
    updateData.kycStatus = kycStatus;
    if (kycStatus === "VERIFIED") {
      updateData.kycVerifiedAt = new Date();
    }
  }
  // organizationId: null to remove from org, string to assign
  if (organizationId !== undefined) updateData.organizationId = organizationId;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, kycStatus: true, organizationId: true, organization: { select: { id: true, name: true } } },
  });

  // Audit log for organization assignment changes
  if (organizationId !== undefined) {
    await prisma.auditLog.create({
      data: {
        action: organizationId ? "ADMIN_USER_ASSIGNED_TO_ORG" : "ADMIN_USER_REMOVED_FROM_ORG",
        entityType: "User",
        entityId: userId,
        userId: session.user.id,
        metadata: { userName: user.name, organizationId: organizationId || null, organizationName: user.organization?.name || null },
      },
    });
  }

  // Audit log for KYC status changes (data retention tracking)
  if (kycStatus) {
    await prisma.auditLog.create({
      data: {
        action: `KYC_STATUS_${kycStatus.toUpperCase()}`,
        entityType: "User",
        entityId: userId,
        userId: session.user.id,
        metadata: { userName: user.name, newStatus: kycStatus, reviewedBy: session.user.email },
      },
    });
  }

  return NextResponse.json({ success: true, data: user });
}
