"use client";

import { useState, useEffect } from "react";

interface Props {
  onVerified: () => void;
  onCancel: () => void;
}

export function SigningVerificationModal({ onVerified, onCancel }: Props) {
  const [step, setStep] = useState<"check" | "otp" | "totp" | "error">("check");
  const [otpCode, setOtpCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    checkCanSign();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function checkCanSign() {
    const res = await fetch("/api/signing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check" }),
    });
    const data = await res.json();

    if (data.canSign) {
      await sendOtp();
    } else {
      setError(data.reason);
      setRedirectTo(data.redirectTo);
      setStep("error");
    }
  }

  async function sendOtp() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/signing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp" }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStep("otp");
      setCountdown(300); // 5 min
    } else {
      setError(data.error);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/signing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-otp", code: otpCode }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setStep("totp");
    } else {
      setError(data.error);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/signing/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-totp", token: totpCode }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok && data.verified) {
      onVerified();
    } else {
      setError(data.error);
    }
  }

  function formatCountdown(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Verifikimi i Nenshkrimit
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {step === "otp" && "Hapi 1/2 - Kodi i emailit"}
            {step === "totp" && "Hapi 2/2 - Google Authenticator"}
            {step === "check" && "Duke kontrolluar..."}
            {step === "error" && "Nuk mund te nenshkruani"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {step === "error" && redirectTo && (
          <div className="space-y-4">
            <a
              href={redirectTo}
              className="block w-full rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Shko ne Settings
            </a>
            <button onClick={onCancel} className="w-full text-sm text-zinc-500 hover:underline">
              Anulo
            </button>
          </div>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpVerify} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Nje kod 6-shifror u dergua ne emailin tuaj.
              {countdown > 0 && (
                <span className="ml-2 text-zinc-400">
                  Skadon per {formatCountdown(countdown)}
                </span>
              )}
            </p>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Duke verifikuar..." : "Verifiko Kodin"}
            </button>
            <button type="button" onClick={onCancel} className="w-full text-sm text-zinc-500 hover:underline">
              Anulo
            </button>
          </form>
        )}

        {step === "totp" && (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Fut kodin nga Google Authenticator.
            </p>
            <input
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {loading ? "Duke verifikuar..." : "Nenshkruaj"}
            </button>
            <button type="button" onClick={onCancel} className="w-full text-sm text-zinc-500 hover:underline">
              Anulo
            </button>
          </form>
        )}

        {step === "check" && (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
          </div>
        )}
      </div>
    </div>
  );
}
