import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeSHA256, createTimestamp } from "@/lib/timestamp/engine";
import { rateLimit } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/s3";
import { buildProofMetadata, publishToIPFS, getIPFSUrl } from "@/lib/ipfs";

/**
 * POST /api/self-sign
 *
 * Handles the complete self-sign flow:
 * 1. Upload original PDF + signed PDF to S3
 * 2. Create Document record (COMPLETED)
 * 3. Create Signature record (SIGNED)
 * 4. Create TimestampEntry (blockchain anchor)
 * 5. Create AuditLog entries
 *
 * Prerequisites: User must have passed OTP + TOTP verification
 * via /api/signing/verify before calling this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    // Rate limit: 20 per hour
    const limited = rateLimit(req, "documentUpload", session.user.id);
    if (limited) return limited;

    // Verify user has completed OTP verification recently (within 10 minutes)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtpVerification = await prisma.verificationCode.findFirst({
      where: {
        userId: session.user.id,
        type: "EMAIL",
        used: true,
        createdAt: { gt: tenMinAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recentOtpVerification) {
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
      return NextResponse.json(
        { error: "Skedaret jane te detyrueshem" },
        { status: 400 }
      );
    }

    if (originalFile.type !== "application/pdf" || signedFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Vetem skedare PDF lejohen" },
        { status: 400 }
      );
    }

    if (signedFile.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Madhesia maksimale eshte 50MB" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || userEmail;
    const orgId = session.user.organizationId;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    const now = new Date();
    const timestamp = Date.now();

    // 1. Read file buffers
    const originalBuffer = Buffer.from(await originalFile.arrayBuffer());
    const signedBuffer = Buffer.from(await signedFile.arrayBuffer());

    const originalHash = computeSHA256(originalBuffer);
    const signedHash = computeSHA256(signedBuffer);

    // 2. Upload both PDFs to S3
    const originalKey = `documents/${userId}/${timestamp}-${originalFile.name}`;
    const signedKey = `documents/${userId}/${timestamp}-nenshkruar-${originalFile.name}`;

    await Promise.all([
      uploadFile(originalKey, originalBuffer, "application/pdf"),
      uploadFile(signedKey, signedBuffer, "application/pdf"),
    ]);

    // 3. Create Document record (COMPLETED status)
    const document = await prisma.document.create({
      data: {
        title,
        fileName: originalFile.name,
        fileHash: signedHash,
        fileUrl: signedKey,
        fileSize: signedFile.size,
        status: "COMPLETED",
        ownerId: userId,
        organizationId: orgId,
        metadata: {
          originalFileUrl: originalKey,
          originalFileHash: originalHash,
          selfSigned: true,
          signedAt: now.toISOString(),
        },
      },
    });

    // 4. Create Signature record (SIGNED status)
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
      },
    });

    // 5. Create TimestampEntry (blockchain anchor)
    const timestampEntry = await createTimestamp(signedBuffer, "SIGNATURE", {
      documentId: document.id,
      signatureId: signature.id,
    });

    // 6. Publish proof to IPFS (fire and forget - non-blocking)
    let ipfsCid: string | null = null;
    try {
      const proofMetadata = buildProofMetadata({
        documentHash: signedHash,
        signedAt: now.toISOString(),
        sequenceNumber: timestampEntry.sequenceNumber,
        signerName: userName,
        signerEmail: userEmail,
        fingerprint: timestampEntry.fingerprint,
        sequentialFingerprint: timestampEntry.sequentialFingerprint,
        previousEntryId: null,
        otsSubmitted: true,
      });

      ipfsCid = await publishToIPFS(proofMetadata);

      if (ipfsCid) {
        await prisma.timestampEntry.update({
          where: { id: timestampEntry.id },
          data: { ipfsCid },
        });
      }
    } catch (ipfsError) {
      console.error("[self-sign] IPFS publish failed (non-critical):", ipfsError);
    }

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
            signatureId: signature.id,
            timestampId: timestampEntry.id,
            sequenceNumber: timestampEntry.sequenceNumber,
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
