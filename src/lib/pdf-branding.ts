/**
 * PDF Branding Utilities for jsPDF
 *
 * Adds DOC.al branding elements to generated PDFs:
 * - Organization logo (top-left)
 * - DOC.al logo (bottom-left)
 * - QR code for verification (bottom-left)
 * - DataMatrix barcode (bottom-center-right)
 * - Page numbers and timestamps
 */

import jsPDF from "jspdf";
import QRCode from "qrcode";

/**
 * Generate QR code as data URL
 */
async function generateQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
  } catch {
    return "";
  }
}

/**
 * Generate a simple DataMatrix-style pattern as data URL using canvas
 * (Lightweight alternative to full bwip-js for visual representation)
 */
async function generateDataMatrixDataUrl(data: string): Promise<string> {
  try {
    const bwipjs = await import("bwip-js");
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "datamatrix",
      text: data,
      scale: 3,
      paddingwidth: 2,
      paddingheight: 2,
      backgroundcolor: "ffffff",
      barcolor: "0f172a",
    });
    return canvas.toDataURL("image/png");
  } catch {
    // Fallback: generate a placeholder pattern
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = "#0f172a";
    // Draw a deterministic pattern from data
    const hash = data.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if ((hash + x * 13 + y * 7) % 3 !== 0) {
          ctx.fillRect(x * 10, y * 10, 10, 10);
        }
      }
    }
    // L-shaped finder pattern
    ctx.fillStyle = "#0f172a";
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(0, i * 10, 10, 10); // left column
      ctx.fillRect(i * 10, 90, 10, 10); // bottom row
    }
    return canvas.toDataURL("image/png");
  }
}

/**
 * Load an image URL and return it as data URL for embedding in PDF
 */
async function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = url;
  });
}

export interface PdfBrandingOptions {
  /** Organization name (top-left, next to logo) */
  organizationName?: string;
  /** Organization logo URL (top-left) */
  organizationLogoUrl?: string;
  /** Document hash for QR/DataMatrix verification */
  documentHash?: string;
  /** Template name for display */
  templateName?: string;
}

export interface BrandingAssets {
  docalLogoDataUrl: string;
  docalShieldDataUrl: string;
  /** DataMatrix 1: Creation timestamp + document ID */
  dmCreationDataUrl: string;
  /** DataMatrix 2: Completion timestamp (placeholder until signed) */
  dmCompletionDataUrl: string;
  orgLogoDataUrl: string;
  linearBarcodeDataUrl: string;
}

/**
 * Generate a linear barcode (Code128) as data URL
 */
async function generateLinearBarcodeDataUrl(data: string): Promise<string> {
  try {
    const bwipjs = await import("bwip-js");
    const canvas = document.createElement("canvas");
    bwipjs.toCanvas(canvas, {
      bcid: "code128",
      text: data,
      scale: 2,
      height: 8,
      includetext: true,
      textsize: 7,
      textxalign: "center",
      backgroundcolor: "ffffff",
      barcolor: "000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    // Fallback: generate a simple barcode-like pattern
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 40;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 300, 40);
    ctx.fillStyle = "#000000";
    // Draw barcode-like lines from data
    const hash = data.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    for (let i = 0; i < 60; i++) {
      const w = ((hash + i * 7) % 3) + 1;
      const x = i * 5;
      if ((hash + i * 11) % 2 === 0) {
        ctx.fillRect(x, 0, w, 30);
      }
    }
    // Text below
    ctx.font = "8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(data.slice(0, 30), 150, 38);
    return canvas.toDataURL("image/png");
  }
}

/**
 * Pre-load all branding assets (call once before generating PDF)
 */
export async function loadBrandingAssets(options: PdfBrandingOptions): Promise<BrandingAssets> {
  const docHash = options.documentHash || generateTempHash();
  const now = new Date();
  const creationTs = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const barcodeContent = `DOCAL-${docHash.slice(0, 20).toUpperCase()}`;

  // DataMatrix 1: Creation — document ID + creation timestamp + hour
  const dmCreation = `DOCAL|CRE|${docHash.slice(0, 12)}|${creationTs}|${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  // DataMatrix 2: Completion — placeholder until final signing
  const dmCompletion = `DOCAL|FIN|${docHash.slice(0, 12)}|PENDING|--:--`;

  const [docalLogoDataUrl, docalShieldDataUrl, dmCreationDataUrl, dmCompletionDataUrl, orgLogoDataUrl, linearBarcodeDataUrl] = await Promise.all([
    loadImageAsDataUrl("/docal-icon.png"),
    loadImageAsDataUrl("/docal-icon.png"),
    generateDataMatrixDataUrl(dmCreation),
    generateDataMatrixDataUrl(dmCompletion),
    options.organizationLogoUrl ? loadImageAsDataUrl(options.organizationLogoUrl) : Promise.resolve(""),
    generateLinearBarcodeDataUrl(barcodeContent),
  ]);

  return { docalLogoDataUrl, docalShieldDataUrl, dmCreationDataUrl, dmCompletionDataUrl, orgLogoDataUrl, linearBarcodeDataUrl };
}

export interface CreatorDetails {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

/**
 * Add organization header to a jsPDF page
 * Brussels-style: Left = logo + company details below, Right = barcodes
 */
export function addOrganizationHeader(
  doc: jsPDF,
  assets: BrandingAssets,
  orgName?: string,
  creator?: CreatorDetails,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const M = 15;
  const headerBottom = 28;

  // ── LEFT SIDE: Logo + Company details ──
  const logoSize = 16;
  if (assets.orgLogoDataUrl) {
    try {
      doc.addImage(assets.orgLogoDataUrl, "PNG", M, 6, logoSize, logoSize);
    } catch {
      drawInitialBox(doc, M, 6, logoSize, orgName);
    }
  } else {
    drawInitialBox(doc, M, 6, logoSize, orgName);
  }

  // Company name next to logo
  const textX = M + logoSize + 4;
  const displayName = creator?.name || orgName || "";

  if (displayName) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(displayName, textX, 12);
  }

  // Details below name
  let detailY = 16;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  if (creator?.address) {
    doc.text(creator.address, textX, detailY);
    detailY += 3;
  }
  if (creator?.phone) {
    doc.text(`Tel: ${creator.phone}`, textX, detailY);
    detailY += 3;
  }
  if (creator?.email) {
    doc.text(creator.email, textX, detailY);
  }

  // ── RIGHT SIDE: Two DataMatrix codes with labels ──
  const rightEdge = pageWidth - M;
  const codeSize = 10;
  const code1X = rightEdge - codeSize * 2 - 3;
  const code2X = rightEdge - codeSize;

  // DataMatrix 1: Creation timestamp
  if (assets.dmCreationDataUrl) {
    try {
      doc.addImage(assets.dmCreationDataUrl, "PNG", code1X, 6, codeSize, codeSize);
    } catch { /* skip */ }
  }
  doc.setFontSize(4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("Krijimi", code1X + codeSize / 2, 17.5, { align: "center" });

  // DataMatrix 2: Completion timestamp
  if (assets.dmCompletionDataUrl) {
    try {
      doc.addImage(assets.dmCompletionDataUrl, "PNG", code2X, 6, codeSize, codeSize);
    } catch { /* skip */ }
  }
  doc.text("Perfundimi", code2X + codeSize / 2, 17.5, { align: "center" });

  // Doc reference
  doc.setFontSize(4.5);
  doc.text("www.doc.al", rightEdge, 20.5, { align: "right" });

  // ── Separator line ──
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(M, headerBottom, pageWidth - M, headerBottom);
}

function drawInitialBox(doc: jsPDF, x: number, y: number, size: number, name?: string) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, size, size);
  const initial = (name || "?").charAt(0).toUpperCase();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(initial, x + size / 2, y + size / 2 + 2, { align: "center" });
}

/**
 * Format timestamp per eIDAS / ISO 8601 standard with timezone offset.
 * Example: 2026-03-13T14:07:19+01:00
 */
function formatEidasTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const Y = date.getFullYear();
  const M = pad(date.getMonth() + 1);
  const D = pad(date.getDate());
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offH = pad(Math.floor(Math.abs(offset) / 60));
  const offM = pad(Math.abs(offset) % 60);
  return `${Y}-${M}-${D}T${h}:${m}:${s}${sign}${offH}:${offM}`;
}

/**
 * Add DOC.al branded footer to a jsPDF page
 *
 * Layout (eIDAS-compliant):
 *   [QR 18×18]  [DataMatrix 18×18]  |  doc.al branding text  |  Page N / M
 *
 * QR and DataMatrix are same dimensions, side by side on the left.
 * Timestamp uses ISO 8601 with timezone offset per eIDAS standard.
 */
export function addBrandedFooter(
  doc: jsPDF,
  assets: BrandingAssets,
  pageNum: number,
  totalPages: number,
  docHash?: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = 265; // mm from top

  // Separator line
  doc.setDrawColor(212, 212, 216); // zinc-300
  doc.setLineWidth(0.3);
  doc.line(12, footerY, pageWidth - 12, footerY);

  const innerY = footerY + 3;
  const codeSize = 18; // Both QR and DataMatrix same size

  // DataMatrix 1: Creation (left)
  if (assets.dmCreationDataUrl) {
    try {
      doc.addImage(assets.dmCreationDataUrl, "PNG", 12, innerY, codeSize, codeSize);
    } catch {
      // skip
    }
  }

  // DataMatrix 2: Completion (next, same size)
  if (assets.dmCompletionDataUrl) {
    try {
      doc.addImage(assets.dmCompletionDataUrl, "PNG", 12 + codeSize + 3, innerY, codeSize, codeSize);
    } catch {
      // skip
    }
  }

  // Branding text block (centered between codes and page number)
  const textX = 12 + codeSize * 2 + 8; // after both codes

  // DOC.al D icon
  if (assets.docalLogoDataUrl) {
    try {
      doc.addImage(assets.docalLogoDataUrl, "PNG", textX, innerY, 7, 7);
    } catch {
      // skip
    }
  }

  // "doc.al" text
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text("doc.al", textX + 8, innerY + 5);

  // "Verified by DOC.al"
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text("Vulosur dixhitalisht nga DOC.al", textX, innerY + 10);

  // Timestamp — ISO 8601 with timezone offset (eIDAS standard)
  const now = new Date();
  doc.setFontSize(5);
  doc.setTextColor(161, 161, 170); // zinc-400
  doc.text(formatEidasTimestamp(now), textX, innerY + 14);

  // Hash
  const shortHash = (docHash || generateTempHash()).slice(0, 16);
  doc.setFontSize(4.5);
  doc.setTextColor(161, 161, 170);
  doc.text(shortHash, textX, innerY + 17.5);

  // Page number (right-aligned)
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(`Faqja ${pageNum} / ${totalPages}`, pageWidth - 12, innerY + 5, { align: "right" });
}

/**
 * Generate a temporary document hash
 */
function generateTempHash(): string {
  const chars = "abcdef0123456789";
  let hash = "";
  for (let i = 0; i < 32; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}
