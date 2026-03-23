"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

interface SignatureInfo {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  order: number;
  document: {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    owner: { name: string; email: string };
    signatures: Array<{
      id: string;
      signerName: string;
      signerEmail: string;
      status: string;
      order: number;
      signedAt: string | null;
    }>;
  };
  signingRequest?: {
    companyName: string | null;
    companyLogo: string | null;
    brandColor: string | null;
    message: string | null;
    expiresAt: string | null;
  };
}

type Step = "welcome" | "preview" | "verify" | "totp" | "sign" | "done";
type VerifyMethod = "EMAIL" | "SMS" | "SMS_VOICE";

export default function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [info, setInfo] = useState<SignatureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("welcome");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>("EMAIL");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);

  // Brand theming
  const brandColor = info?.signingRequest?.brandColor || "#dc2626";
  const companyName = info?.signingRequest?.companyName || "doc.al";

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sign/${token}`);
      const data = await res.json();
      if (data.success) {
        setInfo(data.data);
        if (data.data.status === "SIGNED") {
          setStep("done");
        }
      } else {
        setError(data.error || "Link i pavlefshem ose i skaduar");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Touch support for canvas
  const getCanvasCoords = useCallback((e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
        y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a2e";
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSendOtp() {
    setActionLoading(true);
    setError("");
    const res = await fetch(`/api/sign/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp", channel: verifyMethod }),
    });
    const data = await res.json();
    setActionLoading(false);
    if (res.ok) {
      setOtpSent(true);
      setResendTimer(60);
    } else {
      setError(data.error);
    }
  }

  async function handleVerifyAndSign() {
    setActionLoading(true);
    setError("");
    const canvas = canvasRef.current;
    const signatureImage = canvas?.toDataURL("image/png").split(",")[1] || "";
    const payload: Record<string, string> = {
      action: "verify-and-sign",
      code: otpCode,
      signatureImage,
    };
    if (totpCode) {
      payload.totpCode = totpCode;
    }
    const res = await fetch(`/api/sign/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setActionLoading(false);
    if (res.ok && data.success) {
      setStep("done");
    } else if (data.requireTotp && !totpCode) {
      // User has TOTP enabled - show TOTP verification step
      setRequireTotp(true);
      setStep("totp");
      setError("");
    } else {
      setError(data.error);
    }
  }

  // Step indicator component
  function StepIndicator() {
    const steps = [
      { key: "welcome", label: "Dokumenti" },
      { key: "preview", label: "Shqyrto" },
      { key: "verify", label: "Verifiko" },
      ...(requireTotp ? [{ key: "totp", label: "2FA" }] : []),
      { key: "sign", label: "Nenshkruaj" },
    ];
    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <div className="flex items-center justify-center gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                  i <= currentIdx
                    ? "text-white shadow-md"
                    : "border-2 border-slate-300 text-slate-400 dark:border-slate-600"
                )}
                style={i <= currentIdx ? { backgroundColor: brandColor } : {}}
              >
                {i < currentIdx ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </div>
              <span className={cn("mt-1 text-[10px]", i <= currentIdx ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-400")}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn("mx-2 h-0.5 w-12 transition-all", i < currentIdx ? "" : "bg-slate-200 dark:bg-slate-700")}
                style={i < currentIdx ? { backgroundColor: brandColor } : {}}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-muted-foreground">Duke ngarkuar dokumentin...</p>
        </div>
      </div>
    );
  }

  if (!info && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Link i pavlefshem</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const expiresAt = info?.signingRequest?.expiresAt;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  if (isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Kerkesa ka skaduar</h2>
          <p className="mt-2 text-muted-foreground">Kjo kerkese per nenshkrim ka skaduar. Kontaktoni derguesin per nje kerkese te re.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header with branding */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {info?.signingRequest?.companyLogo ? (
              <img src={info.signingRequest.companyLogo} alt={companyName} className="h-10 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: brandColor }}>
                  <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-50">{companyName}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Nenshkrim Elektronik</p>
            <p className="text-xs text-slate-500">Siguruar nga doc.al</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Nenshkrim Elektronik</h1>
          {step !== "done" && (
            <div className="mt-4">
              <StepIndicator />
            </div>
          )}
        </div>

        {error && step !== "done" && (
          <Alert
            variant="destructive"
            title={error}
            className="mb-4"
          />
        )}

        {/* Step: Welcome */}
        {step === "welcome" && info && (
          <div className="space-y-4">
            {/* Signer greeting */}
            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Pershendetje {info.signerName},
                </h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                  Ju ftojme te nenshkruani dokumentet tuaja duke klikuar butonin me poshte:
                </p>
                {info.signingRequest?.message && (
                  <div className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    <span className="font-medium">Mesazh: </span>{info.signingRequest.message}
                  </div>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  Eshte thelbesome qe ta perfundoni nenshkrimin sa me shpejt.
                </p>
              </CardContent>
            </Card>

            {/* Document card */}
            <Card>
              <CardContent>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Dokument(et) per nenshkrim:
                </h3>
                <div className="flex items-start gap-4 rounded-xl border border-border bg-muted p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: brandColor + "15" }}>
                    <FileText className="h-6 w-6" style={{ color: brandColor }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">{info.document.title}</h4>
                    <p className="text-sm text-muted-foreground">{info.document.fileName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Derguar nga: {info.document.owner.name}
                    </p>
                  </div>
                  <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                </div>

                {/* Multi-signer progress */}
                {info.document.signatures.length > 1 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progresi i nenshkrimeve:</p>
                    <div className="space-y-2">
                      {info.document.signatures.map((sig, i) => (
                        <div key={sig.id} className="flex items-center gap-3 text-sm">
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                              sig.status === "SIGNED"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                                : sig.id === info.id
                                  ? "text-white"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}
                            style={sig.id === info.id && sig.status !== "SIGNED" ? { backgroundColor: brandColor } : {}}
                          >
                            {sig.status === "SIGNED" ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={cn("flex-1", sig.id === info.id ? "font-medium text-slate-900 dark:text-slate-100" : "text-muted-foreground")}>
                            {sig.signerName}
                            {sig.id === info.id && " (Ju)"}
                          </span>
                          <span className={cn("text-xs", sig.status === "SIGNED" ? "text-green-600" : "text-muted-foreground")}>
                            {sig.status === "SIGNED"
                              ? `Nenshkruar ${sig.signedAt ? new Date(sig.signedAt).toLocaleDateString("sq-AL") : ""}`
                              : "Ne pritje"
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {expiresAt && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Skadon me: {new Date(expiresAt).toLocaleDateString("sq-AL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </CardContent>
            </Card>

            <button
              onClick={() => setStep("preview")}
              className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: brandColor }}
            >
              Akseso hapesiren e nenshkrimit
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Nese nuk e prisni kete email, mund ta injoroni.
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && info && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-border bg-muted px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{info.document.title}</p>
                  <span className="text-xs text-muted-foreground">{info.document.fileName}</span>
                </div>
              </div>
              {/* PDF Preview area */}
              <div className="flex items-center justify-center bg-slate-100 p-8 dark:bg-slate-800" style={{ minHeight: "500px" }}>
                <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-md dark:bg-slate-900">
                  <div className="space-y-4">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-8 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
                      <p className="text-center text-sm text-slate-400">Dokumenti PDF do shfaqet ketu</p>
                      <p className="mt-1 text-center text-xs text-slate-300">{info.document.fileName}</p>
                    </div>
                    <div className="mt-12 flex justify-between">
                      <div>
                        <p className="text-[10px] uppercase text-slate-400">Nenshkrimi i nenshkruesit</p>
                        <div className="mt-1 h-16 w-40 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Data: ___/___/______</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Page navigation */}
              <div className="flex items-center justify-center gap-4 border-t border-border bg-muted px-6 py-3">
                <button className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-muted-foreground">1 / 1</span>
                <button className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </Card>

            <Alert
              variant="info"
              icon={<Info className="h-5 w-5" />}
              title="Shqyrtoni dokumentin me kujdes perpara se te vazhdoni me nenshkrim."
              description="Duke nenshkruar, pranoni kushtet e ketij dokumenti."
            />

            <button
              onClick={() => setStep("verify")}
              className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
              style={{ backgroundColor: brandColor }}
            >
              Vazhdo
            </button>

            <button
              onClick={() => setStep("welcome")}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Kthehu mbrapa
            </button>
          </div>
        )}

        {/* Step: Verify - OTP */}
        {step === "verify" && info && (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Dokument(et) per nenshkrim:
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Ju lutem klikoni butonin &laquo; Merr kodin e nenshkrimit &raquo; per ta marre:
                </p>

                <div className="mt-4 flex items-start gap-4 rounded-xl border border-border bg-muted p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: brandColor, color: brandColor }}>
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{info.document.title}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">{info.document.fileName}</span>
                    </div>
                  </div>
                </div>

                {/* Verification method selector */}
                <div className="mt-6">
                  <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Zgjidhni menyren e verifikimit:</p>
                  <div className="flex gap-3">
                    {(["EMAIL", "SMS", "SMS_VOICE"] as VerifyMethod[]).map((method) => (
                      <label
                        key={method}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm transition-all",
                          verifyMethod === method
                            ? "border-current font-medium"
                            : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700"
                        )}
                        style={verifyMethod === method ? { borderColor: brandColor, color: brandColor } : {}}
                      >
                        <input
                          type="radio"
                          name="verifyMethod"
                          value={method}
                          checked={verifyMethod === method}
                          onChange={() => setVerifyMethod(method)}
                          className="sr-only"
                        />
                        <div className={cn("h-4 w-4 rounded-full border-2", verifyMethod === method ? "border-current" : "border-slate-300 dark:border-slate-600")}>
                          {verifyMethod === method && (
                            <div className="m-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
                          )}
                        </div>
                        {method === "EMAIL" ? "Email" : method === "SMS" ? "SMS" : "SMS voice"}
                      </label>
                    ))}
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    onClick={handleSendOtp}
                    disabled={actionLoading}
                    className="mt-6 w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: brandColor }}
                  >
                    {actionLoading ? "Duke derguar..." : "Merr kodin e nenshkrimit"}
                  </button>
                ) : (
                  <div className="mt-6 space-y-4">
                    <Alert
                      variant="success"
                      title={
                        verifyMethod === "EMAIL"
                          ? `Nje kod 6-shifror u dergua ne ${info.signerEmail}`
                          : verifyMethod === "SMS"
                            ? "Nje kod 6-shifror u dergua me SMS"
                            : "Do merrni nje thirrje me kodin"
                      }
                    />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Vendosni kodin e nenshkrimit:
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                        className="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] transition-colors focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        style={{ borderColor: otpCode.length === 6 ? brandColor : undefined }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleSendOtp}
                        disabled={resendTimer > 0 || actionLoading}
                        className="text-sm font-medium disabled:text-slate-400"
                        style={{ color: resendTimer > 0 ? undefined : brandColor }}
                      >
                        {resendTimer > 0 ? `Ridergo pas ${resendTimer}s` : "Ridergo kodin"}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (otpCode.length === 6) setStep("sign");
                      }}
                      disabled={otpCode.length !== 6}
                      className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                      style={{ backgroundColor: brandColor }}
                    >
                      Vazhdo me nenshkrim
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            <button
              onClick={() => { setStep("preview"); setOtpSent(false); setOtpCode(""); }}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Kthehu mbrapa
            </button>
          </div>
        )}

        {/* Step: TOTP 2FA Verification */}
        {step === "totp" && info && (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: brandColor + "15" }}>
                    <ShieldCheck className="h-5 w-5" style={{ color: brandColor }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Verifikim 2FA
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Hapi shtese i sigurise
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Llogaria juaj ka verifikimin me dy faktore te aktivizuar. Fusni kodin 6-shifror nga aplikacioni Google Authenticator.
                </p>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Kodi 2FA:
                  </label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className="w-full rounded-xl border-2 border-slate-300 px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] transition-colors focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    style={{ borderColor: totpCode.length === 6 ? brandColor : undefined }}
                  />
                </div>

                <button
                  onClick={() => {
                    if (totpCode.length === 6) setStep("sign");
                  }}
                  disabled={totpCode.length !== 6}
                  className="mt-6 w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: brandColor }}
                >
                  Vazhdo me nenshkrim
                </button>
              </CardContent>
            </Card>

            <button
              onClick={() => { setStep("verify"); setTotpCode(""); }}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Kthehu mbrapa
            </button>
          </div>
        )}

        {/* Step: Sign */}
        {step === "sign" && info && (
          <div className="space-y-4">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Vizatoni nenshkrimin tuaj
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vizatoni nenshkrimin tuaj ne fushen me poshte duke perdorur miun ose gishtin.
                </p>

                <div className="mt-4 relative">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={180}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full cursor-crosshair rounded-xl border-2 border-dashed border-slate-300 bg-white touch-none dark:border-slate-600 dark:bg-slate-800"
                    style={hasDrawn ? { borderColor: brandColor, borderStyle: "solid" } : {}}
                  />
                  {!hasDrawn && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <p className="text-slate-300 dark:text-slate-600">Vizatoni nenshkrimin ketu</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={clearCanvas}
                  className="mt-2 text-xs font-medium hover:underline"
                  style={{ color: brandColor }}
                >
                  Pastro dhe rifillo
                </button>
              </CardContent>
            </Card>

            {/* eIDAS consent checkbox */}
            <Card>
              <CardContent>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Pranoj kushtet e nenshkrimit elektronik sipas Rregullores eIDAS (BE Nr. 910/2014) dhe Ligjit Nr. 9880 per Nenshkrimin Elektronik. Duke nenshkruar dokumentin <strong>&ldquo;{info.document.title}&rdquo;</strong>, deklaroj se kam lexuar e kuptuar permbajtjen dhe bie dakord qe nenshkrimi im elektronik ka te njejten vlere juridike si nenshkrimi doreskrimi.
                  </span>
                </label>
              </CardContent>
            </Card>

            <button
              onClick={handleVerifyAndSign}
              disabled={actionLoading || !hasDrawn || !accepted}
              className="w-full rounded-xl py-4 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {actionLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Duke nenshkruar...
                </span>
              ) : (
                "Nenshkruaj Dokumentin"
              )}
            </button>

            <button
              onClick={() => setStep("verify")}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Kthehu mbrapa
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950/30">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-200">
                <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                Dokumenti u nenshkrua me sukses!
              </h3>
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">
                Nenshkrimi juaj eshte regjistruar ne zinxhirin e verifikimit dhe do te ankorohet ne Bitcoin blockchain per prove te pandryshueshme.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <ShieldCheck className="h-4 w-4" />
                Verifikuar & Regjistruar
              </div>
            </div>

            {/* Other signers status */}
            {info && info.document.signatures.length > 1 && (
              <Card>
                <CardContent>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Statusi i nenshkrimeve:</h4>
                  <div className="space-y-2">
                    {info.document.signatures.map((sig) => (
                      <div key={sig.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                        <span className="text-sm text-foreground">{sig.signerName}</span>
                        <Badge variant={sig.status === "SIGNED" || sig.id === info.id ? "success" : "warning"}>
                          {sig.status === "SIGNED" || sig.id === info.id ? "Nenshkruar" : "Ne pritje"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-center text-xs text-muted-foreground">
              <p>Nenshkrimi u sigurua nga doc.al - Platforma e Nenshkrimit Elektronik</p>
              <p className="mt-1">Mund ta mbyllni kete faqe.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
          <p className="text-xs text-muted-foreground">Siguruar nga doc.al</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Lidhje e sigurt
          </div>
        </div>
      </footer>
    </div>
  );
}
