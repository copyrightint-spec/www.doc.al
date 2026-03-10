"use client";

import { useState, useEffect, useRef, use } from "react";

interface SignatureInfo {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  document: { id: string; title: string; fileName: string };
}

export default function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [info, setInfo] = useState<SignatureInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"view" | "otp" | "sign" | "done">("view");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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
        setError(data.error || "Link i pavlefshem");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
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
  }

  async function handleSendOtp() {
    setSigning(true);
    setError("");
    const res = await fetch(`/api/sign/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp" }),
    });
    const data = await res.json();
    setSigning(false);
    if (res.ok) {
      setStep("otp");
    } else {
      setError(data.error);
    }
  }

  async function handleVerifyAndSign() {
    setSigning(true);
    setError("");

    // Get signature image from canvas
    const canvas = canvasRef.current;
    const signatureImage = canvas?.toDataURL("image/png").split(",")[1] || "";

    const res = await fetch(`/api/sign/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify-and-sign",
        code: otpCode,
        signatureImage,
      }),
    });
    const data = await res.json();
    setSigning(false);

    if (res.ok && data.success) {
      setStep("done");
    } else {
      setError(data.error);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
      </div>
    );
  }

  if (!info && error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            doc.al - Nenshkrim Dokumenti
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {info && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {info.document.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Per: {info.signerName} ({info.signerEmail})
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {step === "view" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-zinc-500">PDF Preview</p>
              <p className="mt-2 text-sm text-zinc-400">{info?.document.fileName}</p>
            </div>
            <button
              onClick={handleSendOtp}
              disabled={signing}
              className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {signing ? "Duke derguar..." : "Vazhdo me Nenshkrim"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Nenshkruani me vizatim
              </h3>
              <canvas
                ref={canvasRef}
                width={500}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="mt-4 w-full cursor-crosshair rounded-lg border-2 border-dashed border-zinc-300 bg-white dark:border-zinc-600"
              />
              <button
                onClick={clearCanvas}
                className="mt-2 text-xs text-zinc-500 hover:underline"
              >
                Pastro
              </button>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Verifikimi - Kodi i emailit
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Nje kod 6-shifror u dergua ne {info?.signerEmail}
              </p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="mt-4 w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-xl font-mono tracking-[0.5em] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <button
              onClick={handleVerifyAndSign}
              disabled={signing || otpCode.length !== 6}
              className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {signing ? "Duke nenshkruar..." : "Verifiko & Nenshkruaj"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
              Dokumenti u nenshkrua me sukses!
            </h3>
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Nenshkrimi juaj eshte regjistruar ne chain dhe do te verifikohet ne Bitcoin blockchain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
