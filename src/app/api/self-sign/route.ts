import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeSHA256, createTimestamp } from "@/lib/timestamp/engine";
import { rateLimit } from "@/lib/rate-limit";
import { uploadFile, deleteFile } from "@/lib/s3";
import { buildProofMetadata, publishToIPFS, getIPFSUrl } from "@/lib/ipfs";
import { signPdf } from "@/lib/crypto/pdf-signer";
import { generateUserCertificate } from "@/lib/crypto/certificates";
import { sendSigningCompleted, sendSignedDocument } from "@/lib/email";
import { submitToStamles } from "@/lib/stamles";

/**
 * POST /api/self-sign
 *
 * Complete self-sign flow with real cryptographic digital signature:
 * 1. Get or generate user certificate
 * 2. Apply cryptographic PDF signature (visible in Adobe Reader)
 * 3. Upload original + signed PDF to S3
 * 4. Create Document, Signature, TimestampEntry records
 * 5. Publish proof to IPFS blockchain
 * 6. Send completion email
 * 7. Create audit trail
 *
 * Prerequisites: OTP + TOTP verification via /api/signing/verify
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const limited = rateLimit(req, "documentUpload", session.user.id);
    if (limited) return limited;

    // Verify user is eligible to sign (KYC + TOTP + email verified)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kycStatus: true, totpEnabled: true, emailVerified: true },
    });
    if (!user?.emailVerified) {
      return NextResponse.json({ error: "Email nuk eshte verifikuar" }, { status: 403 });
    }
    if (user.kycStatus !== "VERIFIED") {
      return NextResponse.json({ error: "KYC nuk eshte verifikuar" }, { status: 403 });
    }
    if (!user.totpEnabled) {
      return NextResponse.json({ error: "2FA nuk eshte aktivizuar" }, { status: 403 });
    }

    // Verify OTP completed within 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtp = await prisma.verificationCode.findFirst({
      where: {
        userId: session.user.id,
        type: "EMAIL",
        used: true,
        createdAt: { gt: tenMinAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recentOtp) {
      return NextResponse.json(
        { error: "Verifikimi OTP ka skaduar. Ju lutem verifikohuni perseri." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const originalFile = formData.get("originalFile") as File | null;
    const signedFile = formData.get("signedFile") as File | null;
    const title = (formData.get("title") as string) || "Dokument i nenshkruar";
    const signatureImageDataUrl = formData.get("signatureImage") as string | null;
    const placementJson = formData.get("placement") as string | null;

    if (!originalFile || !signedFile) {
      return NextResponse.json({ error: "Skedaret jane te detyrueshem" }, { status: 400 });
    }

    if (originalFile.type !== "application/pdf" || signedFile.type !== "application/pdf") {
      return NextResponse.json({ error: "Vetem skedare PDF lejohen" }, { status: 400 });
    }

    if (originalFile.size > 50 * 1024 * 1024 || signedFile.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Madhesia maksimale eshte 50MB" }, { status: 400 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;
    const orgId = session.user.organizationId;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    const now = new Date();
    const ts = Date.now();

    const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
    const visuallySignedBuffer = Buffer.from(await signedFile.arrayBuffer());
    const originalHash = computeSHA256(originalBuffer);

    // 1. Get or create user certificate for cryptographic signing
    let certificate = await prisma.certificate.findFirst({
      where: {
        userId,
        revoked: false,
        validTo: { gt: now },
        type: "PERSONAL",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!certificate) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, organization: { select: { name: true } } },
      });
      const certResult = await generateUserCertificate(userId, {
        commonName: user?.name || userName,
        organization: user?.organization?.name,
        country: "AL",
        validityYears: 2,
        type: "PERSONAL",
      });
      certificate = await prisma.certificate.findUnique({
        where: { id: certResult.certificateId },
      });
    }

    // 2. Apply cryptographic digital signature to the visually signed PDF
    const originalFileHash = computeSHA256(originalBuffer);
    let finalPdfBuffer: Buffer;
    let signedHash: string;
    let cryptoSignatureBase64: string | null = null;
    let certInfo: { serialNumber: string; subjectDN: string; issuerDN: string; validFrom: Date; validTo: Date } | null = null;

    if (certificate) {
      try {
        // Extract base64 image from data URL for the signature box
        let sigImageBase64: string | undefined;
        if (signatureImageDataUrl?.startsWith("data:image/")) {
          sigImageBase64 = signatureImageDataUrl.split(",")[1];
        }

        const placement = placementJson ? JSON.parse(placementJson) : null;

        const signResult = await signPdf(visuallySignedBuffer, {
          certificateId: certificate.id,
          signerName: userName,
          reason: "Nenshkrim dixhital permes doc.al",
          location: "doc.al Platform",
          documentHashForQR: originalFileHash,
          position: placement ? {
            page: placement.pageIndex || 0,
            x: 50,
            y: 50,
            width: 250,
            height: 80,
          } : undefined,
          signatureImageBase64: sigImageBase64,
        });

        finalPdfBuffer = signResult.signedPdfBuffer;
        signedHash = signResult.documentHash;
        cryptoSignatureBase64 = signResult.signatureBase64;
        certInfo = signResult.certificateInfo;
        console.log("[self-sign] Cryptographic signature applied, cert:", certInfo.serialNumber);
      } catch (certError) {
        console.error("[self-sign] Crypto signing failed, using visual-only:", certError);
        finalPdfBuffer = visuallySignedBuffer;
        signedHash = computeSHA256(visuallySignedBuffer);
      }
    } else {
      finalPdfBuffer = visuallySignedBuffer;
      signedHash = computeSHA256(visuallySignedBuffer);
    }

    // 3. Upload PDFs to S3
    const originalKey = `documents/${userId}/${ts}-${originalFile.name}`;
    const signedKey = `documents/${userId}/${ts}-nenshkruar-${originalFile.name}`;

    await Promise.all([
      uploadFile(originalKey, originalBuffer, "application/pdf"),
      uploadFile(signedKey, finalPdfBuffer, "application/pdf"),
    ]);

    // 4. Create Document record
    const document = await prisma.document.create({
      data: {
        title,
        fileName: originalFile.name,
        fileHash: signedHash,
        fileUrl: signedKey,
        fileSize: finalPdfBuffer.length,
        status: "COMPLETED",
        ownerId: userId,
        organizationId: orgId,
        metadata: {
          originalFileUrl: originalKey,
          originalFileHash: originalHash,
          selfSigned: true,
          signedAt: now.toISOString(),
          cryptoSigned: !!cryptoSignatureBase64,
          certificateSerial: certInfo?.serialNumber || null,
        },
      },
    });

    // 5. Create Signature record
    const signatureToken = crypto.randomBytes(32).toString("hex");
    const signature = await prisma.signature.create({
      data: {
        documentId: document.id,
        signerEmail: userEmail,
        signerName: userName,
        signerId: userId,
        token: signatureToken,
        status: "SIGNED",
        signedAt: now,
        signatureImageUrl: signatureImageDataUrl || undefined,
        position: placementJson ? JSON.parse(placementJson) : undefined,
        notificationChannel: "EMAIL",
        verificationSentAt: now,
        certificateId: certificate?.id,
      },
    });

    // 6. Create TimestampEntry (Bitcoin + OTS)
    const timestampEntry = await createTimestamp(finalPdfBuffer, "SIGNATURE", {
      documentId: document.id,
      signatureId: signature.id,
    });

    // 7. IPFS proof will be published automatically by check-stamles cron
    // after Polygon blockchain confirmation (ensures complete proof with TX data)
    const ipfsCid: string | null = null;

    // 8. Submit to STAMLES (Polygon blockchain)
    try {
      await submitToStamles(signedHash, document.id, "document");
    } catch (stamlesError) {
      console.error("[self-sign] STAMLES submit failed (non-critical):", stamlesError);
    }

    // 9. Send completion email, then delete files only after both emails succeed
    try {
      await sendSigningCompleted(
        userEmail,
        userName,
        title,
        `${process.env.NEXTAUTH_URL || "https://doc.al"}/verify/${signedHash}`,
        {
          documentId: document.id,
          userId,
        }
      );
      // Send signed PDF as separate email
      const signedFileName = `${originalFile.name.replace(/\.pdf$/i, "")}_nenshkruar.pdf`;
      await sendSignedDocument(
        userEmail,
        userName,
        title,
        finalPdfBuffer,
        signedFileName,
        `${process.env.NEXTAUTH_URL || "https://doc.al"}/verify/${signedHash}`,
        {
          documentId: document.id,
          userId,
          documentHash: signedHash,
          sequenceNumber: timestampEntry.sequenceNumber,
        }
      );

      // Only delete after BOTH emails sent successfully
      try {
        await deleteFile(signedKey);
        await deleteFile(originalKey);
        // Update document record to indicate file deleted
        const existingMetadata = (document.metadata as Record<string, unknown>) || {};
        await prisma.document.update({
          where: { id: document.id },
          data: {
            fileUrl: "",
            metadata: {
              ...existingMetadata,
              fileDeletedAt: new Date().toISOString(),
              reason: "privacy-after-delivery",
            },
          },
        });
        console.log("[self-sign] Files deleted from S3 after email delivery (privacy)");
      } catch (deleteError) {
        console.error("[self-sign] File deletion failed:", deleteError);
      }
    } catch (emailError) {
      // Email failed - DO NOT delete files
      console.error("[self-sign] Email failed, keeping files:", emailError);
    }

    // 9. Audit Logs
    const auditBase = { userId, ipAddress, userAgent };
    await prisma.auditLog.createMany({
      data: [
        {
          ...auditBase,
          action: "EIDAS_CONSENT_ACCEPTED",
          entityType: "Signature",
          entityId: signature.id,
          metadata: { regulation: "eIDAS 910/2014" },
        },
        {
          ...auditBase,
          action: "DOCUMENT_SELF_SIGNED",
          entityType: "Document",
          entityId: document.id,
          metadata: {
            fileName: originalFile.name,
            originalHash,
            signedHash,
            cryptoSigned: !!cryptoSignatureBase64,
            certificateSerial: certInfo?.serialNumber || null,
            signatureId: signature.id,
            timestampId: timestampEntry.id,
            sequenceNumber: timestampEntry.sequenceNumber,
            ipfsCid,
          },
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        signatureId: signature.id,
        signedPdfUrl: signedKey,
        documentHash: signedHash,
        timestampId: timestampEntry.id,
        sequenceNumber: timestampEntry.sequenceNumber,
        fingerprint: timestampEntry.fingerprint,
        signedAt: now.toISOString(),
        ipfsCid: ipfsCid || undefined,
        ipfsUrl: ipfsCid ? getIPFSUrl(ipfsCid) : undefined,
        cryptoSigned: !!cryptoSignatureBase64,
        certificateSerial: certInfo?.serialNumber || undefined,
      },
    });
  } catch (error) {
    console.error("[self-sign] Error:", error);
    return NextResponse.json(
      { error: "Ndodhi nje gabim gjate nenshkrimit" },
      { status: 500 }
    );
  }
}
