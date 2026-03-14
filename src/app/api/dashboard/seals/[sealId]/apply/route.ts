import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyCompanySeal } from "@/lib/crypto/company-seal";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;

  try {
    const body = await req.json();
    const { documentId, position } = body;

    if (!documentId) {
      return NextResponse.json({ error: "documentId eshte i detyrueshem" }, { status: 400 });
    }

    // Verify user has access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    const seal = await prisma.companySeal.findFirst({
      where: { id: sealId, organizationId: user?.organizationId || "" },
    });

    if (!seal) {
      return NextResponse.json({ error: "Vula nuk u gjet" }, { status: 404 });
    }

    const result = await applyCompanySeal({
      documentId,
      sealId,
      userId: session.user.id,
      position,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gabim ne server";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
