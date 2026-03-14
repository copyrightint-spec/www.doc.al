import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSigningInvitation } from "@/lib/email";
import crypto from "crypto";

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id: contractId } = await params;

    // Load contract with parties
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, createdById: session.user.id, status: "DRAFT" },
      include: {
        parties: { orderBy: { partyNumber: "asc" } },
        organization: { select: { name: true, logo: true, primaryColor: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Kontrata nuk u gjet ose nuk eshte ne status DRAFT" }, { status: 404 });
    }

    if (contract.parties.length < 2) {
      return NextResponse.json({ error: "Nevojiten te pakten 2 pale" }, { status: 400 });
    }

    // Generate document hash from contract content
    const contentHash = crypto
      .createHash("sha256")
      .update(contract.termsHtml + contract.contractNumber)
      .digest("hex");

    // Create a Document record for the signing system
    const document = await prisma.document.create({
      data: {
        title: `${contract.title} (${contract.contractNumber})`,
        fileName: `${contract.contractNumber}.pdf`,
        fileHash: contentHash,
        fileUrl: "", // Will be generated client-side
        fileSize: 0,
        status: "PENDING_SIGNATURE",
        ownerId: session.user.id,
        organizationId: contract.organizationId || undefined,
      },
    });

    // Create signing request linked to the contract
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const signingRequest = await prisma.signingRequest.create({
      data: {
        documentId: document.id,
        requesterId: session.user.id,
        contractId: contract.id,
        recipientEmails: contract.parties.map((p) => p.email),
        companyName: contract.organization?.name,
        companyLogo: contract.organization?.logo,
        brandColor: contract.organization?.primaryColor || "#0f172a",
        expiresAt,
      },
    });

    // Create signature entries for each party
    const signatures = await Promise.all(
      contract.parties.map((party) =>
        prisma.signature.create({
          data: {
            documentId: document.id,
            signerEmail: party.email,
            signerName: party.fullName,
            order: party.partyNumber - 1,
            token: generateSecureToken(),
          },
        }),
      ),
    );

    // Update contract status
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "PENDING_SIGNATURE",
        documentHash: contentHash,
      },
    });

    // Send invitation emails with full contract details
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.doc.al";
    const contractDetails = {
      contractNumber: contract.contractNumber,
      contractTitle: contract.title,
      parties: contract.parties.map((p) => ({
        fullName: p.fullName,
        role: p.role,
        partyNumber: p.partyNumber,
      })),
      creatorName: session.user.name,
      creatorEmail: session.user.email || undefined,
    };

    for (const sig of signatures) {
      const party = contract.parties.find((p) => p.email === sig.signerEmail);
      await sendSigningInvitation(
        sig.signerEmail,
        sig.signerName,
        `${contract.title} (${contract.contractNumber})`,
        `${baseUrl}/sign/${sig.token}`,
        session.user.name,
        {
          companyName: contract.organization?.name || undefined,
          companyLogo: contract.organization?.logo || undefined,
          brandColor: contract.organization?.primaryColor || "#0f172a",
          message: party
            ? `Ju jeni ftuar si ${party.role} (Pala ${party.partyNumber}) per te nenshkruar kontraten "${contract.title}".`
            : undefined,
          expiresAt,
          contract: contractDetails,
        },
      );
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "CONTRACT_SENT_FOR_SIGNING",
        entityType: "Contract",
        entityId: contractId,
        userId: session.user.id,
        metadata: {
          contractNumber: contract.contractNumber,
          signingRequestId: signingRequest.id,
          partyCount: contract.parties.length,
          partyEmails: contract.parties.map((p) => p.email),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        signingRequestId: signingRequest.id,
        contractNumber: contract.contractNumber,
        signatureCount: signatures.length,
      },
    });
  } catch (error) {
    console.error("Contract send error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
