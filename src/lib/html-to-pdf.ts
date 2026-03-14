/**
 * Shared HTML-to-PDF rendering utilities
 *
 * Parses TipTap HTML into structured blocks, then renders them to jsPDF.
 * Used by both template-based contracts and the contract builder wizard.
 */

import jsPDF from "jspdf";
import {
  addOrganizationHeader,
  addBrandedFooter,
  type BrandingAssets,
  type CreatorDetails,
} from "@/lib/pdf-branding";

// ─── Types ───

export interface PdfTextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontSize: number;
  color: [number, number, number];
  highlight: boolean;
}

export interface PdfBlock {
  type: "paragraph" | "heading" | "list-item" | "blockquote" | "hr" | "table" | "image";
  align?: "left" | "center" | "right" | "justify";
  level?: number;
  ordered?: boolean;
  listIndex?: number;
  segments: PdfTextSegment[];
  rows?: PdfTextSegment[][][];
  headerRow?: boolean;
}

// ─── Color Palette — All text is pure black for print readability ───

const C = {
  dark: [0, 0, 0] as [number, number, number],
  mid: [0, 0, 0] as [number, number, number],
  light: [0, 0, 0] as [number, number, number],
  border: [0, 0, 0] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
  headerBg: [241, 245, 249] as [number, number, number],
  accent: [11, 94, 215] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  highlight: [254, 240, 138] as [number, number, number],
};

// ─── Parse HTML to Blocks ───

export function parseHtmlToBlocks(html: string): PdfBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const blocks: PdfBlock[] = [];

  function getAlign(el: Element): "left" | "center" | "right" | "justify" {
    const style = el.getAttribute("style") || "";
    if (style.includes("text-align: center")) return "center";
    if (style.includes("text-align: right")) return "right";
    if (style.includes("text-align: justify")) return "justify";
    return "left";
  }

  function extractSegments(node: Node, inherited: Partial<PdfTextSegment> = {}): PdfTextSegment[] {
    const segs: PdfTextSegment[] = [];

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || "";
        if (text) {
          segs.push({
            text,
            bold: inherited.bold || false,
            italic: inherited.italic || false,
            underline: inherited.underline || false,
            strike: inherited.strike || false,
            fontSize: inherited.fontSize || 10,
            color: inherited.color || [15, 23, 42],
            highlight: inherited.highlight || false,
          });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        const next = { ...inherited };

        if (tag === "strong" || tag === "b") next.bold = true;
        if (tag === "em" || tag === "i") next.italic = true;
        if (tag === "u") next.underline = true;
        if (tag === "s" || tag === "del") next.strike = true;
        if (tag === "mark") next.highlight = true;

        segs.push(...extractSegments(el, next));
      }
    }
    return segs;
  }

  function processNode(node: Element) {
    const tag = node.tagName.toLowerCase();

    if (/^h[1-3]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const fontSize = level === 1 ? 18 : level === 2 ? 14 : 12;
      const segments = extractSegments(node, { bold: true, fontSize, color: [15, 23, 42] });
      blocks.push({ type: "heading", level, align: getAlign(node), segments });
      return;
    }

    if (tag === "p") {
      const segments = extractSegments(node);
      blocks.push({ type: "paragraph", align: getAlign(node), segments });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = node.querySelectorAll(":scope > li");
      items.forEach((li, idx) => {
        const segments = extractSegments(li);
        blocks.push({
          type: "list-item",
          ordered: tag === "ol",
          listIndex: idx + 1,
          segments,
        });
      });
      return;
    }

    if (tag === "blockquote") {
      const children = node.querySelectorAll("p");
      if (children.length > 0) {
        children.forEach((p) => {
          const segments = extractSegments(p, { italic: true, color: [71, 85, 105] });
          blocks.push({ type: "blockquote", segments });
        });
      } else {
        const segments = extractSegments(node, { italic: true, color: [71, 85, 105] });
        blocks.push({ type: "blockquote", segments });
      }
      return;
    }

    if (tag === "hr") {
      blocks.push({ type: "hr", segments: [] });
      return;
    }

    if (tag === "table") {
      const rows: PdfTextSegment[][][] = [];
      let hasHeader = false;
      const trElements = node.querySelectorAll("tr");
      trElements.forEach((tr, rowIdx) => {
        const cells: PdfTextSegment[][] = [];
        const cellEls = tr.querySelectorAll("th, td");
        cellEls.forEach((cell) => {
          if (cell.tagName.toLowerCase() === "th" && rowIdx === 0) hasHeader = true;
          cells.push(extractSegments(cell));
        });
        rows.push(cells);
      });
      blocks.push({ type: "table", segments: [], rows, headerRow: hasHeader });
      return;
    }

    for (const child of Array.from(node.children)) {
      processNode(child);
    }
  }

  for (const child of Array.from(doc.body.children)) {
    processNode(child);
  }

  return blocks;
}

// ─── Render Blocks to PDF ───

export interface RenderPdfOptions {
  doc: jsPDF;
  blocks: PdfBlock[];
  assets: BrandingAssets;
  orgName?: string;
  title: string;
  subtitle?: string;
  /** Creator/company details for the header */
  creator?: CreatorDetails;
  /** Signature blocks at the end, each with name and role */
  signers?: Array<{ name: string; role: string }>;
  /** When true, adds a red "DRAFT" watermark across every page */
  isDraft?: boolean;
}

export function renderBlocksToPdf(opts: RenderPdfOptions) {
  const { doc, blocks, assets, orgName, title, subtitle, creator, signers, isDraft } = opts;
  const pageWidth = doc.internal.pageSize.getWidth();
  const M = 15;
  const W = pageWidth - 2 * M;

  let y = 0;

  const checkPageBreak = (needed: number): void => {
    if (y + needed > 255) {
      doc.addPage();
      addOrganizationHeader(doc, assets, orgName, creator);
      y = 32; // below header separator (at 28) + margin
    }
  };

  const renderSegments = (
    segs: PdfTextSegment[],
    startX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number = 5,
  ): number => {
    let cx = startX;
    let cy = startY;

    for (const seg of segs) {
      const fontStyle = (seg.bold && seg.italic) ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(seg.fontSize);
      doc.setTextColor(...seg.color);

      const words = seg.text.split(/(\s+)/);
      for (const word of words) {
        const wordWidth = doc.getTextWidth(word);
        if (cx + wordWidth > startX + maxWidth && cx > startX) {
          cx = startX;
          cy += lineHeight;
          checkPageBreak(lineHeight);
        }

        if (seg.highlight) {
          doc.setFillColor(...C.highlight);
          doc.rect(cx, cy - lineHeight + 1.5, wordWidth, lineHeight, "F");
        }

        doc.text(word, cx, cy);

        if (seg.underline) {
          doc.setDrawColor(...seg.color);
          doc.setLineWidth(0.15);
          doc.line(cx, cy + 0.5, cx + wordWidth, cy + 0.5);
        }
        if (seg.strike) {
          doc.setDrawColor(...seg.color);
          doc.setLineWidth(0.15);
          doc.line(cx, cy - 1.2, cx + wordWidth, cy - 1.2);
        }

        cx += wordWidth;
      }
    }
    return cy;
  };

  // ═══ HEADER ═══
  addOrganizationHeader(doc, assets, orgName, creator);

  // ═══ LINEAR BARCODE — First page only ═══
  y = 31;
  if (assets.linearBarcodeDataUrl) {
    try {
      doc.addImage(assets.linearBarcodeDataUrl, "PNG", M, y, pageWidth - 2 * M, 10);
      y += 13;
    } catch {
      y += 2;
    }
  }

  // ═══ TITLE ═══
  y += 8; // extra gap below barcode
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.dark);
  doc.text(title, pageWidth / 2, y, { align: "center" });

  y += 3;
  const titleW = doc.getTextWidth(title);
  doc.setDrawColor(...C.dark); // black underline, not blue
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - titleW / 2, y, pageWidth / 2 + titleW / 2, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.dark);
  if (subtitle) {
    doc.text(subtitle, M, y);
  }
  doc.text(`Data: ${new Date().toLocaleDateString("sq-AL")}`, pageWidth - M, y, { align: "right" });

  y += 8;

  // ═══ CONTENT BLOCKS ═══
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        // Centered h2 = top-level section titles (PALET, BAZA LIGJORE, KUSHTET, DEKLARATE)
        // Left-aligned h2 = internal section titles from suggestedTerms (smaller)
        // Centered h3 = NENI articles (big, centered)
        // Left-aligned h3 = internal sub-articles from suggestedTerms (smaller)
        const isCentered = block.align === "center";
        const isTopSection = block.level === 2 && isCentered;
        const isInternalSection = block.level === 2 && !isCentered;
        const isNeni = block.level === 3 && isCentered;
        const isSubArticle = block.level === 3 && !isCentered;

        let hSpace: number;
        let topGap: number;
        let fontSize: number;

        if (block.level === 1) {
          hSpace = 10; topGap = 4; fontSize = 14;
        } else if (isTopSection) {
          hSpace = 10; topGap = 5; fontSize = 13;
        } else if (isNeni) {
          hSpace = 9; topGap = 6; fontSize = 11.5;
        } else if (isInternalSection) {
          hSpace = 8; topGap = 4; fontSize = 11;
        } else if (isSubArticle) {
          hSpace = 6; topGap = 3; fontSize = 10;
        } else {
          hSpace = 7; topGap = 2; fontSize = 10.5;
        }

        checkPageBreak(hSpace + 6);
        y += topGap;

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);

        const fullText = block.segments.map(s => s.text).join("");
        if (isCentered) {
          doc.text(fullText, pageWidth / 2, y, { align: "center" });
        } else if (block.align === "right") {
          doc.text(fullText, pageWidth - M, y, { align: "right" });
        } else {
          doc.text(fullText, M, y);
        }

        // Underline centered section headers (h2) for visual weight
        if (isTopSection) {
          const tw = doc.getTextWidth(fullText);
          doc.setDrawColor(...C.dark);
          doc.setLineWidth(0.3);
          doc.line(pageWidth / 2 - tw / 2, y + 1.5, pageWidth / 2 + tw / 2, y + 1.5);
          y += hSpace;
        } else {
          y += hSpace - 2;
        }
        break;
      }

      case "paragraph": {
        if (block.segments.length === 0 || (block.segments.length === 1 && !block.segments[0].text.trim())) {
          y += 3;
          break;
        }
        checkPageBreak(6);

        // Centered paragraphs: render as single line centered on page
        if (block.align === "center") {
          const fullText = block.segments.map(s => s.text).join("");
          const seg0 = block.segments[0];
          const fontStyle = (seg0.bold && seg0.italic) ? "bolditalic" : seg0.bold ? "bold" : seg0.italic ? "italic" : "normal";
          doc.setFont("helvetica", fontStyle);
          doc.setFontSize(seg0.fontSize || 10);
          doc.setTextColor(...(seg0.color || C.dark));
          doc.text(fullText, pageWidth / 2, y, { align: "center" });
          y += 5;
          break;
        }

        const endY = renderSegments(block.segments, M, y, W, 5);
        y = endY + 5;
        break;
      }

      case "list-item": {
        checkPageBreak(6);
        const bullet = block.ordered ? `${block.listIndex}.` : "\u2022";
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...C.dark);
        doc.text(bullet, M + 2, y);
        const endY = renderSegments(block.segments, M + 8, y, W - 8, 5);
        y = endY + 4;
        break;
      }

      case "blockquote": {
        checkPageBreak(8);
        doc.setDrawColor(...C.accent);
        doc.setLineWidth(0.8);
        doc.line(M, y - 3, M, y + 4);
        const endY = renderSegments(block.segments, M + 5, y, W - 5, 5);
        y = endY + 6;
        break;
      }

      case "hr": {
        checkPageBreak(6);
        y += 2;
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        doc.line(M, y, pageWidth - M, y);
        y += 6;
        break;
      }

      case "table": {
        if (!block.rows || block.rows.length === 0) break;
        const numCols = Math.max(...block.rows.map(r => r.length));
        const colW = W / numCols;
        const rowH = 8;

        checkPageBreak(rowH * Math.min(block.rows.length, 3) + 4);

        for (let ri = 0; ri < block.rows.length; ri++) {
          checkPageBreak(rowH);
          const row = block.rows[ri];
          const isHeader = ri === 0 && block.headerRow;

          if (isHeader) {
            doc.setFillColor(...C.headerBg);
            doc.rect(M, y, W, rowH, "F");
          } else if (ri % 2 === 0) {
            doc.setFillColor(...C.rowAlt);
            doc.rect(M, y, W, rowH, "F");
          }

          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.15);
          doc.rect(M, y, W, rowH);

          for (let ci = 0; ci < numCols; ci++) {
            const cellX = M + ci * colW;
            if (ci > 0) doc.line(cellX, y, cellX, y + rowH);

            const cellSegs = row[ci] || [];
            const cellText = cellSegs.map(s => s.text).join("").trim();

            doc.setFontSize(isHeader ? 8 : 9);
            doc.setFont("helvetica", isHeader ? "bold" : "normal");
            doc.setTextColor(...(isHeader ? C.mid : C.dark));

            let display = cellText || "\u2014";
            const maxCellW = colW - 4;
            while (doc.getTextWidth(display) > maxCellW && display.length > 3) {
              display = display.slice(0, -4) + "...";
            }
            doc.text(display, cellX + 2, y + 5.5);
          }
          y += rowH;
        }
        y += 4;
        break;
      }

      default:
        break;
    }
  }

  // ═══ KUSHTET E NENSHKRIMIT ELEKTRONIK — non-editable, always present ═══
  y = renderSigningTerms(doc, y, M, W, pageWidth, assets, orgName, creator);

  // ═══ SIGNATURE SECTION ═══
  if (signers && signers.length > 0) {
    const cols = Math.min(signers.length, 3);
    const rows = Math.ceil(signers.length / 3);
    const boxH = 20;
    const sigSectionH = 14 + rows * (boxH + 16);

    // Only break if truly not enough room
    if (y + sigSectionH > 250) {
      y += 4;
      checkPageBreak(sigSectionH);
    } else {
      y += 6;
    }

    doc.setDrawColor(...C.dark);
    doc.setLineWidth(0.5);
    doc.line(M, y, pageWidth - M, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    doc.text("NENSHKRIMET", pageWidth / 2, y, { align: "center" });

    // eIDAS reference line
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.dark);
    doc.text("Nenshkrim elektronik sipas eIDAS (BE) Nr. 910/2014", pageWidth / 2, y + 4, { align: "center" });
    y += 10;

    const colW = (W - (cols - 1) * 8) / cols;

    for (let row = 0; row < rows; row++) {
      if (row > 0) y += 6;
      checkPageBreak(boxH + 16);

      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        if (idx >= signers.length) break;
        const signer = signers[idx];
        const x = M + col * (colW + 8);

        // Role label
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.dark);
        doc.text(signer.role.toUpperCase(), x, y);

        // Name
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(signer.name, x, y + 5);

        // Signature box — dashed border, no fill
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.3);
        // Draw dashed rectangle manually
        const bx = x, by = y + 7, bw = colW, bh = boxH;
        const dash = 2, gap = 1.5;
        // Top
        for (let dx = 0; dx < bw; dx += dash + gap) {
          doc.line(bx + dx, by, bx + Math.min(dx + dash, bw), by);
        }
        // Bottom
        for (let dx = 0; dx < bw; dx += dash + gap) {
          doc.line(bx + dx, by + bh, bx + Math.min(dx + dash, bw), by + bh);
        }
        // Left
        for (let dy = 0; dy < bh; dy += dash + gap) {
          doc.line(bx, by + dy, bx, by + Math.min(dy + dash, bh));
        }
        // Right
        for (let dy = 0; dy < bh; dy += dash + gap) {
          doc.line(bx + bw, by + dy, bx + bw, by + Math.min(dy + dash, bh));
        }

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.dark);
        doc.text("Nenshkrim", x + colW / 2, y + 7 + boxH - 2, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(...C.dark);
        doc.text("Data: ___/___/______", x, y + boxH + 11);
      }
      y += boxH + 14;
    }
  }

  // ═══ VERIFICATION & INTEGRITY DECLARATION BOX ═══
  y = renderVerificationBox(doc, y, M, W, pageWidth, assets, orgName, creator);

  // ═══ BRANDED FOOTER & DRAFT WATERMARK — All pages ═══
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addBrandedFooter(doc, assets, p, totalPages);

    // Red DRAFT watermark on every page
    if (isDraft) {
      doc.saveGraphicsState();
      // @ts-expect-error — jsPDF internal GState for opacity
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.setTextColor(220, 38, 38); // red-600
      doc.setFontSize(90);
      doc.setFont("helvetica", "bold");
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      doc.text("DRAFT", pw / 2, ph / 2, {
        align: "center",
        angle: 45,
      });
      doc.restoreGraphicsState();
    }
  }
}

// ─── Electronic Signing Terms (non-editable, rendered directly in PDF) ───

function renderSigningTerms(
  doc: jsPDF,
  startY: number,
  M: number,
  W: number,
  pageWidth: number,
  assets: BrandingAssets,
  orgName?: string,
  creator?: CreatorDetails,
): number {
  let y = startY;
  const fontSize = 8;
  const lineH = 4;
  const termFontSize = 7.5;

  const checkBreak = (needed: number) => {
    if (y + needed > 255) {
      doc.addPage();
      addOrganizationHeader(doc, assets, orgName, creator);
      y = 32;
    }
  };

  // Separator
  y += 4;
  checkBreak(60);
  doc.setDrawColor(...C.dark);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageWidth - M, y);
  y += 6;

  // Section title
  doc.setFontSize(fontSize + 1);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.dark);
  doc.text("KUSHTET E NENSHKRIMIT ELEKTRONIK", pageWidth / 2, y, { align: "center" });
  y += 6;

  // Intro
  doc.setFontSize(termFontSize);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.dark);
  const introLines: string[] = doc.splitTextToSize(
    "Duke nenshkruar elektronikisht kete dokument, secila pale deklaron dhe pranon sa me poshte:",
    W,
  );
  for (const line of introLines) {
    checkBreak(lineH);
    doc.text(line, M, y);
    y += lineH;
  }
  y += 1;

  // Terms — compact numbered list
  const terms = [
    "Secili nenshkrues eshte identifikuar dhe verifikuar me sukses permes procesit KYC (Know Your Customer) te platformes DOC.al. Statusi i verifikimit eshte \"I VERIFIKUAR\" (VERIFIED).",
    "Nenshkrimi elektronik i vendosur ne kete dokument ka te njejten vlere juridike si nenshkrimi doreskrimi, ne perputhje me Ligjin Nr. 9880/2008 \"Per Nenshkrimin Elektronik\" (Neni 6), Ligjin Nr. 107/2015 dhe Rregulloren (BE) Nr. 910/2014 (eIDAS), Nenet 25, 26 dhe 28.",
    "Secila pale ka lexuar, kuptuar dhe pranuar te gjitha kushtet e kesaj marreveshje ne teresi.",
    "Pas nenshkrimit, secila pale do te marre nje kopje dixhitale te dokumentit te nenshkruar ne adresen e emailit te regjistruar.",
    "Kjo marreveshje quhet e lidhur dhe pranohet nga te gjitha palet njesoj si e nenshkruar me dore.",
    "Integriteti i dokumentit garantohet permes hash-it kriptografik SHA-256 dhe regjistrohet ne Bitcoin Blockchain (proof-of-existence). Verifikimi: www.doc.al/verify.",
  ];

  doc.setFontSize(termFontSize);
  for (let i = 0; i < terms.length; i++) {
    const numbered = `${i + 1}. ${terms[i]}`;
    const lines: string[] = doc.splitTextToSize(numbered, W - 5);
    for (let li = 0; li < lines.length; li++) {
      checkBreak(lineH);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...C.dark);
      doc.text(lines[li], M + 3, y);
      y += lineH;
    }
    y += 0.5;
  }

  return y;
}

// ─── Verification & Integrity Declaration ───

function renderVerificationBox(
  doc: jsPDF,
  _startY: number,
  M: number,
  W: number,
  pageWidth: number,
  assets: BrandingAssets,
  orgName?: string,
  creator?: CreatorDetails,
): number {
  // Dense, compressed wall-of-text style — like a license agreement / terms of service
  const fontSize = 3.5;       // tiny font
  const lineH = 1.7;          // ultra-tight line spacing
  const titleFontSize = 4.5;
  const footerLimit = 255;

  // Start on a fresh page
  doc.addPage();
  addOrganizationHeader(doc, assets, orgName, creator);
  let cy = 32;

  const ensureSpace = (needed: number) => {
    if (cy + needed > footerLimit) {
      doc.addPage();
      addOrganizationHeader(doc, assets, orgName, creator);
      cy = 32;
    }
  };

  // Render dense wrapped text — no extra spacing, just continuous flow
  const renderDense = (text: string, bold = false): void => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(50, 50, 50);
    const lines: string[] = doc.splitTextToSize(text, W);
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, M, cy);
      cy += lineH;
    }
  };

  // ═══ TITLE ═══
  doc.setFontSize(titleFontSize);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(
    "INFORMACION MBI INTEGRITETIN E NENSHKRIMIT ELEKTRONIK",
    pageWidth / 2, cy, { align: "center" },
  );
  cy += 2;
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.1);
  const tw = doc.getTextWidth("INFORMACION MBI INTEGRITETIN E NENSHKRIMIT ELEKTRONIK");
  doc.line(pageWidth / 2 - tw / 2, cy, pageWidth / 2 + tw / 2, cy);
  cy += 2;

  // ═══ ALL TEXT AS ONE MASSIVE DENSE BLOCK ═══
  // Each "paragraph" flows directly into the next with zero spacing

  renderDense(
    "Ky dokument eshte nenshkruar ne menyre elektronike permes nje sistemi te sigurt autentifikimi dhe verifikimi shume-nivelesh, " +
    "i cili garanton identifikimin e nenshkruesit, integritetin e dokumentit dhe gjurmueshmerine e plote te procesit te nenshkrimit (audit trail). " +
    "Sistemi perdor mekanizmat e meposhtme te identifikimit dhe autentifikimit: (i) verifikimin e identitetit te nenshkruesit permes procesit KYC " +
    "(Know Your Customer), duke perfshire te dhenat personale, dokumentin e identifikimit (karte ID, pasaporte ose patente) dhe selfie me dokumentin; " +
    "(ii) aprovimin e verifikimit KYC nga operatori i autorizuar i sistemit DOC.al, ku pa statusin \"VERIFIED\" nenshkruesi nuk lejohet te vendose " +
    "nenshkrimin elektronik; (iii) dergimin e dokumentit per nenshkrim ne adresen e emailit te deklaruar dhe te verifikuar te nenshkruesit; " +
    "(iv) verifikimin e adreses se emailit dhe konfirmimin e hapjes se mesazhit elektronik; (v) regjistrimin e aksesit dhe klikimit te dokumentit " +
    "permes log-eve te sistemit; (vi) autentifikimin permes kodit te verifikimit te derguar ne email (OTP — One-Time Password); " +
    "(vii) autentifikimin shtese permes verifikimit me dy faktore (2FA) per konfirmimin perfundimtar te nenshkrimit; " +
    "(viii) gjenerimin dhe dergimin automatik te dokumentit final te nenshkruar ne format PDF tek palet nenshkruese permes emailit. " +
    "I gjithe procesi i verifikimit KYC kryhet ne menyre elektronike/dixhitale permes platformes DOC.al.",
  );

  renderDense(
    "Te dhenat teknike te verifikimit dhe proves digjitale perfshijne: adresen IP te nenshkruesit ne momentin e aksesimit dhe nenshkrimit te dokumentit; " +
    "regjistrimet e plota te log-eve te sistemit (audit logs) per cdo veprim gjate procesit te nenshkrimit; informacion mbi pajisjen dhe mjedisin e aksesit " +
    "(device fingerprint, browser information, OS, screen resolution); timestamp te sakte te cdo veprimi te kryer gjate procesit te nenshkrimit " +
    "(ISO 8601 me timezone offset sipas RFC 3339); hash kriptografik te dokumentit (SHA-256), i cili garanton integritetin dhe pandryshueshmarine e " +
    "permbajtjes se dokumentit; geolokalizimin e perbashket (nese eshte dhene pelqimi) per verifikimin e vendndodhjes se nenshkruesit.",
  );

  renderDense(
    "Per te siguruar provueshmeri te shtuar dhe verifikim te pavarur te ekzistences se dokumentit, sistemi perdor nje mekanizem te dyfishte timestamp-i: " +
    "(a) timestamp nga serveri i sistemit (server-side timestamp), i regjistruar ne momentin e nenshkrimit, i sinkronizuar me NTP (Network Time Protocol); " +
    "(b) timestamp publik ne Bitcoin Blockchain, ku hash-i SHA-256 i dokumentit regjistrohet ne nje transaksion blockchain, duke krijuar nje prove te " +
    "pandryshueshme dhe publikisht te verifikueshme te ekzistences dhe integritetit te dokumentit ne momentin e nenshkrimit. Blockchain sherben si prove " +
    "e pavarur e ekzistences se dokumentit (proof-of-existence), e verifikueshme nga kushdo ne menyre publike.",
  );

  renderDense(
    "Ky mekanizem krijon nje gjurme te plote auditimi dhe prove te forte digjitale te identifikimit te nenshkruesit, integritetit te dokumentit " +
    "dhe momentit te nenshkrimit, duke e bere dokumentin teknikisht te verifikueshem dhe te mbrojtur nga cdo ndryshim i mevonshem. " +
    "Gjurma e auditimit perfshin: krijimin e dokumentit, dergimin e fteses per nenshkrim, hapjen e dokumentit, pranimin e kushteve, " +
    "vendosjen e nenshkrimit, gjenerimin e hash-it, regjistrimin ne blockchain dhe dergimin e kopjes perfundimtare.",
  );

  // Dense legal references — all in one continuous paragraph
  renderDense(
    "Baza ligjore dhe perputhshmeria nderkombetare: Rregullorja (BE) Nr. 910/2014 (eIDAS) — identifikimi elektronik dhe sherbimet e besuara per " +
    "transaksionet elektronike ne tregun e brendshem europian; Rregullorja (BE) Nr. 910/2014, nenet 25-34 — efektet juridike te nenshkrimeve elektronike, " +
    "nenshkrimeve te avancuara dhe te kualifikuara; Ligji Nr. 9880, date 25.02.2008 \"Per Nenshkrimin Elektronik\" — Republika e Shqiperise; " +
    "Ligji Nr. 107/2015 \"Per Identifikimin Elektronik dhe Sherbimet e Besuara\" — Republika e Shqiperise; Ligji Nr. 9887, date 10.03.2008 " +
    "\"Per Mbrojtjen e te Dhenave Personale\" (i ndryshuar) — Republika e Shqiperise; " +
    "ETSI EN 319 401 — kerkesa te pergjithshme per ofruesit e sherbimeve te besuara (Trust Service Providers); " +
    "ETSI EN 319 411-1/2 — politika dhe kerkesa per ofruesit e certifikatave elektronike; " +
    "ETSI EN 319 421 — politika dhe kerkesa te sigurise per ofruesit e sherbimit te timestamp-it (reference per standardin e aplikueshem); " +
    "ETSI EN 319 122-1/2 — CAdES: nenshkrime elektronike te avancuara ne format CMS; " +
    "ETSI EN 319 132-1/2 — XAdES: nenshkrime elektronike te avancuara ne format XML; " +
    "ETSI EN 319 142-1/2 — PAdES: nenshkrime elektronike te avancuara ne format PDF (sipas ISO 32000); " +
    "ETSI TS 119 182 — JAdES: nenshkrime elektronike ne format JSON (JSON Advanced Electronic Signatures); " +
    "ISO/IEC 27001:2022 — sistemi i menaxhimit te sigurise se informacionit (ISMS); " +
    "ISO/IEC 27017:2015 — kontrolle sigurie per sherbimet cloud; " +
    "ISO/IEC 27018:2019 — mbrojtja e te dhenave personale ne cloud publik; " +
    "ISO 14533-1/2 — profilet e nenshkrimeve elektronike te avancuara per formatet CMS dhe XML; " +
    "RFC 3161 — protokolli i Internet-it per Timestamp (TSP — Time-Stamp Protocol); " +
    "RFC 5652 — sintaksa e mesazheve kriptografike (CMS — Cryptographic Message Syntax); " +
    "RFC 6749 — kuadri i autorizimit OAuth 2.0; RFC 7519 — JSON Web Token (JWT) per autentifikim te sigurt; " +
    "Rregullorja (BE) 2016/679 (GDPR) — mbrojtja e te dhenave personale dhe privatesia; " +
    "Direktiva (BE) 2019/1937 — mbrojtja e personave qe raportojne shkelje (Whistleblower Protection); " +
    "Konventa e Hages mbi Apostilen (1961) — njohja nderkombetare e dokumenteve publike; " +
    "Ligji Model UNCITRAL per Nenshkrimet Elektronike (2001) — kuadri nderkombetar per nenshkrimet elektronike.",
  );

  // Dense security levels — continuous text
  renderDense(
    "Nivelet e sigurise se nenshkrimit elektronik sipas eIDAS (Nenet 25-34): Nenshkrim i Thjeshte Elektronik (SES) — Neni 25(1) eIDAS: " +
    "te dhena ne forme elektronike qe perdoren per te nenshkruar, identifikim bazik permes emailit dhe pranimit te kushteve, nuk mund te refuzohet " +
    "si prove vetem per faktin se eshte ne forme elektronike; Nenshkrim i Avancuar Elektronik (AES/AdES) — Neni 26 eIDAS: lidhje unike me " +
    "nenshkruesin, identifikim i nenshkruesit, kontroll ekskluziv i nenshkruesit mbi te dhenat, zbulim i cdo ndryshimi te mevonshem te te dhenave, " +
    "kerkon mjete te certifikuara te krijimit te nenshkrimit; Nenshkrim i Kualifikuar Elektronik (QES) — Neni 28 eIDAS: niveli me i larte, " +
    "i barabarte juridikisht me nenshkrimin doreskrimi ne te gjitha vendet anetare te BE-se, kerkon certifikate te kualifikuar nga TSP i akredituar " +
    "dhe pajisje te sigurt te krijimit te nenshkrimit (QSCD — Qualified Signature Creation Device).",
  );

  // Final dense closing
  renderDense(
    "DOC.al operon si ofrues i sherbimeve te besuara (Trust Service Provider) dhe zbaton masat me te larta teknike dhe organizative per te garantuar " +
    "sigurine, integritetin dhe konfidencialitetin e procesit te nenshkrimit elektronik, ne perputhje te plote me kuadrin ligjor kombetar dhe " +
    "nderkombetar. Per verifikimin e pavarshem te ketij dokumenti, skanoni kodin QR/DataMatrix ose vizitoni www.doc.al/verify.",
    true,
  );

  cy += 1.5;
  doc.setFontSize(3.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Gjeneruar automatikisht nga sistemi DOC.al | ${new Date().toISOString()} | v1.0`,
    pageWidth / 2, cy, { align: "center" },
  );

  return cy;
}
