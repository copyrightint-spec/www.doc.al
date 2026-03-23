import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendVerificationCode, sendSigningCompleted, sendSignedDocument } from "@/lib/email";
import { getFileBuffer, uploadFile, deleteFile } from "@/lib/s3";
import { computeSHA256, createTimestamp } from "@/lib/timestamp/engine";
import { rateLimit } from "@/lib/rate-limit";
import { buildProofMetadata, publishToIPFS } from "@/lib/ipfs";
import { submitToStamles } from "@/lib/stamles";
import { signPdf } from "@/lib/crypto/pdf-signer";
import { generateUserCertificate } from "@/lib/crypto/certificates";
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
      // Rate limit OTP sending: 3 per 10 minutes per IP
      const otpSendLimit = rateLimit(req, "otpSend");
      if (otpSendLimit) return otpSendLimit;

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
      // Rate limit OTP verification: 5 attempts per 5 minutes per IP
      const otpVerifyLimit = rateLimit(req, "otpVerify");
      if (otpVerifyLimit) return otpVerifyLimit;

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

      // Check if signer has TOTP enabled and verify 2FA code
      // Do this BEFORE marking OTP as used, so OTP stays valid if TOTP is missing
      if (user) {
        const signerUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { totpEnabled: true, totpSecret: true },
        });

        if (signerUser?.totpEnabled && signerUser.totpSecret) {
          const totpCode = body.totpCode;
          if (!totpCode) {
            // TOTP required but not provided - don't consume OTP, let frontend show TOTP step
            return NextResponse.json(
              { error: "Kodi 2FA eshte i detyrueshem per nenshkrim", requireTotp: true },
              { status: 400 }
            );
          }

          const { verifyTotp } = await import("@/lib/totp");
          const isValid = verifyTotp(signerUser.totpSecret, totpCode);
          if (!isValid) {
            return NextResponse.json(
              { error: "Kodi 2FA nuk eshte i sakte", requireTotp: true },
              { status: 400 }
            );
          }
        }
      }

      // Mark OTP as used only after all verification passes
      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { used: true },
      });

      // Check signing order - reject if previous signers haven't signed
      const previousUnsigned = await prisma.signature.count({
        where: {
          documentId: signature.documentId,
          order: { lt: signature.order },
          status: { not: "SIGNED" },
        },
      });
      if (previousUnsigned > 0) {
        return NextResponse.json(
          { error: "Nenshkruesit e meparshem nuk kane nenshkruar akoma. Prisni rradhen tuaj." },
          { status: 400 }
        );
      }

      // Update signature
      const signedAt = new Date();
      await prisma.signature.update({
        where: { id: signature.id },
        data: {
          status: "SIGNED",
          signedAt,
          signatureImageUrl: signatureImage ? `data:image/png;base64,${signatureImage}` : null,
          signerId: user.id,
        },
      });

      // Create timestamp entry for this signature
      // Use fixed signedAt timestamp for reproducible hash
      const signatureHash = crypto
        .createHash("sha256")
        .update(`${signature.document.fileHash}:${signature.signerEmail}:${signedAt.toISOString()}`)
        .digest("hex");

      const timestampEntry = await createTimestamp(signatureHash, "SIGNATURE", {
        documentId: signature.documentId,
        signatureId: signature.id,
      });

      // IPFS proof will be published automatically by check-stamles cron
      // after Polygon blockchain confirmation (ensures complete proof with TX data)

      // Submit to STAMLES (Polygon blockchain)
      try {
        await submitToStamles(signature.document.fileHash, signature.documentId, "signature");
      } catch (stamlesErr) {
        console.error("[sign] STAMLES submit failed (non-critical):", stamlesErr);
      }

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

        // Send completion email + signed PDF to all signers
        try {
          const allSignatures = await prisma.signature.findMany({
            where: { documentId: signature.documentId, status: "SIGNED" },
            select: { signerEmail: true, signerName: true },
          });
          const baseUrl = process.env.NEXTAUTH_URL || "https://doc.al";

          // 1. Get original PDF from S3
          let pdfBuffer: Buffer | null = null;
          try {
            pdfBuffer = await getFileBuffer(signature.document.fileUrl);
          } catch {
            console.error("[sign] Failed to fetch PDF for email attachment");
          }

          // 2. Apply doc.al visual stamp + PAdES digital signature
          let finalDocHash = signature.document.fileHash;
          if (pdfBuffer) {
            // Find the document owner's certificate (or generate one)
            let ownerCert = await prisma.certificate.findFirst({
              where: {
                userId: signature.document.ownerId,
                revoked: false,
                validTo: { gt: new Date() },
                type: "PERSONAL",
              },
              orderBy: { createdAt: "desc" },
            });

            if (!ownerCert) {
              // Generate a certificate for the document owner
              try {
                const owner = await prisma.user.findUnique({
                  where: { id: signature.document.ownerId },
                  select: { name: true, email: true, organization: { select: { name: true } } },
                });
                if (owner) {
                  const certResult = await generateUserCertificate(signature.document.ownerId, {
                    commonName: owner.name || owner.email || "doc.al User",
                    organization: owner.organization?.name,
                    country: "AL",
                    validityYears: 2,
                    type: "PERSONAL",
                  });
                  ownerCert = await prisma.certificate.findUnique({
                    where: { id: certResult.certificateId },
                  });
                }
              } catch (certGenErr) {
                console.error("[sign] Certificate generation failed:", certGenErr);
              }
            }

            if (ownerCert) {
              try {
                const originalHash = computeSHA256(pdfBuffer);
                const signResult = await signPdf(pdfBuffer, {
                  certificateId: ownerCert.id,
                  signerName: "doc.al Platform",
                  reason: `Kontrate me ${allSignatures.length} pale - te gjitha te nenshkruara`,
                  location: "doc.al Platform",
                  documentHashForQR: originalHash,
                });

                pdfBuffer = signResult.signedPdfBuffer;
                finalDocHash = signResult.documentHash;
                const certInfo = signResult.certificateInfo;
                console.log("[sign] PAdES signature applied, cert:", certInfo.serialNumber);

                // Update document with new hash and hash timeline
                const docMeta = (signature.document.metadata as Record<string, unknown>) || {};
                await prisma.document.update({
                  where: { id: signature.documentId },
                  data: {
                    fileHash: finalDocHash,
                    metadata: {
                      ...docMeta,
                      cryptoSigned: true,
                      certificateSerial: certInfo.serialNumber,
                      hashTimeline: {
                        originalFile: {
                          hash: originalHash,
                          timestamp: new Date().toISOString(),
                          label: "PDF origjinal",
                        },
                        cryptoSigned: {
                          hash: finalDocHash,
                          timestamp: new Date().toISOString(),
                          label: "Nenshkrim PAdES (kontrate me shume pale)",
                          certificateSerial: certInfo.serialNumber,
                        },
                      },
                    },
                  },
                });

                // Re-upload stamped PDF to S3
                await uploadFile(signature.document.fileUrl, pdfBuffer, "application/pdf");
                console.log("[sign] Stamped PDF re-uploaded to S3");
              } catch (signErr) {
                console.error("[sign] PAdES signing failed, sending unstamped PDF:", signErr);
                // Continue with the original PDF
              }
            } else {
              console.warn("[sign] No certificate available, sending unstamped PDF");
            }

            // Submit to STAMLES (Polygon blockchain) for the completed document
            try {
              await submitToStamles(finalDocHash, signature.documentId, "document");
            } catch (stamlesErr) {
              console.error("[sign] STAMLES submit for completed doc failed (non-critical):", stamlesErr);
            }
          }

          const verifyUrl = `${baseUrl}/verify/${finalDocHash}`;

          // 3. Send emails with stamped PDF
          for (const sig of allSignatures) {
            // Send completion notification
            await sendSigningCompleted(
              sig.signerEmail,
              sig.signerName,
              signature.document.title,
              verifyUrl,
              { documentId: signature.documentId }
            );

            // Send signed PDF with hash
            if (pdfBuffer) {
              await sendSignedDocument(
                sig.signerEmail,
                sig.signerName,
                signature.document.title,
                pdfBuffer,
                `${signature.document.fileName.replace(/\.pdf$/i, "")}_nenshkruar.pdf`,
                verifyUrl,
                {
                  documentId: signature.documentId,
                  documentHash: finalDocHash,
                  sequenceNumber: timestampEntry.sequenceNumber,
                }
              );
            }
          }

          // 4. Delete PDFs from S3 after successful email delivery (privacy)
          try {
            if (signature.document.fileUrl) {
              await deleteFile(signature.document.fileUrl);
            }
            const docMetadata = (signature.document.metadata as Record<string, unknown>) || {};
            if (docMetadata.originalFileUrl) {
              await deleteFile(docMetadata.originalFileUrl as string);
            }
            await prisma.document.update({
              where: { id: signature.documentId },
              data: {
                fileUrl: "",
                metadata: {
                  ...docMetadata,
                  fileDeletedAt: new Date().toISOString(),
                  reason: "privacy-after-delivery",
                },
              },
            });
            console.log("[sign] Files deleted from S3 after email delivery (privacy)");
          } catch (deleteErr) {
            console.error("[sign] File deletion failed:", deleteErr);
          }
        } catch (emailErr) {
          console.error("[sign] Completion email failed:", emailErr);
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
