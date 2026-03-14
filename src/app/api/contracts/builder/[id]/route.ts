import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: { id, createdById: session.user.id },
      include: {
        parties: { orderBy: { partyNumber: "asc" } },
        legalBases: { include: { legalBasis: true } },
        createdBy: { select: { name: true, email: true } },
        organization: { select: { name: true, logo: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Kontrata nuk u gjet" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: contract });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contract.findFirst({
      where: { id, createdById: session.user.id, status: "DRAFT" },
    });

    if (!existing) {
      return NextResponse.json({ error: "Kontrata nuk u gjet ose nuk mund te ndryshohet" }, { status: 404 });
    }

    const { title, termsHtml, parties, legalBasisIds } = body;

    // Update contract
    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(termsHtml !== undefined && { termsHtml }),
      },
    });

    // Update parties if provided
    if (parties) {
      await prisma.contractParty.deleteMany({ where: { contractId: id } });
      await prisma.contractParty.createMany({
        data: parties.map(
          (p: {
            partyNumber: number;
            role: string;
            fullName: string;
            idNumber: string;
            address: string;
            phone: string;
            email: string;
            userId?: string;
          }) => ({
            contractId: id,
            partyNumber: p.partyNumber,
            role: p.role,
            fullName: p.fullName,
            idNumber: p.idNumber || "",
            address: p.address || "",
            phone: p.phone || "",
            email: p.email,
            userId: p.userId || undefined,
          }),
        ),
      });
    }

    // Update legal bases if provided
    if (legalBasisIds) {
      await prisma.contractLegalBasis.deleteMany({ where: { contractId: id } });
      if (legalBasisIds.length > 0) {
        await prisma.contractLegalBasis.createMany({
          data: legalBasisIds.map((lbId: string) => ({
            contractId: id,
            legalBasisId: lbId,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: contract });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
