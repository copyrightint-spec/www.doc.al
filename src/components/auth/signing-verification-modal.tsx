"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <ShieldCheck className="h-6 w-6 text-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Verifikimi i Nenshkrimit
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "otp" && "Hapi 1/2 - Kodi i emailit"}
              {step === "totp" && "Hapi 2/2 - Google Authenticator"}
              {step === "check" && "Duke kontrolluar..."}
              {step === "error" && "Nuk mund te nenshkruani"}
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              title={error}
              className="mb-4"
            />
          )}

          {step === "error" && redirectTo && (
            <div className="space-y-4">
              <Button className="w-full" asChild>
                <a href={redirectTo}>Shko ne Settings</a>
              </Button>
              <Button variant="ghost" className="w-full" onClick={onCancel}>
                Anulo
              </Button>
            </div>
          )}

          {step === "otp" && (
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
                disabled={loading || otpCode.length !== 6}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Duke verifikuar..." : "Verifiko Kodin"}
              </Button>
              <Button variant="ghost" type="button" onClick={onCancel} className="w-full">
                Anulo
              </Button>
            </form>
          )}

          {step === "totp" && (
            <form onSubmit={handleTotpVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Fut kodin nga Google Authenticator.
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
                disabled={loading || totpCode.length !== 6}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Duke verifikuar..." : "Nenshkruaj"}
              </Button>
              <Button variant="ghost" type="button" onClick={onCancel} className="w-full">
                Anulo
              </Button>
            </form>
          )}

          {step === "check" && (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
