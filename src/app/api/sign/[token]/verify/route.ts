import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode } from "@/lib/email";
import { createTimestamp } from "@/lib/timestamp/engine";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: { document: true },
    });

    if (!signature) {
      return NextResponse.json({ error: "Link i pavlefshem" }, { status: 404 });
    }

    if (signature.status === "SIGNED") {
      return NextResponse.json({ error: "Dokumenti eshte nenshkruar tashme" }, { status: 400 });
    }

    if (body.action === "send-otp") {
      const code = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Find or create a temporary user for this signer
      let user = await prisma.user.findUnique({
        where: { email: signature.signerEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: signature.signerEmail,
            name: signature.signerName,
          },
        });
      }

      await prisma.verificationCode.create({
        data: {
          userId: user.id,
          code,
          type: "EMAIL",
          expiresAt,
        },
      });

      await sendVerificationCode(signature.signerEmail, code);

      return NextResponse.json({ message: "Kodi u dergua" });
    }

    if (body.action === "verify-and-sign") {
      const { code, signatureImage } = body;

      // Verify OTP
      let user = await prisma.user.findUnique({
        where: { email: signature.signerEmail },
      });

      if (!user) {
        return NextResponse.json({ error: "Gabim ne verifikim" }, { status: 400 });
      }

      const verification = await prisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code,
          type: "EMAIL",
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        return NextResponse.json({ error: "Kodi i pavlefshem ose i skaduar" }, { status: 400 });
      }

      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { used: true },
      });

      // Update signature
      await prisma.signature.update({
        where: { id: signature.id },
        data: {
          status: "SIGNED",
          signedAt: new Date(),
          signatureImageUrl: signatureImage ? `data:image/png;base64,${signatureImage}` : null,
          signerId: user.id,
        },
      });

      // Create timestamp entry for this signature
      const signatureHash = crypto
        .createHash("sha256")
        .update(`${signature.document.fileHash}:${signature.signerEmail}:${new Date().toISOString()}`)
        .digest("hex");

      await createTimestamp(signatureHash, "SIGNATURE", {
        documentId: signature.documentId,
        signatureId: signature.id,
      });

      // Check if all signatures are complete
      const pendingSignatures = await prisma.signature.count({
        where: {
          documentId: signature.documentId,
          status: { not: "SIGNED" },
          id: { not: signature.id },
        },
      });

      if (pendingSignatures === 0) {
        await prisma.document.update({
          where: { id: signature.documentId },
          data: { status: "COMPLETED" },
        });

        // If linked to a contract, update contract status and set effective date
        const signingRequest = await prisma.signingRequest.findFirst({
          where: { documentId: signature.documentId, contractId: { not: null } },
          select: { contractId: true },
        });
        if (signingRequest?.contractId) {
          await prisma.contract.update({
            where: { id: signingRequest.contractId },
            data: {
              status: "COMPLETED",
              effectiveAt: new Date(),
            },
          });
        }
      } else {
        await prisma.document.update({
          where: { id: signature.documentId },
          data: { status: "PARTIALLY_SIGNED" },
        });

        // If linked to a contract, update to PARTIALLY_SIGNED
        const signingRequest = await prisma.signingRequest.findFirst({
          where: { documentId: signature.documentId, contractId: { not: null } },
          select: { contractId: true },
        });
        if (signingRequest?.contractId) {
          await prisma.contract.update({
            where: { id: signingRequest.contractId },
            data: { status: "PARTIALLY_SIGNED" },
          });
        }
      }

      // Update ContractParty.signedAt if linked to a contract
      const linkedRequest = await prisma.signingRequest.findFirst({
        where: { documentId: signature.documentId, contractId: { not: null } },
        select: { contractId: true },
      });
      if (linkedRequest?.contractId) {
        await prisma.contractParty.updateMany({
          where: {
            contractId: linkedRequest.contractId,
            email: { equals: signature.signerEmail, mode: "insensitive" },
            signedAt: null,
          },
          data: { signedAt: new Date() },
        });
      }

      // Log eIDAS consent acceptance
      await prisma.auditLog.create({
        data: {
          action: "EIDAS_CONSENT_ACCEPTED",
          entityType: "Signature",
          entityId: signature.id,
          userId: user.id,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
          metadata: {
            documentId: signature.documentId,
            signerEmail: signature.signerEmail,
            consentText: "Pranoj kushtet e nenshkrimit elektronik sipas Rregullores eIDAS (BE Nr. 910/2014)",
            timestamp: new Date().toISOString(),
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "DOCUMENT_SIGNED",
          entityType: "Signature",
          entityId: signature.id,
          userId: user.id,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          userAgent: req.headers.get("user-agent"),
          metadata: { documentId: signature.documentId, signerEmail: signature.signerEmail },
        },
      });

      return NextResponse.json({ success: true, message: "Dokumenti u nenshkrua me sukses" });
    }

    return NextResponse.json({ error: "Veprim i pavlefshem" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
