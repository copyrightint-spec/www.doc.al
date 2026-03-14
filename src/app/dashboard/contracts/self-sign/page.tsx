"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { PDFDocument, rgb } from "pdf-lib";
import {
  ChevronLeft,
  Upload,
  FileText,
  Check,
  Download,
  PenTool,
  Move,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

// Dynamic import of react-pdf to avoid SSR issues (DOMMatrix, canvas)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ReactPDF: { Document: any; Page: any; pdfjs: any } | null = null;

// -- Types --
interface SignaturePlacement {
  pageIndex: number;
  xPct: number;
  yPct: number;
}

interface UserSignatureConfig {
  style: "text" | "draw" | "image";
  drawData?: string;
  imageData?: string;
  textFont?: string;
  name: string;
  title?: string;
}

interface SignatureOption {
  id: string;
  label: string;
  dataUrl: string | null;
  type: "text" | "draw" | "image" | "new-draw";
}

const FONTS = [
  { value: "cursive", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { value: "serif", css: "'Times New Roman', 'Georgia', serif" },
  { value: "sans", css: "'Arial', 'Helvetica', sans-serif" },
  { value: "mono", css: "'Courier New', 'Consolas', monospace" },
];

const PDF_RENDER_WIDTH = 650;

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

// -- Helper: generate text signature as transparent PNG --
function generateTextSignatureDataUrl(name: string, fontValue: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 500;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, 500, 140);
  const fontCss = FONTS.find((f) => f.value === fontValue)?.css || FONTS[0].css;
  ctx.font = `36px ${fontCss}`;
  ctx.fillStyle = "#1a1a2e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 250, 70);
  return canvas.toDataURL("image/png");
}

// -- Main Component --
export default function SelfSignPage() {
  // React-PDF lazy load state
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    import("react-pdf").then((mod) => {
      // @ts-expect-error CSS imports for react-pdf
      import("react-pdf/dist/Page/AnnotationLayer.css");
      // @ts-expect-error CSS imports for react-pdf
      import("react-pdf/dist/Page/TextLayer.css");
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
      ReactPDF = { Document: mod.Document, Page: mod.Page, pdfjs: mod.pdfjs };
      setPdfReady(true);
    });
  }, []);

  // Phase: upload -> sign -> done
  const [phase, setPhase] = useState<"upload" | "sign" | "done">("upload");

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User's configured signatures
  const [, setUserConfig] = useState<UserSignatureConfig | null>(null);
  const [signatureOptions, setSignatureOptions] = useState<SignatureOption[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Signature placement
  const [placement, setPlacement] = useState<SignaturePlacement | null>(null);
  const [sigWidthPct, setSigWidthPct] = useState(25);
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, origXPct: 0, origYPct: 0, pageWidth: 0, pageHeight: 0 });

  // Draw new signature
  const [showDrawPanel, setShowDrawPanel] = useState(false);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastDrawPosRef = useRef({ x: 0, y: 0 });

  // Final state
  const [processing, setProcessing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedFileName, setSignedFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // -- Load user's configured signatures --
  useEffect(() => {
    fetch("/api/settings/signature")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success || !data.data) return;
        const d = data.data;
        const config: UserSignatureConfig = {
          style: d.signatureStyle || "text",
          drawData: d.signatureData?.draw,
          imageData: d.signatureData?.image,
          textFont: d.signatureData?.text?.font || "cursive",
          name: d.name || "",
          title: d.signatureTitle || "",
        };
        setUserConfig(config);

        const opts: SignatureOption[] = [];
        if (config.name) {
          const dataUrl = generateTextSignatureDataUrl(config.name, config.textFont || "cursive");
          opts.push({ id: "text", label: "Tekst", dataUrl, type: "text" });
        }
        if (config.drawData) {
          opts.push({ id: "draw", label: "Vizatim i ruajtur", dataUrl: config.drawData, type: "draw" });
        }
        if (config.imageData) {
          opts.push({ id: "image", label: "Imazh / Logo", dataUrl: config.imageData, type: "image" });
        }

        setSignatureOptions(opts);

        const preferred = opts.find((o) => o.type === config.style);
        if (preferred) {
          setActiveSignatureId(preferred.id);
          setSignatureDataUrl(preferred.dataUrl);
        } else if (opts.length > 0) {
          setActiveSignatureId(opts[0].id);
          setSignatureDataUrl(opts[0].dataUrl);
        }
      })
      .catch(() => {});
  }, []);

  // -- File handling --
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Ju lutem ngarkoni vetem skedare PDF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Skedari eshte shume i madh. Maksimumi eshte 50 MB.");
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      await PDFDocument.load(bytes);

      setPdfFile(file);
      setPdfBytes(bytes);
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
      setPhase("sign");
    } catch {
      setError("Skedari PDF eshte i korruptuar ose nuk mund te hapet.");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // -- Signature selection --
  const selectSignature = (opt: SignatureOption) => {
    setActiveSignatureId(opt.id);
    setSignatureDataUrl(opt.dataUrl);
    setShowDrawPanel(false);
  };

  // -- Draw canvas for new signature --
  useEffect(() => {
    if (!showDrawPanel || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 120);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [showDrawPanel]);

  const getDrawPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startNewDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const pos = getDrawPos(e);
    lastDrawPosRef.current = pos;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const continueNewDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getDrawPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastDrawPosRef.current = pos;
  };

  const endNewDraw = () => { isDrawingRef.current = false; };

  const clearNewDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const confirmNewDraw = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const newOpt: SignatureOption = { id: "new-draw", label: "Vizatim i ri", dataUrl, type: "new-draw" };
    setSignatureOptions((prev) => [...prev.filter((o) => o.id !== "new-draw"), newOpt]);
    setActiveSignatureId("new-draw");
    setSignatureDataUrl(dataUrl);
    setShowDrawPanel(false);
  };

  // -- Signature placement on PDF pages --
  const handlePageClick = (pageIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSig || !signatureDataUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    setPlacement({
      pageIndex,
      xPct: Math.max(0, Math.min(100 - sigWidthPct, xPct - sigWidthPct / 2)),
      yPct: Math.max(0, Math.min(90, yPct - 5)),
    });
  };

  // Signature dragging
  const handleSigMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!placement) return;
    const pageEl = document.querySelector(`[data-page-idx="${placement.pageIndex}"]`) as HTMLElement;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    setIsDraggingSig(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origXPct: placement.xPct,
      origYPct: placement.yPct,
      pageWidth: rect.width,
      pageHeight: rect.height,
    };
  };

  useEffect(() => {
    if (!isDraggingSig) return;

    const handleMove = (e: MouseEvent) => {
      const s = dragStartRef.current;
      const dxPct = ((e.clientX - s.clientX) / s.pageWidth) * 100;
      const dyPct = ((e.clientY - s.clientY) / s.pageHeight) * 100;
      setPlacement((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          xPct: Math.max(0, Math.min(100 - sigWidthPct, s.origXPct + dxPct)),
          yPct: Math.max(0, Math.min(92, s.origYPct + dyPct)),
        };
      });
    };

    const handleUp = () => setIsDraggingSig(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingSig, sigWidthPct]);

  // -- Generate signed PDF --
  const processAndSign = async () => {
    if (!pdfBytes || !signatureDataUrl || !placement) return;
    setProcessing(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);

      const page = pdfDoc.getPages()[placement.pageIndex];
      const pageW = page.getWidth();
      const pageH = page.getHeight();

      const sigW = (sigWidthPct / 100) * pageW;
      const sigAspect = signatureImage.height / signatureImage.width;
      const sigH = sigW * sigAspect;

      const x = (placement.xPct / 100) * pageW;
      const y = pageH - (placement.yPct / 100) * pageH - sigH;

      page.drawImage(signatureImage, { x, y, width: sigW, height: sigH });

      const now = new Date();
      const dateStr = now.toLocaleDateString("sq-AL", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      page.drawText(`Nenshkruar dixhitalisht me ${dateStr} permes doc.al`, {
        x, y: y - 12, size: 7, color: rgb(0.4, 0.4, 0.4),
      });

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const originalName = pdfFile?.name.replace(/\.pdf$/i, "") || "dokument";
      setSignedFileName(`${originalName}_nenshkruar.pdf`);
      setSignedPdfUrl(url);
      setPhase("done");
    } catch {
      setError("Ndodhi nje gabim gjate procesimit te PDF.");
    } finally {
      setProcessing(false);
    }
  };

  // -- Reset all --
  const resetAll = () => {
    setPhase("upload");
    setPdfFile(null);
    setPdfBytes(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setNumPages(0);
    setPlacement(null);
    setSignedPdfUrl(null);
    setSignedFileName("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -- RENDER --

  // Phase: UPLOAD
  if (phase === "upload") {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard/contracts">
            <ChevronLeft className="h-4 w-4" />
            Kthehu te eSign
          </Link>
        </Button>

        <PageHeader
          title="Nenshkruaj Vete nje PDF"
          subtitle="Ngarko dokumentin, vendos firmen me mouse ku deshironi, dhe shkarkoni."
          className="mb-8"
        />

        {error && (
          <Alert
            variant="destructive"
            icon={<AlertTriangle className="h-5 w-5" />}
            title={error}
            className="mb-6"
          />
        )}

        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-colors ${
                isDraggingFile
                  ? "border-primary bg-primary/5"
                  : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
              }`}
            >
              <Upload className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" strokeWidth={1} />
              <p className="mt-4 text-sm font-medium text-foreground">Terhiq dhe leshoni skedarin PDF ketu</p>
              <p className="mt-1 text-xs text-muted-foreground">ose klikoni per te zgjedhur nje skedar (maks. 50 MB)</p>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileInput} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: DONE
  if (phase === "done" && signedPdfUrl) {
    return (
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Dokumenti u Nenshkrua me Sukses!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Firma juaj u vendos ne faqen {(placement?.pageIndex || 0) + 1} te dokumentit.
              </p>
            </div>

            <div className="mx-auto mt-6 max-w-sm">
              <Card className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <FileText className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{signedFileName}</p>
                  <p className="text-xs text-muted-foreground">PDF i nenshkruar</p>
                </div>
              </Card>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <a href={signedPdfUrl} download={signedFileName}>
                  <Download className="h-4 w-4" />
                  Shkarko PDF
                </a>
              </Button>
              <Button variant="secondary" onClick={resetAll}>
                Nenshkruaj tjeter
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/dashboard/contracts">
                  Kthehu te eSign
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: SIGN - Two panel layout with PDF viewer + sidebar
  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/contracts">
              <ChevronLeft className="h-3.5 w-3.5" />
              eSign
            </Link>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{pdfFile?.name}</span>
            <span className="text-[10px] text-muted-foreground">{pdfFile && formatBytes(pdfFile.size)}</span>
            <Badge>{numPages} faqe</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500">{error}</span>}
          {!signatureDataUrl && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">Zgjidhni nje firme nga paneli i majte</span>
          )}
          {placement && (
            <Badge variant="success">Faqja {placement.pageIndex + 1}</Badge>
          )}
          <Button
            size="sm"
            onClick={processAndSign}
            disabled={processing || !placement || !signatureDataUrl}
          >
            {processing ? (
              <Spinner size="sm" className="border-white/30 border-t-white" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {processing ? "Duke procesuar..." : "Nenshkruaj"}
          </Button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - signature picker */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-border bg-muted/50 p-4">
          {/* Signature options from settings */}
          <div className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Zgjidhni Firmen</h3>
            <div className="space-y-2">
              {signatureOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => selectSignature(opt)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    activeSignatureId === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex h-10 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                    {opt.dataUrl ? (
                      <img src={opt.dataUrl} alt="" className="h-8 w-14 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {opt.type === "text" ? "Nga cilesimet" : opt.type === "draw" ? "Vizatim" : opt.type === "image" ? "Imazh" : "E re"}
                    </p>
                  </div>
                  {activeSignatureId === opt.id && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}

              {signatureOptions.length === 0 && (
                <p className="text-xs text-muted-foreground px-2">
                  Nuk keni firma te ruajtura. Vizatoni nje te re me poshte ose konfiguroni ne{" "}
                  <Link href="/settings/signature" className="text-primary underline">Cilesimet</Link>.
                </p>
              )}
            </div>
          </div>

          {/* Draw new signature */}
          <div className="mb-4">
            <button
              onClick={() => setShowDrawPanel(!showDrawPanel)}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:border-slate-400 hover:text-foreground dark:border-slate-600 dark:hover:border-slate-500 transition-colors"
            >
              <PenTool className="h-4 w-4" strokeWidth={1.5} />
              {showDrawPanel ? "Mbyll" : "Vizato firme te re"}
            </button>

            {showDrawPanel && (
              <Card className="mt-2 p-3">
                <div className="rounded-xl border border-slate-300 bg-white dark:border-slate-600">
                  <canvas
                    ref={drawCanvasRef}
                    className="w-full cursor-crosshair touch-none"
                    style={{ aspectRatio: "10 / 3" }}
                    onMouseDown={startNewDraw}
                    onMouseMove={continueNewDraw}
                    onMouseUp={endNewDraw}
                    onMouseLeave={endNewDraw}
                    onTouchStart={startNewDraw}
                    onTouchMove={continueNewDraw}
                    onTouchEnd={endNewDraw}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={clearNewDraw} className="flex-1 text-[11px]">
                    Pastro
                  </Button>
                  <Button size="sm" onClick={confirmNewDraw} className="flex-1 text-[11px]">
                    Perdor
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Signature size */}
          <div className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Madhesia</h3>
            <input
              type="range"
              min={10}
              max={50}
              value={sigWidthPct}
              onChange={(e) => setSigWidthPct(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>E vogel</span>
              <span>{sigWidthPct}%</span>
              <span>E madhe</span>
            </div>
          </div>

          {/* Instructions */}
          <Card className="mb-4 bg-muted p-3">
            <h4 className="mb-1.5 text-[11px] font-semibold text-foreground">Si te perdorni:</h4>
            <ol className="space-y-1 text-[10px] text-muted-foreground list-decimal list-inside">
              <li>Zgjidhni firmen nga lista lart</li>
              <li>Klikoni ne PDF ku deshironi firmen</li>
              <li>Terhiqni firmen per ta levizur</li>
              <li>Klikoni &quot;Nenshkruaj&quot; per te perfunduar</li>
            </ol>
          </Card>

          {/* Link to settings */}
          <Button variant="secondary" size="sm" asChild className="w-full">
            <Link href="/settings/signature">
              <Settings className="h-4 w-4" strokeWidth={1.5} />
              Konfiguro firmat ne Cilesimet
            </Link>
          </Button>
        </div>

        {/* Right: PDF viewer with signature overlay */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-6 dark:bg-slate-950" style={{ cursor: signatureDataUrl && !placement ? "crosshair" : "default" }}>
          {pdfUrl && pdfReady && ReactPDF && (() => {
            const PdfDocument = ReactPDF!.Document;
            const PdfPage = ReactPDF!.Page;
            return (
            <PdfDocument
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }: { numPages: number }) => setNumPages(n)}
              loading={
                <div className="flex items-center justify-center py-20">
                  <Spinner />
                </div>
              }
              error={
                <Alert variant="destructive" title="Gabim gjate ngarkimit te PDF" className="mx-auto max-w-md" />
              }
            >
              <div className="mx-auto space-y-6" style={{ maxWidth: PDF_RENDER_WIDTH }}>
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i} className="relative mx-auto shadow-xl rounded-sm overflow-hidden" data-page-idx={i}>
                    {/* Page number badge */}
                    <div className="absolute left-2 top-2 z-10 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      Faqja {i + 1} / {numPages}
                    </div>

                    {/* Click area for placing signature */}
                    <div
                      onClick={(e) => handlePageClick(i, e)}
                      className="relative"
                    >
                      <PdfPage
                        pageNumber={i + 1}
                        width={PDF_RENDER_WIDTH}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />

                      {/* Signature overlay on this page */}
                      {placement && placement.pageIndex === i && signatureDataUrl && (
                        <div
                          className={`absolute border-2 rounded-xl shadow-lg select-none ${
                            isDraggingSig ? "border-primary ring-2 ring-primary/30" : "border-primary/70 hover:border-primary"
                          }`}
                          style={{
                            left: `${placement.xPct}%`,
                            top: `${placement.yPct}%`,
                            width: `${sigWidthPct}%`,
                            cursor: isDraggingSig ? "grabbing" : "grab",
                          }}
                          onMouseDown={handleSigMouseDown}
                        >
                          <img
                            src={signatureDataUrl}
                            alt="Firma"
                            className="w-full pointer-events-none"
                            draggable={false}
                          />
                          <p className="bg-white/80 px-1 py-0.5 text-[7px] text-slate-500 truncate">
                            Nenshkruar dixhitalisht permes doc.al
                          </p>
                          {/* Drag handle indicator */}
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow">
                            <Move className="h-2.5 w-2.5" strokeWidth={3} />
                          </div>
                        </div>
                      )}

                      {/* Click hint when signature selected but not placed on this page */}
                      {signatureDataUrl && (!placement || placement.pageIndex !== i) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-primary/5 pointer-events-none">
                          <span className="rounded-xl bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                            Klikoni per te vendosur firmen ketu
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </PdfDocument>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
