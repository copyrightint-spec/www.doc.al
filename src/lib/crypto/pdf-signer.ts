import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { computeSHA256 } from "@/lib/timestamp/engine";
import { signWithCertificate } from "./certificates";

export interface PdfSignatureOptions {
  certificateId: string;
  signerName: string;
  reason?: string;
  location?: string;
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
 * Sign a PDF document with a digital signature.
 * Adds visual signature annotation and cryptographic signature.
 */
export async function signPdf(
  pdfBuffer: Buffer,
  options: PdfSignatureOptions
): Promise<PdfSignatureResult> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Determine signature page and position
  const pageIndex = options.position?.page ?? pdfDoc.getPageCount() - 1;
  const page = pdfDoc.getPage(pageIndex);

  const sigX = options.position?.x ?? 50;
  const sigY = options.position?.y ?? 50;
  const sigWidth = options.position?.width ?? 250;
  const sigHeight = options.position?.height ?? 80;

  // Draw signature box
  page.drawRectangle({
    x: sigX,
    y: sigY,
    width: sigWidth,
    height: sigHeight,
    borderColor: rgb(0.1, 0.1, 0.2),
    borderWidth: 1,
    color: rgb(0.97, 0.97, 1),
    opacity: 0.9,
  });

  // Draw signature image if provided
  if (options.signatureImageBase64) {
    try {
      const imgBytes = Buffer.from(options.signatureImageBase64, "base64");
      const image = await pdfDoc.embedPng(imgBytes).catch(() =>
        pdfDoc.embedJpg(imgBytes)
      );
      const imgDims = image.scale(1);
      const scale = Math.min(
        (sigWidth - 20) / imgDims.width,
        (sigHeight - 30) / imgDims.height
      );
      page.drawImage(image, {
        x: sigX + 10,
        y: sigY + 25,
        width: imgDims.width * scale,
        height: imgDims.height * scale,
      });
    } catch {
      // Fall back to text signature
    }
  }

  // Draw signer name
  page.drawText(options.signerName, {
    x: sigX + 10,
    y: sigY + sigHeight - 18,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.2),
  });

  // Draw date
  const signDate = new Date().toISOString().split("T")[0];
  page.drawText(`Nenshkruar: ${signDate}`, {
    x: sigX + 10,
    y: sigY + 5,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Draw doc.al watermark
  page.drawText("doc.al | eIDAS Compliant", {
    x: sigX + sigWidth - 130,
    y: sigY + 5,
    size: 6,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  // Save modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  const modifiedPdfBuffer = Buffer.from(modifiedPdfBytes);

  // Compute document hash
  const documentHash = computeSHA256(modifiedPdfBuffer);

  // Sign the document hash with the certificate
  const { signature, certificateInfo } = await signWithCertificate(
    options.certificateId,
    Buffer.from(documentHash, "hex")
  );

  return {
    signedPdfBuffer: modifiedPdfBuffer,
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
