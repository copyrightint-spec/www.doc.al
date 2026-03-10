import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export type SealTemplate = "classic" | "modern" | "official";

export interface SealOptions {
  signerName: string;
  signDate: Date;
  documentHash: string;
  timestampId: number;
  btcBlockHeight?: number | null;
  template: SealTemplate;
  position?: { page: number; x: number; y: number };
  verifyBaseUrl?: string;
}

/**
 * Generate and embed an automatic signature seal into a PDF.
 * The seal contains: signer name, date, document hash, QR code for verification.
 */
export async function addSealToPdf(
  pdfBuffer: Buffer,
  options: SealOptions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const verifyUrl = `${options.verifyBaseUrl || "https://www.doc.al"}/explorer/${options.timestampId}`;

  // Generate QR code
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 100,
    margin: 1,
    color: { dark: "#1a1a2e", light: "#ffffff" },
  });
  const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Determine page and position
  const pageIndex = options.position?.page ?? pdfDoc.getPageCount() - 1;
  const page = pdfDoc.getPage(pageIndex);

  const sealX = options.position?.x ?? 50;
  const sealY = options.position?.y ?? 30;
  const sealWidth = 340;
  const sealHeight = 95;

  // Template colors
  const colors = {
    classic: { border: rgb(0.1, 0.1, 0.3), bg: rgb(0.96, 0.96, 1), accent: rgb(0.2, 0.2, 0.5) },
    modern: { border: rgb(0.15, 0.15, 0.15), bg: rgb(0.98, 0.98, 0.98), accent: rgb(0.3, 0.3, 0.3) },
    official: { border: rgb(0.0, 0.2, 0.4), bg: rgb(0.95, 0.97, 1), accent: rgb(0.0, 0.3, 0.6) },
  };

  const c = colors[options.template];

  // Draw seal background
  page.drawRectangle({
    x: sealX,
    y: sealY,
    width: sealWidth,
    height: sealHeight,
    color: c.bg,
    borderColor: c.border,
    borderWidth: options.template === "official" ? 2 : 1,
    opacity: 0.95,
  });

  // Draw inner border for classic/official
  if (options.template !== "modern") {
    page.drawRectangle({
      x: sealX + 3,
      y: sealY + 3,
      width: sealWidth - 6,
      height: sealHeight - 6,
      borderColor: c.border,
      borderWidth: 0.5,
      opacity: 0.3,
    });
  }

  // Draw QR code
  const qrSize = 65;
  page.drawImage(qrImage, {
    x: sealX + sealWidth - qrSize - 10,
    y: sealY + (sealHeight - qrSize) / 2,
    width: qrSize,
    height: qrSize,
  });

  // Text content
  const textX = sealX + 10;
  let textY = sealY + sealHeight - 18;

  // Header
  page.drawText("NENSHKRIM ELEKTRONIK", {
    x: textX,
    y: textY,
    size: 8,
    font: fontBold,
    color: c.accent,
  });

  // Signer name
  textY -= 14;
  page.drawText(options.signerName, {
    x: textX,
    y: textY,
    size: 10,
    font: fontBold,
    color: c.border,
  });

  // Date
  textY -= 12;
  const dateStr = options.signDate.toLocaleString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  page.drawText(`Data: ${dateStr} UTC`, {
    x: textX,
    y: textY,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Hash (truncated)
  textY -= 11;
  const hashTruncated = options.documentHash.slice(0, 24) + "..." + options.documentHash.slice(-8);
  page.drawText(`SHA-256: ${hashTruncated}`, {
    x: textX,
    y: textY,
    size: 6,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Timestamp ID and BTC status
  textY -= 11;
  let statusText = `Chain ID: #${options.timestampId}`;
  if (options.btcBlockHeight) {
    statusText += ` | BTC Block #${options.btcBlockHeight}`;
  }
  page.drawText(statusText, {
    x: textX,
    y: textY,
    size: 6,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer
  textY -= 10;
  page.drawText("Verifikoni: doc.al/verify | eIDAS Compliant", {
    x: textX,
    y: textY,
    size: 5,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  const resultBytes = await pdfDoc.save();
  return Buffer.from(resultBytes);
}
