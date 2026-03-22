import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";

  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [contacts, total] = await Promise.all([
    prisma.contactRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactRequest.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { contacts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Validate status enum
  const VALID_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Statusi i pavlefshem. Duhet te jete nje nga: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const contact = await prisma.contactRequest.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: contact });
}
