"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Type,
  PenLine,
  ImageIcon,
  X,
  Upload,
  Check,
  ShieldCheck,
  AlertCircle,
  Save,
  Eraser,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/cn";

// ── Types ──────────────────────────────────────────────────
interface SignatureProfile {
  draw?: string;
  text?: { font: string; size: number };
  image?: string;
  shape?: "square" | "rectangle";
  design?: string;
}

interface CertificateInfo {
  serialNumber: string;
  subjectDN: string;
  issuerDN: string;
  validFrom: string;
  validTo: string;
}

interface UserSignatureData {
  name: string;
  email: string;
  signatureData: SignatureProfile | null;
  signatureStyle: "draw" | "text" | "image";
  signatureTitle: string;
  image: string | null;
  organization: string | null;
  certificate: CertificateInfo | null;
}

const FONTS = [
  { value: "cursive", label: "Kursive", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { value: "serif", label: "Formale", css: "'Times New Roman', 'Georgia', serif" },
  { value: "sans", label: "Moderne", css: "'Arial', 'Helvetica', sans-serif" },
  { value: "mono", label: "Typewriter", css: "'Courier New', 'Consolas', monospace" },
];

const DESIGNS = [
  { value: "minimal", label: "Minimal", desc: "Nenshkrim i thjesht pa kornize" },
  { value: "classic", label: "Klasik", desc: "Me kornize dhe vije ndarese" },
  { value: "elegant", label: "Elegant", desc: "Me hije dhe gradient" },
  { value: "official", label: "Zyrtar", desc: "Me vule dhe certifikate" },
];

const STYLE_OPTIONS = [
  { key: "text" as const, label: "Tekst", Icon: Type },
  { key: "draw" as const, label: "Vizato", Icon: PenLine },
  { key: "image" as const, label: "Imazh / Logo", Icon: ImageIcon },
];

// ── Main Component ─────────────────────────────────────────
export default function SignatureSettingsPage() {
  const [data, setData] = useState<UserSignatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Signature state
  const [style, setStyle] = useState<"draw" | "text" | "image">("text");
  const [title, setTitle] = useState("");
  const [font, setFont] = useState("cursive");
  const [drawData, setDrawData] = useState<string>("");
  const [imageData, setImageData] = useState<string>("");
  const [shape, setShape] = useState<"square" | "rectangle">("rectangle");
  const [design, setDesign] = useState("classic");

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const canvasInitializedRef = useRef(false);

  // Load user data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/signature");
        if (!res.ok) {
          try {
            const errBody = await res.json();
            console.warn("[signature] API returned", res.status, errBody);
          } catch { /* ignore parse error */ }
          // Try to get user name from session as fallback
          try {
            const sessRes = await fetch("/api/auth/session");
            const sessData = await sessRes.json();
            if (sessData?.user) {
              setData({
                name: sessData.user.name || "Perdoruesi",
                email: sessData.user.email || "",
                signatureData: null,
                signatureStyle: "text",
                signatureTitle: "",
                image: sessData.user.image || null,
                organization: null,
                certificate: null,
              });
            }
          } catch {
            // Use absolute fallback
            setData({
              name: "Perdoruesi",
              email: "",
              signatureData: null,
              signatureStyle: "text",
              signatureTitle: "",
              image: null,
              organization: null,
              certificate: null,
            });
          }
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setStyle(json.data.signatureStyle || "text");
          setTitle(json.data.signatureTitle || "");
          if (json.data.signatureData) {
            if (json.data.signatureData.draw) setDrawData(json.data.signatureData.draw);
            if (json.data.signatureData.image) setImageData(json.data.signatureData.image);
            if (json.data.signatureData.text?.font) setFont(json.data.signatureData.text.font);
            if (json.data.signatureData.shape) setShape(json.data.signatureData.shape);
            if (json.data.signatureData.design) setDesign(json.data.signatureData.design);
          }
        } else {
          // API returned success: false, use session fallback
          const sessRes = await fetch("/api/auth/session");
          const sessData = await sessRes.json();
          setData({
            name: sessData?.user?.name || "Perdoruesi",
            email: sessData?.user?.email || "",
            signatureData: null,
            signatureStyle: "text",
            signatureTitle: "",
            image: sessData?.user?.image || null,
            organization: null,
            certificate: null,
          });
        }
      } catch (e) {
        console.error("[signature] load error:", e);
        // Fallback so the page is still usable
        setData({
          name: "Perdoruesi",
          email: "",
          signatureData: null,
          signatureStyle: "text",
          signatureTitle: "",
          image: null,
          organization: null,
          certificate: null,
        });
      }
      setLoading(false);
    })();
  }, []);

  // Canvas initialization with proper sizing
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return; // Not visible yet

    // Set canvas pixel size (2x for retina)
    const w = rect.width;
    const h = Math.max(160, 150); // Fixed height, min 150px
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    // White background for visibility
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Restore existing drawing
    if (drawData && !canvasInitializedRef.current) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        canvasInitializedRef.current = true;
      };
      img.src = drawData;
    }
    canvasInitializedRef.current = true;
  }, [drawData]);

  useEffect(() => {
    if (style === "draw") {
      // Wait for the DOM to be ready
      const timer = setTimeout(initCanvas, 100);
      // Also try on resize
      const resizeObserver = new ResizeObserver(() => {
        if (!canvasInitializedRef.current) {
          initCanvas();
        }
      });
      if (canvasContainerRef.current) {
        resizeObserver.observe(canvasContainerRef.current);
      }
      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    } else {
      canvasInitializedRef.current = false;
    }
  }, [style, initCanvas]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setDrawData(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Refill white background
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const w = rect?.width || canvas.width / 2;
    const h = 160;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setDrawData("");
  };

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError("Imazhi duhet te jete me i vogel se 2MB");
      return;
    }
    setSaveError("");
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const signatureData: SignatureProfile = {};
      if (drawData) signatureData.draw = drawData;
      if (imageData) signatureData.image = imageData;
      signatureData.text = { font, size: 24 };
      signatureData.shape = shape;
      signatureData.design = design;

      const res = await fetch("/api/settings/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureData,
          signatureStyle: style,
          signatureTitle: title,
        }),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(json.error || "Ndodhi nje gabim gjate ruajtjes");
      }
    } catch {
      setSaveError("Ndodhi nje gabim gjate ruajtjes");
    }
    setSaving(false);
  };

  // Get active signature visual
  const getSignatureVisual = () => {
    if (style === "draw" && drawData) return drawData;
    if (style === "image" && imageData) return imageData;
    return null;
  };

  const selectedFont = FONTS.find((f) => f.value === font) || FONTS[0];
  const now = new Date();

  if (loading) {
    return <PageSpinner />;
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-foreground">Nuk mund te ngarkoheshin te dhenat</div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header with save */}
      <PageHeader
        title="Nenshkrimi im Elektronik"
        subtitle="Konfiguroni stilin dhe pamjen e nenshkrimit tuaj dixhital"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" />
                Duke ruajtur...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                U ruajt!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Ruaj Nenshkrimin
              </>
            )}
          </Button>
        }
      />

      {/* Error banner */}
      {saveError && (
        <div className="mt-4">
          <Alert variant="destructive" title={saveError} />
        </div>
      )}

      {/* Mobile save button */}
      <div className="mt-4 sm:hidden">
        <Button onClick={handleSave} disabled={saving} className="w-full min-h-[48px]">
          {saving ? (
            <>
              <Spinner size="sm" />
              Duke ruajtur...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              U ruajt!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Ruaj Nenshkrimin
            </>
          )}
        </Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        {/* Left: Editor */}
        <div className="lg:col-span-3 space-y-6">
          {/* Style selector */}
          <Card>
            <CardContent className="pt-5">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Stili i Nenshkrimit
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setStyle(s.key)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 p-4 min-h-[48px] transition-all",
                      style === s.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-slate-400"
                    )}
                  >
                    <s.Icon className={cn("h-6 w-6", style === s.key ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", style === s.key ? "text-primary" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Text signature editor */}
          {style === "text" && (
            <Card>
              <CardContent className="pt-5">
                <label className="mb-3 block text-sm font-medium text-foreground">Fonti</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFont(f.value)}
                      className={cn(
                        "rounded-xl border-2 px-4 py-3 text-left transition-all",
                        font === f.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-slate-400"
                      )}
                    >
                      <span className="text-lg text-foreground" style={{ fontFamily: f.css }}>{data.name}</span>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{f.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Draw signature */}
          {style === "draw" && (
            <Card>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Vizatoni Nenshkrimin</label>
                  <Button variant="ghost" size="sm" onClick={clearCanvas} className="min-h-[44px] min-w-[44px]">
                    <Eraser className="mr-1 h-3.5 w-3.5" />
                    Pastro
                  </Button>
                </div>
                <div ref={canvasContainerRef} className="rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden dark:border-slate-600" style={{ minHeight: "150px" }}>
                  <canvas
                    ref={canvasRef}
                    className="cursor-crosshair touch-none block w-full"
                    style={{ minHeight: "150px" }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">Perdorni mouse-in ose gishtin per te vizatuar nenshkrimin tuaj</p>
              </CardContent>
            </Card>
          )}

          {/* Image upload */}
          {style === "image" && (
            <Card>
              <CardContent className="pt-5">
                <label className="mb-2 block text-sm font-medium text-foreground">Ngarkoni Logo / Imazh</label>
                {imageData ? (
                  <div className="relative rounded-xl border border-border bg-card p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageData} alt="Logo" className="mx-auto h-24 object-contain" />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setImageData("")}
                      className="absolute right-2 top-2 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-10 hover:border-slate-400 transition-colors">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Klikoni per te ngarkuar (PNG, JPG, max 2MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shape selector */}
          <Card>
            <CardContent className="pt-5">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Forma e Nenshkrimit
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShape("rectangle")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 transition-all",
                    shape === "rectangle"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400"
                  )}
                >
                  <div className={cn(
                    "h-8 w-14 rounded border-2",
                    shape === "rectangle" ? "border-primary/60 bg-primary/10" : "border-slate-300 dark:border-slate-600"
                  )} />
                  <div>
                    <p className={cn("text-sm font-medium", shape === "rectangle" ? "text-primary" : "text-foreground")}>Drejtkendesh</p>
                    <p className="text-[10px] text-muted-foreground">Forma standarde</p>
                  </div>
                </button>
                <button
                  onClick={() => setShape("square")}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 transition-all",
                    shape === "square"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded border-2",
                    shape === "square" ? "border-primary/60 bg-primary/10" : "border-slate-300 dark:border-slate-600"
                  )} />
                  <div>
                    <p className={cn("text-sm font-medium", shape === "square" ? "text-primary" : "text-foreground")}>Katror</p>
                    <p className="text-[10px] text-muted-foreground">Forma kompakte</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Design template selector */}
          <Card>
            <CardContent className="pt-5">
              <label className="mb-3 block text-sm font-medium text-foreground">
                Dizajni / Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DESIGNS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDesign(d.value)}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      design === d.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-slate-400"
                    )}
                  >
                    <p className={cn("text-sm font-medium", design === d.value ? "text-primary" : "text-foreground")}>
                      {d.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Title / Position */}
          <Card>
            <CardContent className="pt-5">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Titulli / Pozicioni (opsional)
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="p.sh. Drejtor Ekzekutiv, Avokat, Perfaqesues Ligjor"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Paraqitja e Nenshkrimit
            </h3>

            {/* Signature Block Preview */}
            <div className={cn(
              "overflow-hidden border bg-white shadow-sm dark:bg-slate-900",
              shape === "square"
                ? "rounded-2xl border-border aspect-square max-w-[280px] mx-auto"
                : "rounded-2xl border-border",
              design === "elegant" && "shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20"
            )}>
              {/* Top bar varies by design */}
              {design === "minimal" && <div className="h-0.5 bg-slate-200 dark:bg-slate-700" />}
              {design === "classic" && <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-500" />}
              {design === "elegant" && <div className="h-2 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700" />}
              {design === "official" && (
                <div className="h-2.5 bg-gradient-to-r from-slate-800 via-blue-700 to-slate-800 dark:from-slate-600 dark:via-blue-500 dark:to-slate-600" />
              )}

              <div className={shape === "square" ? "p-3" : "p-5"}>
                {/* Seal + label - varies by design */}
                {design !== "minimal" && (
                  <div className={cn(shape === "square" ? "mb-2" : "mb-4", "flex items-center gap-3")}>
                    {design === "official" ? (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:border-blue-700 dark:from-blue-900/40 dark:to-blue-900/20">
                        <ShieldCheck className="h-6 w-6 text-blue-600" />
                      </div>
                    ) : (
                      <div className={cn(
                        "flex flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30",
                        shape === "square" ? "h-9 w-9" : "h-12 w-12"
                      )}>
                        <ShieldCheck className={cn(shape === "square" ? "h-4 w-4" : "h-5 w-5", "text-blue-600")} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-semibold uppercase tracking-widest text-blue-600",
                        shape === "square" ? "text-[9px]" : "text-[10px]"
                      )}>
                        {design === "official" ? "Nenshkrim Zyrtar" : "Nenshkrim Elektronik"}
                      </p>
                      <p className={cn(shape === "square" ? "text-[8px]" : "text-[10px]", "text-muted-foreground")}>Powered by doc.al</p>
                    </div>
                  </div>
                )}

                {/* The actual signature figure */}
                <div className={cn(
                  shape === "square" ? "mb-2" : "mb-4",
                  "rounded-xl",
                  design === "minimal"
                    ? "border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30"
                    : design === "elegant"
                    ? "border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-4 dark:border-blue-900/30 dark:from-slate-800 dark:to-blue-900/10"
                    : "border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                )}>
                  {style === "text" ? (
                    <p
                      className={cn("text-center text-foreground", shape === "square" ? "text-xl" : "text-2xl")}
                      style={{ fontFamily: selectedFont.css }}
                    >
                      {data.name}
                    </p>
                  ) : (
                    getSignatureVisual() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getSignatureVisual()!}
                        alt="Nenshkrimi"
                        className={cn("mx-auto object-contain", shape === "square" ? "h-12" : "h-16")}
                      />
                    ) : (
                      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", shape === "square" ? "h-12" : "h-16")}>
                        {style === "draw" ? "Vizatoni nenshkrimin..." : "Ngarkoni imazhin..."}
                      </div>
                    )
                  )}
                </div>

                {/* Full name (Emer + Mbiemer) prominently displayed */}
                <div className={cn(shape === "square" ? "mb-1.5" : "mb-3", "text-center")}>
                  <p className={cn("font-bold text-foreground", shape === "square" ? "text-sm" : "text-base")}>
                    {data.name}
                  </p>
                  {title && (
                    <p className={cn("text-muted-foreground mt-0.5", shape === "square" ? "text-[10px]" : "text-xs")}>{title}</p>
                  )}
                </div>

                {/* Signer details */}
                <div className={cn(
                  "space-y-1.5 border-t pt-2.5",
                  design === "elegant"
                    ? "border-blue-100 dark:border-blue-900/30"
                    : "border-slate-100 dark:border-slate-800"
                )}>
                  <div className="flex items-center justify-between">
                    <span className={cn("font-medium uppercase tracking-wider text-muted-foreground", shape === "square" ? "text-[8px]" : "text-[10px]")}>Email</span>
                    <span className={cn("text-muted-foreground truncate ml-2", shape === "square" ? "text-[10px]" : "text-xs")}>{data.email}</span>
                  </div>
                  {data.organization && (
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium uppercase tracking-wider text-muted-foreground", shape === "square" ? "text-[8px]" : "text-[10px]")}>Organizata</span>
                      <span className={cn("text-muted-foreground", shape === "square" ? "text-[10px]" : "text-xs")}>{data.organization}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={cn("font-medium uppercase tracking-wider text-muted-foreground", shape === "square" ? "text-[8px]" : "text-[10px]")}>Data</span>
                    <span className={cn("text-muted-foreground", shape === "square" ? "text-[10px]" : "text-xs")}>
                      {now.toLocaleDateString("sq-AL", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {data.certificate && design === "official" ? (
                    <div className="mt-2 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Certifikate Aktive</span>
                      </div>
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-500">SN: {data.certificate.serialNumber}</p>
                      <p className="text-[9px] text-emerald-600 dark:text-emerald-500">Vlefshme deri: {new Date(data.certificate.validTo).toLocaleDateString("sq-AL")}</p>
                    </div>
                  ) : data.certificate ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Certifikuar</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-1">
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400">Pa certifikate</span>
                    </div>
                  )}
                </div>

                {design !== "minimal" && (
                  <div className={cn(
                    "mt-2.5 flex items-center justify-between border-t pt-2",
                    design === "elegant" ? "border-blue-100 dark:border-blue-900/30" : "border-slate-100 dark:border-slate-800"
                  )}>
                    <span className="text-[9px] font-mono text-slate-300 dark:text-slate-600">doc.al/verify</span>
                    <span className="text-[9px] text-slate-300 dark:text-slate-600">
                      {now.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Ky eshte pamja e nenshkrimit tuaj sic do te duket ne dokumenta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
