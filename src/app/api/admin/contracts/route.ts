import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    // Admin only
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Akses i ndaluar" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { document: { title: { contains: search, mode: "insensitive" } } },
        { requester: { name: { contains: search, mode: "insensitive" } } },
        { requester: { email: { contains: search, mode: "insensitive" } } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [contracts, total] = await Promise.all([
      prisma.signingRequest.findMany({
        where,
        include: {
          document: {
            include: {
              signatures: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  signerName: true,
                  signerEmail: true,
                  status: true,
                  signedAt: true,
                  order: true,
                  viewedAt: true,
                  verificationSentAt: true,
                },
              },
              owner: { select: { id: true, name: true, email: true } },
            },
          },
          template: {
            select: { id: true, name: true, category: true },
          },
          requester: {
            select: { id: true, name: true, email: true, organization: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.signingRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        contracts,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
