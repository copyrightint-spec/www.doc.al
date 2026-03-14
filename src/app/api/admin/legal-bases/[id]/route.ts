import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const legalBasis = await prisma.legalBasis.findUnique({ where: { id } });

  if (!legalBasis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: legalBasis });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, lawReference, description, suggestedTerms, category, sortOrder, isActive } = body;

  const legalBasis = await prisma.legalBasis.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(lawReference !== undefined && { lawReference }),
      ...(description !== undefined && { description }),
      ...(suggestedTerms !== undefined && { suggestedTerms }),
      ...(category !== undefined && { category }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json({ success: true, data: legalBasis });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  // Check if used in any contracts
  const usageCount = await prisma.contractLegalBasis.count({
    where: { legalBasisId: id },
  });

  if (usageCount > 0) {
    return NextResponse.json(
      { error: `Kjo baze ligjore perdoret ne ${usageCount} kontrata. Caktivizojeni ne vend te fshirjes.` },
      { status: 400 }
    );
  }

  await prisma.legalBasis.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
