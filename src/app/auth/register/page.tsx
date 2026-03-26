"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserPlus, Loader2, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TurnstileCaptcha } from "@/components/ui/turnstile";

type Step = "register" | "verify" | "success";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Send verification email
      const emailRes = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, action: "send" }),
      });

      if (!emailRes.ok) {
        // Registration succeeded but email failed - still go to verify step
        console.error("Failed to send verification email");
      }

      setStep("verify");
      startResendCooldown();
    } catch {
      setError("Ndodhi nje gabim. Provoni perseri.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          action: "verify",
          code: verificationCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setStep("success");
    } catch {
      setError("Ndodhi nje gabim. Provoni perseri.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, action: "send" }),
      });

      if (res.ok) {
        startResendCooldown();
      } else {
        const data = await res.json();
        setError(data.error || "Nuk u dergua kodi");
      }
    } catch {
      setError("Ndodhi nje gabim");
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
          >
            Hyr
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-6 sm:mb-8 text-center">
              <Image src="/api/logo" unoptimized alt="doc.al" width={80} height={80} className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">
                doc<span className="text-blue-600">.al</span>
              </h1>
            </div>

            {/* Step indicator */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className={`h-2 w-2 rounded-full ${step === "register" ? "bg-blue-600" : "bg-green-500"}`} />
              <div className={`h-0.5 w-8 ${step !== "register" ? "bg-green-500" : "bg-border"}`} />
              <div className={`h-2 w-2 rounded-full ${step === "verify" ? "bg-blue-600" : step === "success" ? "bg-green-500" : "bg-border"}`} />
              <div className={`h-0.5 w-8 ${step === "success" ? "bg-green-500" : "bg-border"}`} />
              <div className={`h-2 w-2 rounded-full ${step === "success" ? "bg-green-500" : "bg-border"}`} />
            </div>

            {/* STEP 1: Registration Form */}
            {step === "register" && (
              <>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  Filloni te perdorni doc.al per nenshkrime elektronike
                </p>

                <form onSubmit={handleRegister} className="space-y-4">
                  {error && <Alert variant="destructive" title={error} />}

                  <div>
                    <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
                      Emri i plote
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Emri Mbiemri"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      placeholder="email@shembull.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                      Fjalekalimi
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={10}
                      placeholder="Min. 10 karaktere (A-z, 0-9, !@#)"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Duhet te permbaje: shkronje te madhe, te vogel, numer, dhe simbol
                    </p>
                  </div>

                  <div>
                    <label htmlFor="org" className="mb-1 block text-sm font-medium text-foreground">
                      Organizata <span className="text-muted-foreground">(opsionale)</span>
                    </label>
                    <Input
                      id="org"
                      type="text"
                      value={form.organizationName}
                      onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                      placeholder="Emri i kompanise"
                    />
                  </div>

                  <TurnstileCaptcha
                    onVerify={setCaptchaToken}
                    onExpire={() => setCaptchaToken("")}
                    className="flex justify-center"
                  />

                  <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Duke regjistruar...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Regjistrohu
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Keni llogari?{" "}
                  <Link href="/auth/login" className="font-medium text-foreground hover:underline">
                    Hyr
                  </Link>
                </p>
              </>
            )}

            {/* STEP 2: Email Verification */}
            {step === "verify" && (
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Verifikoni Email-in</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Kemi derguar nje kod 6-shifror ne{" "}
                    <span className="font-medium text-foreground">{form.email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  {error && <Alert variant="destructive" title={error} />}

                  <div>
                    <label htmlFor="code" className="mb-1 block text-sm font-medium text-foreground">
                      Kodi i verifikimit
                    </label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      required
                      placeholder="000000"
                      className="text-center text-2xl font-mono tracking-[0.5em]"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Kodi skadon pas 5 minutash</p>
                  </div>

                  <Button type="submit" disabled={loading || verificationCode.length !== 6} className="w-full min-h-[48px]">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Duke verifikuar...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Verifiko
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] px-4"
                  >
                    {resendCooldown > 0
                      ? `Ridergoni kodin pas ${resendCooldown}s`
                      : "Nuk e morret kodin? Ridergoni"}
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: Success */}
            {step === "success" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Llogaria u verifikua me sukses!</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Faleminderit qe u regjistruat ne doc.al! Tani mund te hyni ne llogarine tuaj
                  dhe te beni verifikimin e ID-se per te marre sherbimet tona sa me shpejt te jete e mundur.
                </p>

                <div className="mt-6 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Hapi tjeter:</strong> Pas hyrjes, shkoni te{" "}
                    <span className="font-medium">Cilesimet &gt; Verifikimi KYC</span>{" "}
                    per te ngarkuar dokumentin tuaj te identifikimit.
                  </p>
                </div>

                <Link href="/auth/login" className="mt-6 block">
                  <Button className="w-full min-h-[48px]">
                    <ArrowRight className="h-4 w-4" />
                    Hyni ne llogari
                  </Button>
                </Link>

                <p className="mt-3 text-xs text-muted-foreground">
                  Email: <span className="font-medium">{form.email}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
