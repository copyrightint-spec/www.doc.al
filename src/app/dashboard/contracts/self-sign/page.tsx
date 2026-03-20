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
  ShieldCheck,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";

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

interface StepStatus {
  label: string;
  status: "pending" | "success" | "error";
  errorCode?: string;
  errorMessage?: string;
}

type Phase = "upload" | "sign" | "confirm" | "verify" | "done";

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

  // Phase: upload -> sign -> confirm -> verify -> done
  const [phase, setPhase] = useState<Phase>("upload");

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

  // Confirm step
  const [eidasConsent, setEidasConsent] = useState(false);

  // Verify step
  const [verifyStep, setVerifyStep] = useState<"check" | "otp" | "totp" | "error">("check");
  const [otpCode, setOtpCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Final state
  const [processing, setProcessing] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedFileName, setSignedFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Server result data
  const [serverResult, setServerResult] = useState<{
    documentId?: string;
    signatureId?: string;
    documentHash?: string;
    timestampId?: string;
    sequenceNumber?: number;
    fingerprint?: string;
    signedAt?: string;
    ipfsCid?: string;
    ipfsUrl?: string;
    cryptoSigned?: boolean;
    certificateSerial?: string;
  } | null>(null);

  // Step statuses for done phase
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  // -- Verification flow --
  async function startVerification() {
    setPhase("verify");
    setVerifyStep("check");
    setVerifyError("");
    setOtpCode("");
    setTotpCode("");

    try {
      const res = await fetch("/api/signing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();

      if (data.canSign) {
        await sendOtp();
      } else {
        setVerifyError(data.reason || "Nuk mund te nenshkruani");
        setRedirectTo(data.redirectTo || null);
        setVerifyStep("error");
      }
    } catch {
      setVerifyError("Gabim ne lidhjen me serverin (ERR-V001)");
      setVerifyStep("error");
    }
  }

  async function sendOtp() {
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/signing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-otp" }),
      });
      const data = await res.json();
      setVerifyLoading(false);

      if (res.ok) {
        setVerifyStep("otp");
        setCountdown(300);
      } else {
        setVerifyError(data.error || "Gabim gjate dergimit te kodit (ERR-V002)");
      }
    } catch {
      setVerifyLoading(false);
      setVerifyError("Gabim ne lidhjen me serverin (ERR-V003)");
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/signing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-otp", code: otpCode }),
      });
      const data = await res.json();
      setVerifyLoading(false);

      if (res.ok) {
        setVerifyStep("totp");
      } else {
        setVerifyError(data.error || "Kodi eshte i gabuar ose ka skaduar (ERR-V004)");
      }
    } catch {
      setVerifyLoading(false);
      setVerifyError("Gabim ne lidhjen me serverin (ERR-V005)");
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/signing/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify-totp", token: totpCode }),
      });
      const data = await res.json();
      setVerifyLoading(false);

      if (res.ok && data.verified) {
        // Verification complete - proceed to sign
        await processAndSign();
      } else {
        setVerifyError(data.error || "Kodi 2FA eshte i gabuar (ERR-V006)");
      }
    } catch {
      setVerifyLoading(false);
      setVerifyError("Gabim ne lidhjen me serverin (ERR-V007)");
    }
  }

  function formatCountdown(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  // -- Generate signed PDF and submit to server --
  const processAndSign = async () => {
    if (!pdfBytes || !pdfFile || !signatureDataUrl || !placement) return;
    setProcessing(true);
    setError(null);
    setServerResult(null);

    const statuses: StepStatus[] = [
      { label: "Ngarkimi i dokumentit", status: "success" },
      { label: "Vendosja e firmes", status: "success" },
      { label: "Pranimi i kushteve eIDAS", status: "success" },
      { label: "Verifikimi me email (OTP)", status: "success" },
      { label: "Verifikimi 2FA (TOTP)", status: "success" },
      { label: "Gjenerimi i PDF te nenshkruar", status: "pending" },
      { label: "Ruajtja ne server (S3)", status: "pending" },
      { label: "Regjistrimi i nenshkrimit", status: "pending" },
      { label: "STAMLES Polygon Blockchain", status: "pending" },
      { label: "Prove IPFS (decentralized)", status: "pending" },
    ];
    setStepStatuses([...statuses]);

    const updateStatus = (idx: number, s: Partial<StepStatus>) => {
      statuses[idx] = { ...statuses[idx], ...s };
      setStepStatuses([...statuses]);
    };

    try {
      // Step 6: Generate signed PDF locally
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
      updateStatus(5, { status: "success" });

      // Step 7-9: Upload to server, create records, timestamp
      updateStatus(6, { status: "pending" });

      const originalName = pdfFile.name.replace(/\.pdf$/i, "") || "dokument";
      const signedFileName = `${originalName}_nenshkruar.pdf`;

      const formData = new FormData();
      formData.append("originalFile", pdfFile);
      formData.append(
        "signedFile",
        new File([signedBytes.buffer as ArrayBuffer], signedFileName, { type: "application/pdf" })
      );
      formData.append("title", pdfFile.name);
      formData.append("signatureImage", signatureDataUrl);
      formData.append(
        "placement",
        JSON.stringify({
          pageIndex: placement.pageIndex,
          xPct: placement.xPct,
          yPct: placement.yPct,
          sigWidthPct,
        })
      );

      const res = await fetch("/api/self-sign", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        updateStatus(6, {
          status: "error",
          errorCode: "ERR-S002",
          errorMessage: data.error || "Gabim gjate ngarkimit ne server",
        });
        setError(data.error || "Gabim gjate ngarkimit ne server (ERR-S002)");
        setProcessing(false);
        return;
      }

      // All server steps succeeded
      updateStatus(6, { status: "success" });
      updateStatus(7, { status: "success" });
      updateStatus(8, { status: "success" });
      updateStatus(9, { status: data.data?.ipfsCid ? "success" : "pending" });

      // Save result for display
      setServerResult(data.data);

      // Create download URL from local bytes
      const blob = new Blob([signedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setSignedPdfUrl(URL.createObjectURL(blob));
      setSignedFileName(signedFileName);
      setPhase("done");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Gabim i papritur";
      // Find first pending status and mark as error
      const pendingIdx = statuses.findIndex((s) => s.status === "pending");
      if (pendingIdx >= 0) {
        updateStatus(pendingIdx, {
          status: "error",
          errorCode: "ERR-S001",
          errorMessage: errMsg,
        });
      }
      setError(`Ndodhi nje gabim: ${errMsg} (ERR-S001)`);
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
    setEidasConsent(false);
    setVerifyStep("check");
    setOtpCode("");
    setTotpCode("");
    setVerifyError("");
    setStepStatuses([]);
    setServerResult(null);
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
          subtitle="Ngarko dokumentin, vendos firmen, verifiko identitetin, dhe shkarkoni."
          className="mb-8"
        />

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {["Ngarko", "Vendos Firmen", "Konfirmo", "Verifiko", "Perfundo"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                i === 0 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}>
                <span>{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 4 && <div className="h-px w-4 bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

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

  // Phase: CONFIRM
  if (phase === "confirm") {
    return (
      <div className="mx-auto max-w-2xl p-6 lg:p-8">
        <Button variant="ghost" size="sm" onClick={() => setPhase("sign")} className="mb-6">
          <ChevronLeft className="h-4 w-4" />
          Kthehu te vendosja e firmes
        </Button>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {["Ngarko", "Vendos Firmen", "Konfirmo", "Verifiko", "Perfundo"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                i < 2 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : i === 2 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}>
                {i < 2 ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 4 && <div className={`h-px w-4 ${i < 2 ? "bg-green-300" : "bg-slate-200 dark:bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Eye className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Konfirmoni Nenshkrimin</h2>
              <p className="mt-1 text-sm text-muted-foreground">Rishikoni detajet perpara se te vazhdoni</p>
            </div>

            {/* Document info */}
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-foreground">{pdfFile?.name}</p>
                  <p className="text-xs text-muted-foreground">{pdfFile && formatBytes(pdfFile.size)} &middot; {numPages} faqe</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="info">Faqja {(placement?.pageIndex || 0) + 1}</Badge>
                <span>Firma e vendosur</span>
              </div>
              {signatureDataUrl && (
                <div className="mt-2 rounded-lg border border-border bg-white dark:bg-slate-900 p-2 inline-block">
                  <img src={signatureDataUrl} alt="Firma" className="h-10 object-contain" />
                </div>
              )}
            </div>

            {/* eIDAS consent */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${
              eidasConsent ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
            }`}>
              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eidasConsent}
                  onChange={(e) => setEidasConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500 flex-shrink-0"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Pranoj kushtet e nenshkrimit elektronik sipas Rregullores eIDAS (BE Nr. 910/2014)
                  dhe Ligjit Nr. 9880 per Nenshkrimin Elektronik. Duke nenshkruar dokumentin
                  &quot;{pdfFile?.name}&quot;, deklaroj se kam lexuar e kuptuar permbajtjen dhe bie
                  dakord qe nenshkrimi im elektronik ka te njejten vlere juridike si nenshkrimi doreskrimi.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setPhase("sign")}
                className="flex-1"
              >
                Kthehu
              </Button>
              <Button
                onClick={startVerification}
                disabled={!eidasConsent}
                className="flex-1"
              >
                <ShieldCheck className="h-4 w-4" />
                Vazhdo me Verifikimin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: VERIFY
  if (phase === "verify") {
    return (
      <div className="mx-auto max-w-md p-6 lg:p-8">
        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {["Ngarko", "Vendos Firmen", "Konfirmo", "Verifiko", "Perfundo"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                i < 3 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : i === 3 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}>
                {i < 3 ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 4 && <div className={`h-px w-4 ${i < 3 ? "bg-green-300" : "bg-slate-200 dark:bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ShieldCheck className="h-6 w-6 text-foreground" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Verifikimi i Identitetit
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {verifyStep === "otp" && "Hapi 1/2 — Kodi nga emaili"}
                {verifyStep === "totp" && "Hapi 2/2 — Google Authenticator"}
                {verifyStep === "check" && "Duke kontrolluar..."}
                {verifyStep === "error" && "Nuk mund te vazhdoni"}
              </p>
            </div>

            {verifyError && (
              <Alert
                variant="destructive"
                title={verifyError}
                className="mb-4"
              />
            )}

            {verifyStep === "error" && (
              <div className="space-y-4">
                {redirectTo && (
                  <Button className="w-full" asChild>
                    <a href={redirectTo}>Shko ne Settings</a>
                  </Button>
                )}
                <Button variant="secondary" className="w-full" onClick={() => setPhase("confirm")}>
                  Kthehu
                </Button>
              </div>
            )}

            {verifyStep === "check" && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}

            {verifyStep === "otp" && (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nje kod 6-shifror u dergua ne emailin tuaj.
                  {countdown > 0 && (
                    <span className="ml-2 text-muted-foreground/70">
                      Skadon per {formatCountdown(countdown)}
                    </span>
                  )}
                </p>
                <Input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                />
                <Button
                  type="submit"
                  disabled={verifyLoading || otpCode.length !== 6}
                  className="w-full"
                >
                  {verifyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {verifyLoading ? "Duke verifikuar..." : "Verifiko Kodin"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={sendOtp}
                    disabled={verifyLoading || countdown > 240}
                    className="flex-1 text-xs"
                  >
                    Dergo perseri
                  </Button>
                  <Button variant="ghost" type="button" onClick={() => setPhase("confirm")} className="flex-1 text-xs">
                    Anulo
                  </Button>
                </div>
              </form>
            )}

            {verifyStep === "totp" && (
              <form onSubmit={handleTotpVerify} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Fut kodin 6-shifror nga Google Authenticator.
                </p>
                <Input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="text-center text-2xl font-mono tracking-[0.5em]"
                />
                <Button
                  type="submit"
                  disabled={verifyLoading || totpCode.length !== 6}
                  className="w-full"
                >
                  {verifyLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {verifyLoading ? "Duke nenshkruar..." : "Nenshkruaj Dokumentin"}
                </Button>
                <Button variant="ghost" type="button" onClick={() => setPhase("confirm")} className="w-full text-xs">
                  Anulo
                </Button>
              </form>
            )}

            {processing && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner />
                <p className="text-sm text-muted-foreground">Duke procesuar nenshkrimin...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: DONE
  if (phase === "done") {
    return (
      <div className="mx-auto max-w-2xl p-6 lg:p-8">
        {/* Step indicator - all complete */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {["Ngarko", "Vendos Firmen", "Konfirmo", "Verifiko", "Perfundo"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 4 && <div className="h-px w-4 bg-green-300" />}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-8">
            {/* Success header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-8 w-8 text-green-600" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Dokumenti u Nenshkrua me Sukses!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Te gjitha hapat u kryen me sukses.
              </p>
            </div>

            {/* Step-by-step status */}
            <div className="mb-6 rounded-xl border border-border divide-y divide-border">
              {stepStatuses.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {s.status === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : s.status === "error" ? (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      s.status === "error" ? "text-red-600" : "text-foreground"
                    }`}>
                      {s.label}
                    </p>
                    {s.errorMessage && (
                      <p className="text-xs text-red-500">{s.errorMessage} ({s.errorCode})</p>
                    )}
                  </div>
                  {s.status === "success" && (
                    <Badge variant="success" className="text-[10px]">OK</Badge>
                  )}
                  {s.status === "error" && (
                    <Badge variant="destructive" className="text-[10px]">{s.errorCode}</Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Server result details */}
            {serverResult && (
              <div className="mb-6 rounded-xl border border-border p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Hash:</span>
                  <span className="font-mono text-foreground truncate max-w-[220px]">{serverResult.documentHash}</span>
                </div>
                {serverResult.sequenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timestamp #:</span>
                    <Link href={`/explorer/${serverResult.sequenceNumber}`} className="text-primary hover:underline">
                      #{serverResult.sequenceNumber}
                    </Link>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nenshkruar me:</span>
                  <span className="text-foreground">{serverResult.signedAt ? new Date(serverResult.signedAt).toLocaleString("sq-AL") : "-"}</span>
                </div>
                {serverResult.ipfsCid && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IPFS Proof:</span>
                    <a href={serverResult.ipfsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[220px]">
                      {serverResult.ipfsCid}
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firma Kriptografike:</span>
                  <span className={serverResult.cryptoSigned ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>
                    {serverResult.cryptoSigned ? "Po (certifikate dixhitale)" : "Jo (vetem vizuale)"}
                  </span>
                </div>
                {serverResult.certificateSerial && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nr. Certifikates:</span>
                    <span className="font-mono text-foreground truncate max-w-[220px]">{serverResult.certificateSerial}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Polygon:</span>
                  <span className="text-purple-500 font-medium">
                    Ne rradhe per Merkle batching (brenda 24h)
                  </span>
                </div>
                {serverResult.fingerprint && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">STAMLES:</span>
                    <a href={`https://scan.stamles.eu/verify/${serverResult.fingerprint}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                      Verifiko ne STAMLES
                    </a>
                  </div>
                )}
                {serverResult.fingerprint && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verifiko:</span>
                    <Link href={`/verify/${serverResult.fingerprint}`} className="text-primary hover:underline">
                      Shiko verifikimin
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* File download */}
            {signedPdfUrl && (
              <>
                <div className="mx-auto max-w-sm mb-6">
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

                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
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
                    <Link href="/dashboard/documents">
                      Shiko Dokumentat
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/dashboard/contracts">
                      Kthehu te eSign
                    </Link>
                  </Button>
                </div>
              </>
            )}

            {error && !signedPdfUrl && (
              <div className="text-center space-y-4">
                <Alert variant="destructive" title={error} />
                <Button variant="secondary" onClick={() => setPhase("confirm")}>
                  Provo perseri
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: SIGN - Two panel layout with PDF viewer + sidebar
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col" style={{ margin: "-1.5rem", marginTop: "-1.5rem" }}>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Kthehu
          </Button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0 hidden sm:flex">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={1.5} />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{pdfFile?.name}</span>
            <span className="text-[10px] text-muted-foreground">{pdfFile && formatBytes(pdfFile.size)}</span>
            <Badge>{numPages} faqe</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-500 hidden sm:inline">{error}</span>}
          {!signatureDataUrl && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400">Zgjidhni nje firme</span>
          )}
          {placement && (
            <Badge variant="success">Faqja {placement.pageIndex + 1}</Badge>
          )}
          <Button
            size="sm"
            onClick={() => setPhase("confirm")}
            disabled={!placement || !signatureDataUrl}
          >
            <Check className="h-3.5 w-3.5" />
            Vazhdo
          </Button>
        </div>
      </div>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - signature picker (collapsible on mobile) */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-border bg-muted/50 p-3 hidden md:block">
          {/* Signature options from settings */}
          <div className="mb-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Zgjidhni Firmen</h3>
            <div className="space-y-1.5">
              {signatureOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => selectSignature(opt)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition-all ${
                    activeSignatureId === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex h-9 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                    {opt.dataUrl ? (
                      <img src={opt.dataUrl} alt="" className="h-7 w-12 object-contain" />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {opt.type === "text" ? "Nga cilesimet" : opt.type === "draw" ? "Vizatim" : opt.type === "image" ? "Imazh" : "E re"}
                    </p>
                  </div>
                  {activeSignatureId === opt.id && (
                    <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
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
          <div className="mb-3">
            <button
              onClick={() => setShowDrawPanel(!showDrawPanel)}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-muted-foreground hover:border-slate-400 hover:text-foreground dark:border-slate-600 dark:hover:border-slate-500 transition-colors"
            >
              <PenTool className="h-3.5 w-3.5" strokeWidth={1.5} />
              {showDrawPanel ? "Mbyll" : "Vizato firme te re"}
            </button>

            {showDrawPanel && (
              <Card className="mt-2 p-2.5">
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-600">
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
          <div className="mb-3">
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Madhesia</h3>
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
          <Card className="mb-3 bg-muted p-2.5">
            <h4 className="mb-1 text-[11px] font-semibold text-foreground">Si te perdorni:</h4>
            <ol className="space-y-0.5 text-[10px] text-muted-foreground list-decimal list-inside">
              <li>Zgjidhni firmen nga lista lart</li>
              <li>Klikoni ne PDF ku deshironi firmen</li>
              <li>Terhiqni firmen per ta levizur</li>
              <li>Klikoni &quot;Vazhdo&quot; per konfirmim</li>
            </ol>
          </Card>

          {/* Link to settings */}
          <Button variant="secondary" size="sm" asChild className="w-full text-xs">
            <Link href="/settings/signature">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              Konfiguro firmat
            </Link>
          </Button>
        </div>

        {/* Mobile signature bar */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20 border-t border-border bg-card p-3 flex items-center gap-2 overflow-x-auto">
          {signatureOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => selectSignature(opt)}
              className={`flex-shrink-0 rounded-lg border-2 p-1.5 ${
                activeSignatureId === opt.id ? "border-primary" : "border-border"
              }`}
            >
              {opt.dataUrl && <img src={opt.dataUrl} alt="" className="h-8 w-16 object-contain" />}
            </button>
          ))}
          <button
            onClick={() => setShowDrawPanel(!showDrawPanel)}
            className="flex-shrink-0 rounded-lg border-2 border-dashed border-slate-300 p-1.5"
          >
            <PenTool className="h-8 w-8 text-muted-foreground p-1" />
          </button>
        </div>

        {/* Right: PDF viewer with signature overlay */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-4 md:p-6 dark:bg-slate-950" style={{ cursor: signatureDataUrl && !placement ? "crosshair" : "default" }}>
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
