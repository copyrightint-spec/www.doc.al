import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (type && ["SINGLE_FILE", "SUBMITTED_HASH", "SIGNATURE"].includes(type)) {
      where.type = type;
    }

    if (search && /^[a-f0-9]+$/i.test(search)) {
      where.fingerprint = { contains: search.toLowerCase() };
    }

    const [entries, total] = await Promise.all([
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
          otsStatus: true,
        },
      }),
      prisma.timestampEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
