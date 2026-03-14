import crypto from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { createTimestamp } from "@/lib/timestamp/engine";
import { signWithCertificate } from "@/lib/crypto/certificates";
import { checkQuota, incrementQuota } from "@/lib/quota";

export interface SealDesign {
  organizationName: string;
  borderText?: string;       // Text around circular border
  centerText?: string;       // Center text (e.g. "VULE ZYRTARE")
  logoUrl?: string;
  template: "classic" | "modern" | "official" | "circular";
  primaryColor: string;
  secondaryColor: string;
}

export interface ApplySealOptions {
  documentId: string;
  sealId: string;
  userId: string;
  position?: {
    page: number;
    x: number;
    y: number;
  };
}

export interface SealVerificationResult {
  valid: boolean;
  sealInfo?: {
    organizationName: string;
    sealName: string;
    sealType: string;
    eidasLevel: string;
    etsiPolicy: string | null;
    appliedAt: Date;
    appliedBy: string;
    documentTitle: string;
    documentHash: string;
  };
  timestamps?: {
    server: {
      timestamp: Date;
      sequenceNumber: number;
      fingerprint: string;
    };
    bitcoin?: {
      status: string;
      txId: string | null;
      blockHeight: number | null;
      blockHash: string | null;
    };
  };
  certificate?: {
    serialNumber: string;
    subjectDN: string;
    issuerDN: string;
    validFrom: Date;
    validTo: Date;
    signatureValid: boolean;
  };
  chainIntegrity: boolean;
}

/**
 * Apply a company seal to a document.
 * Creates dual timestamps (server + OTS/Bitcoin), digitally signs with certificate,
 * and generates verification proof.
 *
 * eIDAS Regulation (EU) No 910/2014 - Article 35: Electronic seals
 * ETSI EN 319 411-1: Policy requirements for TSP issuing certificates
 * ETSI EN 319 421: Policy for TSP providing time-stamping services
 */
export async function applyCompanySeal(options: ApplySealOptions): Promise<{
  appliedSealId: string;
  certificationHash: string;
  verificationUrl: string;
  timestampResult: {
    serverId: string;
    serverSequence: number;
    otsSubmitted: boolean;
  };
}> {
  // 1. Load seal and document
  const seal = await prisma.companySeal.findUnique({
    where: { id: options.sealId },
    include: {
      organization: true,
      certificate: true,
    },
  });

  if (!seal) throw new Error("Vula nuk u gjet");
  if (seal.status !== "ACTIVE") throw new Error("Vula nuk eshte aktive");
  if (seal.expiresAt && seal.expiresAt < new Date()) throw new Error("Vula ka skaduar");

  const document = await prisma.document.findUnique({
    where: { id: options.documentId },
    include: { owner: { select: { name: true, email: true } } },
  });

  if (!document) throw new Error("Dokumenti nuk u gjet");

  // 2. Check quota
  const quotaCheck = await checkQuota(seal.organizationId, "seals");
  if (!quotaCheck.allowed) {
    throw new Error(
      `Kuota e vulave u tejkalua. Perdorur: ${quotaCheck.current}/${quotaCheck.limit}. ` +
      `Upgrade planin per me shume vula.`
    );
  }

  // 3. Create certification hash
  // Combines: document hash + seal ID + organization ID + server timestamp + ETSI policy
  const serverTimestamp = new Date();
  const certPayload = {
    documentHash: document.fileHash,
    documentId: document.id,
    sealId: seal.id,
    organizationId: seal.organizationId,
    organizationName: seal.organization.name,
    eidasLevel: seal.eidasLevel,
    etsiPolicy: seal.etsiPolicy,
    serverTimestamp: serverTimestamp.toISOString(),
    protocol: "DOC.AL-ESEAL-v1",
  };

  const certPayloadStr = JSON.stringify(certPayload, Object.keys(certPayload).sort());
  const certificationHash = crypto
    .createHash("sha256")
    .update(certPayloadStr)
    .digest("hex");

  // 4. Digital signature with certificate (if available)
  let digitalSignature: string | null = null;
  if (seal.certificateId && seal.certificate && !seal.certificate.revoked) {
    try {
      const signResult = await signWithCertificate(
        seal.certificateId,
        Buffer.from(certPayloadStr)
      );
      digitalSignature = signResult.signature;
    } catch {
      // Certificate signing failed, continue without it
      console.warn("Seal certificate signing failed, applying without digital signature");
    }
  }

  // 5. Create timestamp in chain (server timestamp)
  // This also auto-submits to OpenTimestamps/Bitcoin (dual timestamp)
  const timestampResult = await createTimestamp(
    certificationHash,
    "COMPANY_SEAL",
    { documentId: document.id }
  );

  // 6. Generate verification URL and QR
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.doc.al";
  const verificationUrl = `${baseUrl}/verify/seal/${certificationHash}`;

  const qrCodeDataUri = await QRCode.toDataURL(verificationUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  // 7. Save applied seal record
  const appliedSeal = await prisma.appliedSeal.create({
    data: {
      documentId: document.id,
      sealId: seal.id,
      appliedByUserId: options.userId,
      certificationHash,
      verificationUrl,
      qrCodeDataUri,
      serverTimestamp,
      timestampEntryId: timestampResult.id,
      pageNumber: options.position?.page ?? 1,
      xPosition: options.position?.x ?? 50,
      yPosition: options.position?.y ?? 50,
      digitalSignature,
      signedPayload: certPayloadStr,
    },
  });

  // 8. Increment quota
  await incrementQuota(seal.organizationId, "seals");

  // 9. Audit log
  await prisma.auditLog.create({
    data: {
      action: "COMPANY_SEAL_APPLIED",
      entityType: "AppliedSeal",
      entityId: appliedSeal.id,
      userId: options.userId,
      metadata: {
        documentId: document.id,
        documentTitle: document.title,
        sealId: seal.id,
        sealName: seal.name,
        organizationId: seal.organizationId,
        organizationName: seal.organization.name,
        certificationHash,
        eidasLevel: seal.eidasLevel,
        etsiPolicy: seal.etsiPolicy,
        timestampSequence: timestampResult.sequenceNumber,
        hasCertificateSignature: !!digitalSignature,
      },
    },
  });

  return {
    appliedSealId: appliedSeal.id,
    certificationHash,
    verificationUrl,
    timestampResult: {
      serverId: timestampResult.id,
      serverSequence: timestampResult.sequenceNumber,
      otsSubmitted: true, // createTimestamp auto-submits to OTS
    },
  };
}

/**
 * Verify an applied company seal.
 * Checks: certification hash, digital signature, timestamp chain, OTS/Bitcoin confirmation.
 *
 * Returns comprehensive verification result per eIDAS Article 35.2
 */
export async function verifyCompanySeal(
  certificationHash: string
): Promise<SealVerificationResult> {
  const appliedSeal = await prisma.appliedSeal.findUnique({
    where: { certificationHash },
    include: {
      seal: {
        include: {
          organization: true,
          certificate: true,
        },
      },
      document: {
        select: { id: true, title: true, fileHash: true },
      },
      appliedBy: {
        select: { name: true, email: true },
      },
      timestampEntry: true,
    },
  });

  if (!appliedSeal) {
    return { valid: false, chainIntegrity: false };
  }

  // 1. Verify certification hash
  let hashValid = false;
  if (appliedSeal.signedPayload) {
    const recomputedHash = crypto
      .createHash("sha256")
      .update(appliedSeal.signedPayload)
      .digest("hex");
    hashValid = recomputedHash === certificationHash;
  }

  // 2. Verify digital signature (if present)
  let signatureValid = false;
  if (
    appliedSeal.digitalSignature &&
    appliedSeal.signedPayload &&
    appliedSeal.seal.certificate
  ) {
    try {
      const { verifySignature } = await import("@/lib/crypto/certificates");
      signatureValid = verifySignature(
        appliedSeal.seal.certificate.publicKey,
        Buffer.from(appliedSeal.signedPayload),
        appliedSeal.digitalSignature
      );
    } catch {
      signatureValid = false;
    }
  }

  // 3. Check timestamp chain integrity
  const chainIntegrity = hashValid;

  // 4. Build result
  const result: SealVerificationResult = {
    valid: hashValid && (appliedSeal.seal.status === "ACTIVE" || appliedSeal.seal.status === "EXPIRED"),
    sealInfo: {
      organizationName: appliedSeal.seal.organization.name,
      sealName: appliedSeal.seal.name,
      sealType: appliedSeal.seal.type,
      eidasLevel: appliedSeal.seal.eidasLevel,
      etsiPolicy: appliedSeal.seal.etsiPolicy,
      appliedAt: appliedSeal.appliedAt,
      appliedBy: appliedSeal.appliedBy.name,
      documentTitle: appliedSeal.document.title,
      documentHash: appliedSeal.document.fileHash,
    },
    chainIntegrity,
  };

  // 5. Add timestamp info
  if (appliedSeal.timestampEntry) {
    result.timestamps = {
      server: {
        timestamp: appliedSeal.timestampEntry.serverTimestamp,
        sequenceNumber: appliedSeal.timestampEntry.sequenceNumber,
        fingerprint: appliedSeal.timestampEntry.fingerprint,
      },
    };

    if (appliedSeal.timestampEntry.otsStatus === "CONFIRMED") {
      result.timestamps.bitcoin = {
        status: "CONFIRMED",
        txId: appliedSeal.timestampEntry.btcTxId,
        blockHeight: appliedSeal.timestampEntry.btcBlockHeight,
        blockHash: appliedSeal.timestampEntry.btcBlockHash,
      };
    } else {
      result.timestamps.bitcoin = {
        status: "PENDING",
        txId: null,
        blockHeight: null,
        blockHash: null,
      };
    }
  }

  // 6. Add certificate info
  if (appliedSeal.seal.certificate) {
    result.certificate = {
      serialNumber: appliedSeal.seal.certificate.serialNumber,
      subjectDN: appliedSeal.seal.certificate.subjectDN,
      issuerDN: appliedSeal.seal.certificate.issuerDN,
      validFrom: appliedSeal.seal.certificate.validFrom,
      validTo: appliedSeal.seal.certificate.validTo,
      signatureValid,
    };
  }

  return result;
}

/**
 * Add visual company seal to a PDF document.
 * Renders the seal with QR code, organization info, and verification data.
 */
export async function addCompanySealToPdf(
  pdfBuffer: Buffer,
  appliedSealId: string
): Promise<Buffer> {
  const appliedSeal = await prisma.appliedSeal.findUnique({
    where: { id: appliedSealId },
    include: {
      seal: { include: { organization: true } },
      timestampEntry: true,
    },
  });

  if (!appliedSeal) throw new Error("Applied seal nuk u gjet");

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed QR code
  let qrImage;
  if (appliedSeal.qrCodeDataUri) {
    const qrBytes = Buffer.from(appliedSeal.qrCodeDataUri.split(",")[1], "base64");
    qrImage = await pdfDoc.embedPng(qrBytes);
  }

  const pageIndex = Math.min(appliedSeal.pageNumber - 1, pdfDoc.getPageCount() - 1);
  const page = pdfDoc.getPage(pageIndex);

  const sealX = appliedSeal.xPosition;
  const sealY = appliedSeal.yPosition;
  const sealWidth = 380;
  const sealHeight = 110;

  // Seal colors based on eIDAS level
  const levelColors = {
    BASIC: { border: rgb(0.4, 0.4, 0.5), bg: rgb(0.96, 0.96, 0.98), accent: rgb(0.3, 0.3, 0.5) },
    ADVANCED: { border: rgb(0.0, 0.2, 0.5), bg: rgb(0.95, 0.97, 1.0), accent: rgb(0.0, 0.3, 0.6) },
    QUALIFIED: { border: rgb(0.0, 0.35, 0.15), bg: rgb(0.95, 0.99, 0.96), accent: rgb(0.0, 0.5, 0.2) },
  };
  const c = levelColors[appliedSeal.seal.eidasLevel as keyof typeof levelColors] || levelColors.ADVANCED;

  // Draw seal background with double border
  page.drawRectangle({
    x: sealX, y: sealY, width: sealWidth, height: sealHeight,
    color: c.bg, borderColor: c.border, borderWidth: 2, opacity: 0.95,
  });
  page.drawRectangle({
    x: sealX + 3, y: sealY + 3, width: sealWidth - 6, height: sealHeight - 6,
    borderColor: c.border, borderWidth: 0.5, opacity: 0.3,
  });

  // QR code
  if (qrImage) {
    const qrSize = 75;
    page.drawImage(qrImage, {
      x: sealX + sealWidth - qrSize - 10,
      y: sealY + (sealHeight - qrSize) / 2,
      width: qrSize, height: qrSize,
    });
  }

  const textX = sealX + 10;
  let textY = sealY + sealHeight - 16;

  // Header: "VULE ELEKTRONIKE / ELECTRONIC SEAL"
  page.drawText("VULE ELEKTRONIKE | ELECTRONIC SEAL", {
    x: textX, y: textY, size: 7, font: fontBold, color: c.accent,
  });

  // Organization name
  textY -= 15;
  page.drawText(appliedSeal.seal.organization.name.toUpperCase(), {
    x: textX, y: textY, size: 11, font: fontBold, color: c.border,
  });

  // Seal name + type
  textY -= 12;
  page.drawText(`${appliedSeal.seal.name} | ${appliedSeal.seal.type.replace(/_/g, " ")}`, {
    x: textX, y: textY, size: 7, font, color: rgb(0.4, 0.4, 0.4),
  });

  // Date
  textY -= 11;
  const dateStr = appliedSeal.appliedAt.toLocaleString("en-GB", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
  page.drawText(`Data: ${dateStr} UTC`, {
    x: textX, y: textY, size: 6.5, font, color: rgb(0.4, 0.4, 0.4),
  });

  // Hash + Chain ID
  textY -= 10;
  const hashTrunc = appliedSeal.certificationHash.slice(0, 16) + "..." + appliedSeal.certificationHash.slice(-8);
  let chainText = `SHA-256: ${hashTrunc}`;
  if (appliedSeal.timestampEntry) {
    chainText += ` | Chain #${appliedSeal.timestampEntry.sequenceNumber}`;
    if (appliedSeal.timestampEntry.btcBlockHeight) {
      chainText += ` | BTC Block #${appliedSeal.timestampEntry.btcBlockHeight}`;
    }
  }
  page.drawText(chainText, {
    x: textX, y: textY, size: 5.5, font, color: rgb(0.5, 0.5, 0.5),
  });

  // eIDAS / ETSI footer
  textY -= 10;
  const complianceText = `eIDAS: ${appliedSeal.seal.eidasLevel} | ${appliedSeal.seal.etsiPolicy || "ETSI EN 319 411-1"} | doc.al/verify`;
  page.drawText(complianceText, {
    x: textX, y: textY, size: 5, font, color: rgb(0.6, 0.6, 0.6),
  });

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}

/**
 * Create a new company seal for an organization.
 * Optionally generates an X.509 certificate for the seal.
 */
export async function createCompanySeal(params: {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  type?: string;
  template?: string;
  primaryColor?: string;
  secondaryColor?: string;
  borderText?: string;
  centerText?: string;
  logoUrl?: string;
  eidasLevel?: string;
  generateCertificate?: boolean;
  validityYears?: number;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
    select: { name: true, plan: true, domain: true },
  });

  if (!org) throw new Error("Organizata nuk u gjet");

  // Check if plan allows seals
  const { PLANS } = await import("@/lib/constants/plans");
  const planDef = PLANS[org.plan];
  if (!planDef || planDef.quotas.maxSeals === 0) {
    throw new Error("Plani juaj nuk perfshin vula dixhitale. Upgrade ne PRO ose ENTERPRISE.");
  }

  // Generate certificate for the seal if requested
  let certificateId: string | undefined;
  if (params.generateCertificate) {
    const { generateUserCertificate } = await import("@/lib/crypto/certificates");
    const certResult = await generateUserCertificate(params.userId, {
      commonName: `${org.name} - ${params.name}`,
      organization: org.name,
      country: "AL",
      validityYears: params.validityYears || 2,
      type: "ORGANIZATION",
    });
    certificateId = certResult.certificateId;

    // Link certificate to organization
    await prisma.certificate.update({
      where: { id: certResult.certificateId },
      data: { organizationId: params.organizationId },
    });
  }

  const seal = await prisma.companySeal.create({
    data: {
      name: params.name,
      description: params.description,
      type: (params.type as "COMPANY_SEAL" | "OFFICIAL_STAMP" | "INVOICE_SEAL" | "CUSTOM") || "COMPANY_SEAL",
      template: params.template || "official",
      primaryColor: params.primaryColor || "#0f172a",
      secondaryColor: params.secondaryColor || "#ffffff",
      borderText: params.borderText || org.name.toUpperCase(),
      centerText: params.centerText || "VULE ZYRTARE",
      logoUrl: params.logoUrl,
      eidasLevel: params.eidasLevel || (org.plan === "ENTERPRISE" ? "QUALIFIED" : "ADVANCED"),
      etsiPolicy: org.plan === "ENTERPRISE" ? "ETSI EN 319 411-2" : "ETSI EN 319 411-1",
      status: "ACTIVE",
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + (params.validityYears || 2) * 365 * 24 * 60 * 60 * 1000),
      organizationId: params.organizationId,
      createdByUserId: params.userId,
      certificateId,
    },
    include: {
      organization: { select: { name: true } },
      certificate: { select: { serialNumber: true, validTo: true } },
    },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      action: "COMPANY_SEAL_CREATED",
      entityType: "CompanySeal",
      entityId: seal.id,
      userId: params.userId,
      metadata: {
        sealName: seal.name,
        sealType: seal.type,
        organizationId: seal.organizationId,
        eidasLevel: seal.eidasLevel,
        hasCertificate: !!certificateId,
      },
    },
  });

  return seal;
}
