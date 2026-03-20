import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const where: Record<string, unknown> = {
      OR: [
        { signerId: session.user.id },
        { signerEmail: session.user.email },
      ],
    };
    if (status) where.status = status;

    const [signatures, total] = await Promise.all([
      prisma.signature.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          document: { select: { id: true, title: true, fileName: true, status: true } },
          certificate: { select: { id: true, serialNumber: true, subjectDN: true } },
        },
      }),
      prisma.signature.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: signatures,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
