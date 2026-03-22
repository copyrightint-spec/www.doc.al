import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  lawReference: z.string().max(500).optional(),
  suggestedTerms: z.string().max(5000).optional(),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

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

    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 100);

    const [legalBases, total] = await Promise.all([
      prisma.legalBasis.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.legalBasis.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { legalBases, total, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshem" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Te dhena te pavlefshme", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, lawReference, description, suggestedTerms, category, sortOrder } = parsed.data;

  const legalBasis = await prisma.legalBasis.create({
    data: {
      title,
      lawReference: lawReference || "",
      description: description || "",
      suggestedTerms: suggestedTerms || "",
      category: category || "general",
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ success: true, data: legalBasis }, { status: 201 });
}
