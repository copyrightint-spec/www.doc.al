import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { computeSHA256 } from "@/lib/timestamp/engine";
import { signWithCertificate } from "./certificates";

export interface PdfSignatureOptions {
  certificateId: string;
  signerName: string;
  reason?: string;
  location?: string;
  /** Document hash for QR code verification URL */
  documentHashForQR?: string;
  position?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  signatureImageBase64?: string;
}

export interface PdfSignatureResult {
  signedPdfBuffer: Buffer;
  documentHash: string;
  signatureBase64: string;
  certificateInfo: {
    serialNumber: string;
    subjectDN: string;
    issuerDN: string;
    validFrom: Date;
    validTo: Date;
  };
}

/**
 * Sign a PDF document with a cryptographic digital signature.
 *
 * Adds a certification stamp with QR code at the bottom of the last page
 * and signs the document hash with the user's X.509 certificate.
 *
 * The visual signature (drawn/text/image) is already applied by the frontend.
 * This function adds the official doc.al certification block + QR + crypto signature.
 */
export async function signPdf(
  pdfBuffer: Buffer,
  options: PdfSignatureOptions
): Promise<PdfSignatureResult> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  const pageW = lastPage.getWidth();

  // QR code points to verification page
  // Note: We use the original file hash (before stamp) for QR because the final
  // hash changes after PAdES signing. The verify page accepts both original and signed hashes.
  const preHash = options.documentHashForQR || computeSHA256(pdfBuffer);
  const baseUrl = process.env.NEXTAUTH_URL || "https://doc.al";
  const verifyUrl = `${baseUrl}/verify/${preHash}`;

  // Generate QR code as PNG data URL
  let qrImage;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 150,
      margin: 1,
      color: { dark: "#18181b", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    qrImage = await pdfDoc.embedPng(qrBytes);
  } catch {
    // QR generation failed - continue without it
  }

  // Generate DataMatrix with document hash
  let dmImage;
  try {
    const dmPng = bwipjs.toBuffer({
      bcid: "datamatrix",
      text: preHash,
      scale: 3,
    }) as unknown as Promise<Buffer>;
    const dmBuffer = await dmPng;
    dmImage = await pdfDoc.embedPng(dmBuffer);
  } catch {
    // DataMatrix generation failed - continue without it
  }

  // Stamp dimensions
  const stampX = 30;
  const stampY = 10;
  const stampW = pageW - 60;
  const qrSize = 55;
  const dmSize = 35;
  const stampH = qrSize + 10;

  // Draw stamp background
  lastPage.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    borderColor: rgb(0.08, 0.08, 0.18),
    borderWidth: 0.5,
    color: rgb(0.97, 0.97, 1),
    opacity: 0.95,
  });

  // Draw QR code (left side)
  if (qrImage) {
    lastPage.drawImage(qrImage, {
      x: stampX + 5,
      y: stampY + 5,
      width: qrSize,
      height: qrSize,
    });
  }

  // Draw DataMatrix (right side of stamp)
  if (dmImage) {
    lastPage.drawImage(dmImage, {
      x: stampX + stampW - dmSize - 5,
      y: stampY + (stampH - dmSize) / 2,
      width: dmSize,
      height: dmSize,
    });
  }

  // Text area starts after QR
  const textX = stampX + (qrImage ? qrSize + 12 : 8);

  // Certification text
  const signDate = new Date().toLocaleDateString("sq-AL", {
    timeZone: "Europe/Tirane",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Line 1: doc.al branding
  lastPage.drawText("doc.al — Nënshkrim Digjital i Çertifikuar", {
    x: textX,
    y: stampY + stampH - 14,
    size: 8,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.18),
  });

  // Line 2: Signer + date
  lastPage.drawText(`${options.signerName} | ${signDate}`, {
    x: textX,
    y: stampY + stampH - 26,
    size: 7,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  // Line 3: Regulation
  lastPage.drawText("eIDAS 910/2014 | Polygon Blockchain (STAMLES) | IPFS Proof", {
    x: textX,
    y: stampY + stampH - 37,
    size: 6,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  // Line 4: Verify URL + hash
  lastPage.drawText(`Vërifikoni: www.doc.al/verify | Hash: ${preHash.slice(0, 24)}...`, {
    x: textX,
    y: stampY + stampH - 48,
    size: 5.5,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Line 5: Certificate + reason
  const certLine = options.reason || "Nënshkrim digjital përmes doc.al";
  lastPage.drawText(`${certLine} | COPYRIGHT sh.p.k`, {
    x: textX,
    y: stampY + stampH - 57,
    size: 5,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });

  // Save modified PDF (with visual stamp)
  const stampedPdfBytes = await pdfDoc.save();
  let stampedPdfBuffer = Buffer.from(stampedPdfBytes);

  // Embed PAdES digital signature (PKCS#7/CMS) into PDF structure
  try {
    console.log("[pdf-signer] Starting PAdES signing, certId:", options.certificateId);
    const { signPdfWithPAdES } = await import("./pades-signer");
    // Get certificate data for PAdES signing
    const cert = await (await import("@/lib/db")).prisma.certificate.findUnique({
      where: { id: options.certificateId },
      select: { publicKey: true, encryptedPrivateKey: true, certificatePem: true },
    });
    if (!cert) {
      console.warn("[pdf-signer] No certificate found for PAdES signing, skipping");
    } else {
      console.log("[pdf-signer] Certificate found, calling signPdfWithPAdES...");
      const padesResult = await signPdfWithPAdES(
        stampedPdfBuffer,
        cert,
        options.signerName,
        options.reason || "Nënshkrim digjital përmes doc.al"
      );
      stampedPdfBuffer = Buffer.from(padesResult);
      console.log("[pdf-signer] PAdES signature embedded successfully, size:", stampedPdfBuffer.length);
    }
  } catch (padesError) {
    console.error("[pdf-signer] PAdES embedding failed, using stamp-only:", padesError instanceof Error ? padesError.message : padesError);
    console.error("[pdf-signer] PAdES stack:", padesError instanceof Error ? padesError.stack : "no stack");
  }

  // Compute final document hash
  const documentHash = computeSHA256(stampedPdfBuffer);

  // Sign the document hash with the certificate (cryptographic RSA-SHA256)
  const { signature, certificateInfo } = await signWithCertificate(
    options.certificateId,
    Buffer.from(documentHash, "hex")
  );

  return {
    signedPdfBuffer: stampedPdfBuffer,
    documentHash,
    signatureBase64: signature,
    certificateInfo,
  };
}

/**
 * Compute the SHA-256 hash of a PDF document
 */
export function computePdfHash(pdfBuffer: Buffer): string {
  return computeSHA256(pdfBuffer);
}
