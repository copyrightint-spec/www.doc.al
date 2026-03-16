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
 * Sign a PDF document with a cryptographic digital signature.
 *
 * Adds a certification stamp box at the bottom of the last page
 * and signs the document hash with the user's X.509 certificate.
 *
 * The visual signature (drawn/text/image) is already applied by the frontend.
 * This function adds the official doc.al certification block + crypto signature.
 */
export async function signPdf(
  pdfBuffer: Buffer,
  options: PdfSignatureOptions
): Promise<PdfSignatureResult> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add certification stamp on the last page
  const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  const pageW = lastPage.getWidth();

  const stampX = 30;
  const stampY = 15;
  const stampW = pageW - 60;
  const stampH = 40;

  // Draw stamp background
  lastPage.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    borderColor: rgb(0.08, 0.08, 0.18),
    borderWidth: 0.5,
    color: rgb(0.96, 0.96, 1),
    opacity: 0.95,
  });

  // Certification text
  const signDate = new Date().toLocaleDateString("sq-AL", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  lastPage.drawText("doc.al", {
    x: stampX + 8,
    y: stampY + stampH - 14,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.08, 0.18),
  });

  lastPage.drawText(`Nenshkrim Dixhital i Certifikuar | ${options.signerName} | ${signDate}`, {
    x: stampX + 50,
    y: stampY + stampH - 14,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const certText = options.reason || "Nenshkrim dixhital permes doc.al";
  lastPage.drawText(`${certText} | eIDAS 910/2014 | Verifikoni: doc.al/verify`, {
    x: stampX + 8,
    y: stampY + 6,
    size: 6,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Save modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  const modifiedPdfBuffer = Buffer.from(modifiedPdfBytes);

  // Compute document hash
  const documentHash = computeSHA256(modifiedPdfBuffer);

  // Sign the document hash with the certificate (cryptographic signature)
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
