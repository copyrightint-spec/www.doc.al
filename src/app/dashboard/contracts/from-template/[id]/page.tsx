"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  FileText,
  PenTool,
  Send,
  Download,
  CheckCircle,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentEditor } from "@/components/ui/document-editor";
import {
  loadBrandingAssets,
  addOrganizationHeader,
  addBrandedFooter,
  type BrandingAssets,
} from "@/lib/pdf-branding";

// -- Types --

interface SignerRole {
  id: string;
  name: string;
  color: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  fields: Array<{
    type: string;
    label: string;
    required: boolean;
    assignedTo?: string;
    options?: string[];
  }>;
  signerRoles: SignerRole[] | null;
  isPublic: boolean;
  usageCount: number;
  organization: { name: string; logo: string | null } | null;
  user: { name: string };
}

// -- HTML to PDF renderer --

interface PdfTextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  fontSize: number;
  color: [number, number, number];
  highlight: boolean;
}

interface PdfBlock {
  type: "paragraph" | "heading" | "list-item" | "blockquote" | "hr" | "table" | "image";
  align?: "left" | "center" | "right" | "justify";
  level?: number; // heading level or list nesting
  ordered?: boolean;
  listIndex?: number;
  segments: PdfTextSegment[];
  // For tables
  rows?: PdfTextSegment[][][]; // rows > cells > segments
  headerRow?: boolean;
}

function parseHtmlToBlocks(html: string): PdfBlock[] {
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

    // Headings
    if (/^h[1-3]$/.test(tag)) {
      const level = parseInt(tag[1]);
      const fontSize = level === 1 ? 18 : level === 2 ? 14 : 12;
      const segments = extractSegments(node, { bold: true, fontSize, color: [15, 23, 42] });
      blocks.push({ type: "heading", level, align: getAlign(node), segments });
      return;
    }

    // Paragraph
    if (tag === "p") {
      const segments = extractSegments(node);
      blocks.push({ type: "paragraph", align: getAlign(node), segments });
      return;
    }

    // Lists
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

    // Blockquote
    if (tag === "blockquote") {
      // Get inner paragraphs
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

    // Horizontal rule
    if (tag === "hr") {
      blocks.push({ type: "hr", segments: [] });
      return;
    }

    // Table
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

    // Recurse for divs and other containers
    for (const child of Array.from(node.children)) {
      processNode(child);
    }
  }

  for (const child of Array.from(doc.body.children)) {
    processNode(child);
  }

  return blocks;
}

function renderBlocksToPdf(
  doc: jsPDF,
  blocks: PdfBlock[],
  assets: BrandingAssets,
  orgName: string | undefined,
  templateName: string,
  category: string | null,
  signerRoles: SignerRole[],
) {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const M = 15;
  const W = pageWidth - 2 * M; // 180

  const C = {
    dark: [15, 23, 42] as [number, number, number],
    mid: [71, 85, 105] as [number, number, number],
    light: [148, 163, 184] as [number, number, number],
    border: [203, 213, 225] as [number, number, number],
    rowAlt: [248, 250, 252] as [number, number, number],
    headerBg: [241, 245, 249] as [number, number, number],
    accent: [11, 94, 215] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    highlight: [254, 240, 138] as [number, number, number],
  };

  let y = 0;

  const checkPageBreak = (needed: number): void => {
    if (y + needed > 255) {
      doc.addPage();
      addOrganizationHeader(doc, assets, orgName);
      y = 28;
    }
  };

  // Render a line of mixed-format segments
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

      // Word-wrap the text
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

  // ═══════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════
  addOrganizationHeader(doc, assets, orgName);

  // Title
  y = 26;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.dark);
  doc.text(templateName, pageWidth / 2, y, { align: "center" });

  y += 3;
  const titleW = doc.getTextWidth(templateName);
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.7);
  doc.line(pageWidth / 2 - titleW / 2, y, pageWidth / 2 + titleW / 2, y);

  // Category + Date
  y += 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.mid);
  if (category) {
    doc.text(`Kategoria: ${category}`, M, y);
  }
  doc.text(`Data: ${new Date().toLocaleDateString("sq-AL")}`, pageWidth - M, y, { align: "right" });

  y += 4;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(M, y, pageWidth - M, y);
  y += 8;

  // ═══════════════════════════════════════════
  // CONTENT BLOCKS
  // ═══════════════════════════════════════════
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const hSpace = block.level === 1 ? 10 : block.level === 2 ? 8 : 7;
        checkPageBreak(hSpace + 4);
        y += block.level === 1 ? 4 : 2;

        const fontSize = block.level === 1 ? 14 : block.level === 2 ? 12 : 10.5;
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);

        const fullText = block.segments.map(s => s.text).join("");
        if (block.align === "center") {
          doc.text(fullText, pageWidth / 2, y, { align: "center" });
        } else if (block.align === "right") {
          doc.text(fullText, pageWidth - M, y, { align: "right" });
        } else {
          doc.text(fullText, M, y);
        }
        y += hSpace - 2;
        break;
      }

      case "paragraph": {
        if (block.segments.length === 0 || (block.segments.length === 1 && !block.segments[0].text.trim())) {
          y += 3; // Empty paragraph = spacing
          break;
        }
        checkPageBreak(6);
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
        // Blue left bar
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

          // Row background
          if (isHeader) {
            doc.setFillColor(...C.headerBg);
            doc.rect(M, y, W, rowH, "F");
          } else if (ri % 2 === 0) {
            doc.setFillColor(...C.rowAlt);
            doc.rect(M, y, W, rowH, "F");
          }

          // Borders
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.15);
          doc.rect(M, y, W, rowH);

          // Cells
          for (let ci = 0; ci < numCols; ci++) {
            const cellX = M + ci * colW;
            if (ci > 0) doc.line(cellX, y, cellX, y + rowH);

            const cellSegs = row[ci] || [];
            const cellText = cellSegs.map(s => s.text).join("").trim();

            doc.setFontSize(isHeader ? 8 : 9);
            doc.setFont("helvetica", isHeader ? "bold" : "normal");
            doc.setTextColor(...(isHeader ? C.mid : C.dark));

            // Truncate
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

  // ═══════════════════════════════════════════
  // SIGNATURE SECTION
  // ═══════════════════════════════════════════
  if (signerRoles.length > 0) {
    y += 8;
    checkPageBreak(55);

    // Double line
    doc.setDrawColor(...C.dark);
    doc.setLineWidth(0.5);
    doc.line(M, y, pageWidth - M, y);
    doc.setLineWidth(0.15);
    doc.line(M, y + 1.5, pageWidth - M, y + 1.5);
    y += 8;

    // Title
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.dark);
    doc.text("NENSHKRIMET", pageWidth / 2, y, { align: "center" });
    y += 10;

    // Signature boxes
    const cols = Math.min(signerRoles.length, 3);
    const colW = (W - (cols - 1) * 8) / cols;
    const boxH = 22;

    for (let row = 0; row < Math.ceil(signerRoles.length / 3); row++) {
      if (row > 0) y += 8;
      checkPageBreak(boxH + 20);

      for (let col = 0; col < 3; col++) {
        const roleIdx = row * 3 + col;
        if (roleIdx >= signerRoles.length) break;
        const role = signerRoles[roleIdx];
        const x = M + col * (colW + 8);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...C.dark);
        doc.text(role.name, x, y);

        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.25);
        doc.setFillColor(...C.rowAlt);
        doc.rect(x, y + 2, colW, boxH, "FD");

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.light);
        doc.text("Nenshkrim", x + colW / 2, y + 2 + boxH - 2, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(...C.mid);
        doc.text("Data: ___/___/______", x, y + boxH + 7);
      }
      y += boxH + 12;
    }
  }

  // ═══════════════════════════════════════════
  // BRANDED FOOTER — All pages
  // ═══════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addBrandedFooter(doc, assets, p, totalPages);
  }
}

// -- Build initial HTML from template fields --

function buildInitialContent(template: Template): string {
  const parts: string[] = [];

  // Description as intro paragraph
  if (template.description) {
    parts.push(`<p>${template.description}</p>`);
  }

  // Build content from template fields
  const dataFields = template.fields.filter(f => ["text", "date", "dropdown"].includes(f.type));
  const checkboxFields = template.fields.filter(f => f.type === "checkbox");

  if (dataFields.length > 0) {
    // Table with fields
    let tableHtml = "<table><tr><th>Fusha</th><th>Vlera</th></tr>";
    for (const field of dataFields) {
      const placeholder = field.type === "date"
        ? new Date().toLocaleDateString("sq-AL")
        : field.type === "dropdown" && field.options?.length
          ? field.options[0]
          : `[${field.label}]`;
      tableHtml += `<tr><td><strong>${field.label}</strong></td><td>${placeholder}</td></tr>`;
    }
    tableHtml += "</table>";
    parts.push(tableHtml);
  }

  if (checkboxFields.length > 0) {
    parts.push("<p></p>");
    for (const field of checkboxFields) {
      parts.push(`<p>\u2610 ${field.label}</p>`);
    }
  }

  // If no fields, start with an empty document structure
  if (parts.length === 0) {
    parts.push(
      "<p>Shkruani permbajtjen e dokumentit tuaj ketu. Mund te formatoni tekstin, te shtoni tabela, lista, tituj dhe me shume.</p>",
      "<p></p>",
    );
  }

  return parts.join("");
}

// -- Component --

export default function FromTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brandingAssets, setBrandingAssets] = useState<BrandingAssets | null>(null);

  // Fetch template
  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${id}`);
      const data = await res.json();
      if (data.success) {
        setTemplate(data.data);

        // Build initial content from template
        const content = buildInitialContent(data.data);
        setInitialContent(content);
        setEditorContent(content);

        // Load branding
        const org = data.data.organization;
        loadBrandingAssets({
          organizationName: org?.name,
          organizationLogoUrl: org?.logo || undefined,
          templateName: data.data.name,
        }).then(setBrandingAssets);
      } else {
        setError(data.error || "Ndodhi nje gabim");
      }
    } catch {
      setError("Nuk mund te ngarkohet template");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // Generate PDF from editor content
  const generatePDF = async () => {
    if (!template) return;
    setGenerating(true);

    try {
      let assets = brandingAssets;
      if (!assets) {
        const org = template.organization;
        assets = await loadBrandingAssets({
          organizationName: org?.name,
          organizationLogoUrl: org?.logo || undefined,
          templateName: template.name,
        });
        setBrandingAssets(assets);
      }

      const pdfDoc = new jsPDF();
      const blocks = parseHtmlToBlocks(editorContent);

      renderBlocksToPdf(
        pdfDoc,
        blocks,
        assets,
        template.organization?.name,
        template.name,
        template.category,
        template.signerRoles ?? [],
      );

      setGeneratedPdf(pdfDoc);
      setShowModal(true);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Ndodhi nje gabim gjate gjenerimit te PDF");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPdf || !template) return;
    generatedPdf.save(`${template.name.replace(/\s+/g, "_")}.pdf`);
  };

  const selfSign = () => {
    if (!generatedPdf || !template) return;
    const pdfData = generatedPdf.output("datauristring");
    localStorage.setItem("docal_selfsign_pdf", pdfData);
    localStorage.setItem("docal_selfsign_name", template.name);
    router.push("/dashboard/contracts/self-sign");
  };

  const sendForSigning = async () => {
    if (!generatedPdf || !template) return;
    setUploading(true);
    try {
      const pdfBlob = generatedPdf.output("blob");
      const formData = new FormData();
      formData.append("file", pdfBlob, `${template.name.replace(/\s+/g, "_")}.pdf`);
      formData.append("title", template.name);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/documents?highlight=${data.data.id}`);
      } else {
        alert(data.error || "Ndodhi nje gabim gjate ngarkimit");
      }
    } catch {
      alert("Nuk mund te ngarkohej dokumenti");
    } finally {
      setUploading(false);
    }
  };

  // -- Render --

  if (loading) {
    return <PageSpinner />;
  }

  if (error || !template) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <EmptyState
          icon={AlertCircle}
          title="Template nuk u gjet"
          description={error || "Ky template nuk ekziston ose nuk keni akses"}
          action={
            <Button asChild>
              <Link href="/dashboard/contracts">
                <ArrowLeft className="h-4 w-4" />
                Kthehu
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="icon" asChild>
            <Link href="/dashboard/contracts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {template.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Editoni dokumentin si ne Word — formatoni tekst, shtoni tabela, lista dhe me shume
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {template.category && <Badge>{template.category}</Badge>}
          {template.signerRoles && template.signerRoles.length > 0 && (
            <Badge variant="info">
              {template.signerRoles.length} nenshkrues
            </Badge>
          )}
          <Button onClick={generatePDF} disabled={generating || !editorContent.trim()}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duke gjeneruar...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Gjenero PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Document Editor — Word-like */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Document header bar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{template.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {template.description || "Dokument pa pershkrim"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{new Date().toLocaleDateString("sq-AL")}</span>
            {template.organization?.name && (
              <>
                <span className="text-border">|</span>
                <span>{template.organization.name}</span>
              </>
            )}
          </div>
        </div>

        {/* The Editor */}
        <DocumentEditor
          content={initialContent}
          onChange={setEditorContent}
        />
      </div>

      {/* Signer Roles Info */}
      {template.signerRoles && template.signerRoles.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Nenshkruesit:
          </span>
          {template.signerRoles.map((role) => (
            <span
              key={role.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: role.color }}
              />
              {role.name}
            </span>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="mx-4 w-full max-w-md shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-7 w-7 text-green-500" strokeWidth={2} />
                </div>
                <h2 className="text-lg font-bold text-foreground">PDF u Gjenerua me Sukses!</h2>
                <p className="mt-1 text-sm text-muted-foreground">Zgjidhni cfare deshironi te beni me dokumentin</p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* Download */}
                <button
                  onClick={downloadPDF}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3.5 text-left transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <Download className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Shkarko PDF</p>
                    <p className="text-xs text-muted-foreground">Ruaj dokumentin ne kompjuterin tuaj</p>
                  </div>
                </button>

                {/* Self Sign */}
                <button
                  onClick={selfSign}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3.5 text-left transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                    <PenTool className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Nenshkruaj Vete</p>
                    <p className="text-xs text-muted-foreground">Nenshkruaj dokumentin me certifikaten tuaj</p>
                  </div>
                </button>

                {/* Send for Signing */}
                <button
                  onClick={sendForSigning}
                  disabled={uploading}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3.5 text-left transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    ) : (
                      <Send className="h-5 w-5 text-purple-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {uploading ? "Duke ngarkuar..." : "Dergo per Nenshkrim"}
                    </p>
                    <p className="text-xs text-muted-foreground">Ngarko dokumentin dhe dergo per nenshkrim</p>
                  </div>
                </button>
              </div>

              {/* Close */}
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="mt-4 w-full"
              >
                <X className="h-4 w-4" />
                Mbyll
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
