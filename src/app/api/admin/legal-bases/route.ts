import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get("search") || "";
    const category = req.nextUrl.searchParams.get("category") || "";

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { lawReference: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(category && { category }),
    };

    const [legalBases, total] = await Promise.all([
      prisma.legalBasis.findMany({
        where,
        orderBy: { sortOrder: "asc" },
      }),
      prisma.legalBasis.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { legalBases, total },
    });
  } catch (error) {
    console.error("[admin/legal-bases] GET error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { title, lawReference, description, suggestedTerms, category, sortOrder } = body;

  if (!title || !lawReference || !description || !suggestedTerms) {
    return NextResponse.json(
      { error: "Title, law reference, description, and suggested terms are required" },
      { status: 400 }
    );
  }

  const legalBasis = await prisma.legalBasis.create({
    data: {
      title,
      lawReference,
      description,
      suggestedTerms,
      category: category || "general",
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ success: true, data: legalBasis }, { status: 201 });
}
