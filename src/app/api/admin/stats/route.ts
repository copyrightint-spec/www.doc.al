import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    totalUsers,
    totalDocuments,
    totalSignatures,
    totalTimestamps,
    totalOrganizations,
    totalCertificates,
    pendingKyc,
    confirmedBtc,
    recentUsers,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.signature.count(),
    prisma.timestampEntry.count(),
    prisma.organization.count(),
    prisma.certificate.count(),
    prisma.user.count({ where: { kycStatus: "PENDING" } }),
    prisma.timestampEntry.count({ where: { otsStatus: "CONFIRMED" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        createdAt: true,
        organization: { select: { name: true } },
        _count: { select: { documents: true, signatures: true } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalDocuments,
        totalSignatures,
        totalTimestamps,
        totalOrganizations,
        totalCertificates,
        pendingKyc,
        confirmedBtc,
      },
      recentUsers,
      recentAuditLogs,
    },
  });
}
