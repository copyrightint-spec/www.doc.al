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
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};

  if (search) {
    const seqNum = parseInt(search);
    where.OR = [
      { fingerprint: { contains: search, mode: "insensitive" } },
      { sequentialFingerprint: { contains: search, mode: "insensitive" } },
      { btcTxId: { contains: search, mode: "insensitive" } },
      ...(Number.isInteger(seqNum) ? [{ sequenceNumber: seqNum }] : []),
    ];
  }

  if (type) where.type = type;
  if (status) where.otsStatus = status;

  const [entries, total, statusCounts, typeCounts] = await Promise.all([
    prisma.timestampEntry.findMany({
      where,
      orderBy: { sequenceNumber: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sequenceNumber: true,
        fingerprint: true,
        sequentialFingerprint: true,
        type: true,
        serverTimestamp: true,
        btcTxId: true,
        btcBlockHeight: true,
        btcBlockHash: true,
        otsStatus: true,
        createdAt: true,
        documentId: true,
        signatureId: true,
        previousEntryId: true,
        document: {
          select: {
            id: true,
            title: true,
            owner: { select: { name: true } },
          },
        },
        signature: {
          select: {
            id: true,
            signerEmail: true,
            signerName: true,
          },
        },
        previousEntry: {
          select: { sequenceNumber: true },
        },
        nextEntry: {
          select: { sequenceNumber: true },
        },
      },
    }),
    prisma.timestampEntry.count({ where }),
    prisma.timestampEntry.groupBy({
      by: ["otsStatus"],
      _count: { otsStatus: true },
    }),
    prisma.timestampEntry.groupBy({
      by: ["type"],
      _count: { type: true },
    }),
  ]);

  const stats = {
    total: 0,
    confirmed: 0,
    pending: 0,
  };
  for (const entry of statusCounts) {
    stats.total += entry._count.otsStatus;
    if (entry.otsStatus === "CONFIRMED") stats.confirmed = entry._count.otsStatus;
    if (entry.otsStatus === "PENDING") stats.pending = entry._count.otsStatus;
  }

  const typeBreakdown: Record<string, number> = {};
  for (const entry of typeCounts) {
    typeBreakdown[entry.type] = entry._count.type;
  }

  return NextResponse.json({
    success: true,
    data: {
      entries,
      stats: { ...stats, typeBreakdown },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}
