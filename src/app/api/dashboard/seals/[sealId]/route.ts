import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Get seal details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;

  const seal = await prisma.companySeal.findUnique({
    where: { id: sealId },
    include: {
      organization: { select: { name: true, domain: true } },
      certificate: { select: { serialNumber: true, subjectDN: true, validFrom: true, validTo: true, revoked: true } },
      createdBy: { select: { name: true, email: true } },
      appliedSeals: {
        include: {
          document: { select: { id: true, title: true } },
          appliedBy: { select: { name: true } },
          timestampEntry: { select: { sequenceNumber: true, otsStatus: true, btcBlockHeight: true } },
        },
        orderBy: { appliedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!seal) {
    return NextResponse.json({ error: "Vula nuk u gjet" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: seal });
}

// PATCH - Update seal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;
  const body = await req.json();

  const seal = await prisma.companySeal.findUnique({ where: { id: sealId } });
  if (!seal) {
    return NextResponse.json({ error: "Vula nuk u gjet" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.primaryColor) updateData.primaryColor = body.primaryColor;
  if (body.secondaryColor) updateData.secondaryColor = body.secondaryColor;
  if (body.borderText) updateData.borderText = body.borderText;
  if (body.centerText) updateData.centerText = body.centerText;
  if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
  if (body.status && ["ACTIVE", "INACTIVE"].includes(body.status)) {
    updateData.status = body.status;
    if (body.status === "ACTIVE") updateData.activatedAt = new Date();
  }

  const updated = await prisma.companySeal.update({
    where: { id: sealId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      action: "COMPANY_SEAL_UPDATED",
      entityType: "CompanySeal",
      entityId: sealId,
      userId: session.user.id,
      metadata: { changes: Object.keys(updateData) },
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE - Revoke seal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;
  const body = await req.json().catch(() => ({}));

  const seal = await prisma.companySeal.update({
    where: { id: sealId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokeReason: body.reason || "Revoked by user",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "COMPANY_SEAL_REVOKED",
      entityType: "CompanySeal",
      entityId: sealId,
      userId: session.user.id,
      metadata: { reason: body.reason, sealName: seal.name },
    },
  });

  return NextResponse.json({ success: true, data: seal });
}
