import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

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

  // Hide PII from non-SUPER_ADMIN
  const sanitizedUsers = users.map(u => {
    if (session.user.role !== "SUPER_ADMIN") {
      return { ...u, kycDocumentUrl: null, kycMetadata: null };
    }
    return u;
  });

  // CSV export
  if (searchParams.get("format") === "csv") {
    const csv = sanitizedUsers.map(u =>
      `${u.createdAt},${u.email},${(u.name || "").replace(/,/g, " ")},${u.role},${u.kycStatus},${u.organization?.name || ""}`
    ).join("\n");
    const header = "Created,Email,Name,Role,KYC Status,Organization\n";
    return new Response(header + csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=users.csv" }
    });
  }

  return NextResponse.json({
    success: true,
    data: { users: sanitizedUsers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
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

  // Reset 2FA action - SUPER_ADMIN only
  if (body.action === "reset-2fa") {
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only SUPER_ADMIN can reset 2FA" }, { status: 403 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false, totpBackupCodes: null },
    });
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_RESET_2FA",
        entityType: "User",
        entityId: userId,
        userId: session.user.id,
        metadata: { targetUserId: userId, reason: "Admin reset" },
      },
    });
    return NextResponse.json({ success: true, message: "2FA reset successfully" });
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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only SUPER_ADMIN can delete users" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Rate limit: 5 per hour per admin user
  const rlKey = `userDelete:${session.user.id}`;
  const rl = checkRateLimit(rlKey, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Keni arritur limitin e fshirjeve. Provoni perseri me vone." },
      { status: 429 }
    );
  }

  // Prevent deleting yourself
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Nuk mund te fshini veten tuaj" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
  }

  // Only SUPER_ADMIN can delete admins
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role) && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Vetem Super Admin mund te fshije administratore" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Delete related records
      await tx.verificationCode.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { userId } });
      // Audit logs are append-only - set userId to null instead of deleting
      await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } });
      await tx.signature.deleteMany({ where: { signerId: userId } });
      await tx.certificate.deleteMany({ where: { userId } });
      await tx.signingTemplate.deleteMany({ where: { userId } });
      await tx.signingRequest.deleteMany({ where: { requesterId: userId } });
      await tx.contractParty.deleteMany({ where: { userId } });
      await tx.appliedSeal.deleteMany({ where: { appliedByUserId: userId } });
      // EmailLog - set userId to null instead of deleting (preserve email audit trail)
      await tx.emailLog.updateMany({ where: { userId }, data: { userId: null } });
      // Contracts - delete contract legal bases first, then contracts
      const contracts = await tx.contract.findMany({ where: { createdById: userId }, select: { id: true } });
      if (contracts.length > 0) {
        const contractIds = contracts.map((c) => c.id);
        await tx.contractLegalBasis.deleteMany({ where: { contractId: { in: contractIds } } });
        await tx.contractParty.deleteMany({ where: { contractId: { in: contractIds } } });
        await tx.contract.deleteMany({ where: { createdById: userId } });
      }
      // Company seals created by user
      await tx.companySeal.deleteMany({ where: { createdByUserId: userId } });
      // Documents - delete associated signatures first
      const docs = await tx.document.findMany({ where: { ownerId: userId }, select: { id: true } });
      if (docs.length > 0) {
        const docIds = docs.map((d) => d.id);
        await tx.signature.deleteMany({ where: { documentId: { in: docIds } } });
        await tx.document.deleteMany({ where: { ownerId: userId } });
      }
      // Account and Session
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    // Audit log (create after transaction since user is deleted)
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_USER_DELETED",
        entityType: "User",
        entityId: userId,
        userId: session.user.id,
        metadata: {
          deletedUserEmail: user.email,
          deletedUserName: user.name,
          deletedBy: session.user.email || session.user.id,
        },
      },
    });

    return NextResponse.json({ success: true, message: `Perdoruesi ${user.email} u fshi me sukses` });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Gabim gjate fshirjes se perdoruesit" }, { status: 500 });
  }
}
