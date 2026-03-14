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
  const status = searchParams.get("status") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
      { owner: { email: { contains: search, mode: "insensitive" } } },
      { owner: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (status) where.status = status;

  const [documents, total, statusCounts] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        fileName: true,
        fileHash: true,
        fileSize: true,
        status: true,
        createdAt: true,
        deletedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        _count: { select: { signatures: true, timestampEntries: true, signingRequests: true } },
      },
    }),
    prisma.document.count({ where }),
    prisma.document.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const entry of statusCounts) {
    counts[entry.status] = entry._count.status;
  }

  return NextResponse.json({
    success: true,
    data: {
      documents,
      counts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}
