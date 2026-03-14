import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Generate contract number: DOCAL-YYYY-NNNNN */
async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DOCAL-${year}-`;

  // Find the highest number this year
  const latest = await prisma.contract.findFirst({
    where: { contractNumber: { startsWith: prefix } },
    orderBy: { contractNumber: "desc" },
    select: { contractNumber: true },
  });

  let nextNum = 1;
  if (latest) {
    const numPart = latest.contractNumber.replace(prefix, "");
    nextNum = parseInt(numPart, 10) + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const body = await req.json();
    const { title, parties, legalBasisIds, termsHtml } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Titulli eshte i detyrueshem" }, { status: 400 });
    }
    if (!parties || parties.length < 2) {
      return NextResponse.json({ error: "Nevojiten te pakten 2 pale" }, { status: 400 });
    }
    if (!termsHtml?.trim()) {
      return NextResponse.json({ error: "Termat jane te detyrueshem" }, { status: 400 });
    }

    const contractNumber = await generateContractNumber();

    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        title,
        termsHtml,
        createdById: session.user.id,
        organizationId: session.user.organizationId || undefined,
        parties: {
          create: parties.map(
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
        },
        legalBases: legalBasisIds?.length
          ? {
              create: legalBasisIds.map((lbId: string) => ({
                legalBasisId: lbId,
              })),
            }
          : undefined,
      },
      include: {
        parties: true,
        legalBases: { include: { legalBasis: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CONTRACT_CREATED",
        entityType: "Contract",
        entityId: contract.id,
        userId: session.user.id,
        metadata: {
          contractNumber,
          title,
          partyCount: parties.length,
        },
      },
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error) {
    console.error("Contract creation error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
