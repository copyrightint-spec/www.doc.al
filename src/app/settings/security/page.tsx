"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ShieldCheck, Lock, KeyRound, Check, Copy, Printer, RefreshCw, Mail } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

type TotpStatus = "loading" | "idle" | "setup" | "verified";
type ReconfigStep = "password" | "email-otp" | "new-setup" | "new-verify";

export default function SecuritySettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<TotpStatus>("loading");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reconfiguration state
  const [reconfiguring, setReconfiguring] = useState(false);
  const [reconfigStep, setReconfigStep] = useState<ReconfigStep>("password");
  const [reconfigPassword, setReconfigPassword] = useState("");
  const [reconfigEmailOtp, setReconfigEmailOtp] = useState("");
  const [reconfigNewToken, setReconfigNewToken] = useState("");
  const [reconfigError, setReconfigError] = useState("");
  const [reconfigLoading, setReconfigLoading] = useState(false);
  const [reconfigQrCode, setReconfigQrCode] = useState<string | null>(null);
  const [reconfigSecret, setReconfigSecret] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  // Check existing TOTP status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/settings/totp/status");
        if (res.ok) {
          const data = await res.json();
          if (data.totpEnabled) {
            setStatus("verified");
          } else {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      } catch {
        setStatus("idle");
      }
    }
    checkStatus();
  }, []);

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStatus("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("verified");
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setCodesAcknowledged(false);
        setShowBackupCodesModal(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kodi i gabuar");
    } finally {
      setLoading(false);
    }
  }

  // Reconfiguration flow
  function startReconfigure() {
    setReconfiguring(true);
    setReconfigStep("password");
    setReconfigPassword("");
    setReconfigEmailOtp("");
    setReconfigNewToken("");
    setReconfigError("");
    setReconfigQrCode(null);
    setReconfigSecret(null);
    setEmailSent(false);
  }

  function cancelReconfigure() {
    setReconfiguring(false);
    setReconfigStep("password");
    setReconfigError("");
  }

  async function handleReconfigPasswordVerify(e: React.FormEvent) {
    e.preventDefault();
    setReconfigError("");
    setReconfigLoading(true);
    try {
      const res = await fetch("/api/settings/totp/reconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify-password", password: reconfigPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Password verified, send email OTP
      setReconfigStep("email-otp");
      setEmailSent(true);
    } catch (err) {
      setReconfigError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setReconfigLoading(false);
    }
  }

  async function handleReconfigEmailVerify(e: React.FormEvent) {
    e.preventDefault();
    setReconfigError("");
    setReconfigLoading(true);
    try {
      const res = await fetch("/api/settings/totp/reconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify-email-otp", code: reconfigEmailOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Both verified, get new QR code
      setReconfigQrCode(data.qrCode);
      setReconfigSecret(data.secret);
      setReconfigStep("new-setup");
    } catch (err) {
      setReconfigError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setReconfigLoading(false);
    }
  }

  async function handleReconfigNewVerify(e: React.FormEvent) {
    e.preventDefault();
    setReconfigError("");
    setReconfigLoading(true);
    try {
      const res = await fetch("/api/settings/totp/reconfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify-new-totp", token: reconfigNewToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReconfiguring(false);
      setStatus("verified");
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setCodesAcknowledged(false);
        setShowBackupCodesModal(true);
      }
    } catch (err) {
      setReconfigError(err instanceof Error ? err.message : "Kodi i gabuar");
    } finally {
      setReconfigLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword || !totpCode) {
      setPwError("Te gjitha fushat jane te detyrueshme");
      return;
    }

    if (newPassword.length < 8) {
      setPwError("Fjalekalimi i ri duhet te kete te pakten 8 karaktere");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("Fjalekalimet e reja nuk perputhen");
      return;
    }

    if (totpCode.length !== 6) {
      setPwError("Kodi 2FA duhet te jete 6 shifra");
      return;
    }

    setPwLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTotpCode("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Ndodhi nje gabim");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Siguria"
        subtitle="Konfiguro autentifikimin me dy faktor (2FA) per te nenshkruar dokumente."
      />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Google Authenticator (TOTP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Kerkohet per nenshkrim te dokumentave. Skanoni QR kodin me Google Authenticator.
          </p>

          {error && (
            <div className="mt-4">
              <Alert variant="destructive" title={error} />
            </div>
          )}

          {status === "loading" && (
            <div className="mt-4 flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          )}

          {status === "idle" && (
            <Button
              onClick={handleSetup}
              disabled={loading}
              className="mt-4 w-full sm:w-auto min-h-[48px]"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Duke konfiguruar...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Aktivizo 2FA
                </>
              )}
            </Button>
          )}

          {status === "setup" && qrCode && (
            <div className="mt-6 space-y-6">
              {/* Step 1: Scan QR */}
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="mb-4 text-center text-sm font-medium text-foreground">
                  Hapi 1: Skanoni QR kodin me Google Authenticator
                </p>
                <div className="flex justify-center rounded-lg bg-white p-4 mx-auto w-fit">
                  <Image src={qrCode} alt="TOTP QR Code" width={180} height={180} unoptimized />
                </div>
                {secret && (
                  <div className="mt-4 rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] text-center text-muted-foreground mb-1">Ose futni kodin manual:</p>
                    <div className="overflow-x-auto">
                      <code className="block text-center text-[11px] font-mono text-foreground break-all leading-relaxed">
                        {secret}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Enter code */}
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="mb-4 text-center text-sm font-medium text-foreground">
                  Hapi 2: Futni kodin 6-shifror nga aplikacioni
                </p>
                <form onSubmit={handleVerify} className="space-y-4">
                  <Input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-muted/30"
                  />
                  <Button
                    type="submit"
                    disabled={loading || token.length !== 6}
                    className="w-full min-h-[48px]"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Duke verifikuar...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Verifiko & Aktivizo
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {status === "verified" && !reconfiguring && (
            <div className="mt-4 space-y-4">
              <Alert
                variant="success"
                icon={<Check className="h-4 w-4" />}
                title="2FA i konfiguruar"
              />
              <Button
                variant="secondary"
                onClick={startReconfigure}
                className="w-full sm:w-auto min-h-[48px]"
              >
                <RefreshCw className="h-4 w-4" />
                Rikonfiguro 2FA
              </Button>
            </div>
          )}

          {/* Reconfiguration Flow */}
          {status === "verified" && reconfiguring && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Rikonfiguro 2FA</h4>
                  <button
                    onClick={cancelReconfigure}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Anulo
                  </button>
                </div>

                {/* Progress indicator */}
                <div className="mb-6 flex items-center justify-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${reconfigStep === "password" ? "bg-primary" : "bg-green-500"}`} />
                  <div className={`h-0.5 w-8 ${reconfigStep !== "password" ? "bg-green-500" : "bg-border"}`} />
                  <div className={`h-2 w-2 rounded-full ${reconfigStep === "email-otp" ? "bg-primary" : reconfigStep === "new-setup" || reconfigStep === "new-verify" ? "bg-green-500" : "bg-border"}`} />
                  <div className={`h-0.5 w-8 ${reconfigStep === "new-setup" || reconfigStep === "new-verify" ? "bg-green-500" : "bg-border"}`} />
                  <div className={`h-2 w-2 rounded-full ${reconfigStep === "new-setup" || reconfigStep === "new-verify" ? "bg-primary" : "bg-border"}`} />
                </div>

                {reconfigError && (
                  <div className="mb-4">
                    <Alert variant="destructive" title={reconfigError} />
                  </div>
                )}

                {/* Step 1: Password verification */}
                {reconfigStep === "password" && (
                  <form onSubmit={handleReconfigPasswordVerify} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Futni fjalekalimin tuaj aktual per te vazhduar.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Fjalekalimi
                      </label>
                      <Input
                        type="password"
                        value={reconfigPassword}
                        onChange={(e) => setReconfigPassword(e.target.value)}
                        placeholder="Fut fjalekalimin aktual"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={reconfigLoading || !reconfigPassword}
                      className="w-full min-h-[48px]"
                    >
                      {reconfigLoading ? (
                        <>
                          <Spinner size="sm" />
                          Duke verifikuar...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Verifiko Fjalekalimin
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Step 2: Email OTP verification */}
                {reconfigStep === "email-otp" && (
                  <form onSubmit={handleReconfigEmailVerify} className="space-y-4">
                    {emailSent && (
                      <Alert
                        variant="info"
                        icon={<Mail className="h-4 w-4" />}
                        title="Kodi u dergua ne email-in tuaj"
                      />
                    )}
                    <p className="text-sm text-muted-foreground">
                      Futni kodin 6-shifror qe u dergua ne email-in tuaj.
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Kodi i Email-it
                      </label>
                      <Input
                        type="text"
                        value={reconfigEmailOtp}
                        onChange={(e) => setReconfigEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-muted/30"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={reconfigLoading || reconfigEmailOtp.length !== 6}
                      className="w-full min-h-[48px]"
                    >
                      {reconfigLoading ? (
                        <>
                          <Spinner size="sm" />
                          Duke verifikuar...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Verifiko Kodin
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Step 3: New QR code setup */}
                {(reconfigStep === "new-setup" || reconfigStep === "new-verify") && reconfigQrCode && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="mb-4 text-center text-sm font-medium text-foreground">
                        Skanoni QR kodin e ri me Google Authenticator
                      </p>
                      <div className="flex justify-center rounded-lg bg-white p-4 mx-auto w-fit">
                        <Image src={reconfigQrCode} alt="TOTP QR Code" width={180} height={180} unoptimized />
                      </div>
                      {reconfigSecret && (
                        <div className="mt-4 rounded-lg bg-muted/50 p-3">
                          <p className="text-[11px] text-center text-muted-foreground mb-1">Ose futni kodin manual:</p>
                          <div className="overflow-x-auto">
                            <code className="block text-center text-[11px] font-mono text-foreground break-all leading-relaxed">
                              {reconfigSecret}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleReconfigNewVerify} className="space-y-4">
                      <p className="text-center text-sm text-muted-foreground">
                        Futni kodin 6-shifror nga aplikacioni
                      </p>
                      <Input
                        type="text"
                        value={reconfigNewToken}
                        onChange={(e) => setReconfigNewToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-muted/30"
                      />
                      <Button
                        type="submit"
                        disabled={reconfigLoading || reconfigNewToken.length !== 6}
                        className="w-full min-h-[48px]"
                      >
                        {reconfigLoading ? (
                          <>
                            <Spinner size="sm" />
                            Duke verifikuar...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Verifiko & Aktivizo
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-foreground mb-2">Kodet e Backup-it</h2>
            <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-3 mb-4">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Ruajini keto kode ne nje vend te sigurt. Nuk do shfaqen me.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {backupCodes.map((code, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-muted px-3 py-2 text-center font-mono text-lg font-bold text-foreground tracking-wider"
                >
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join("\n"));
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Kopjo te gjitha
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-1" />
                Printo
              </Button>
            </div>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={codesAcknowledged}
                onChange={(e) => setCodesAcknowledged(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm text-foreground">I kam ruajtur kodet</span>
            </label>
            <Button
              className="w-full"
              disabled={!codesAcknowledged}
              onClick={() => {
                setShowBackupCodesModal(false);
                setBackupCodes([]);
                setCodesAcknowledged(false);
              }}
            >
              Mbyll
            </Button>
          </div>
        </div>
      )}

      {/* Password Change Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Ndrysho Fjalekalimin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Per te ndryshuar fjalekalimin duhet te keni 2FA te aktivizuar dhe te vendosni kodin 2FA.
          </p>

          {pwError && (
            <div className="mt-4">
              <Alert variant="destructive" title={pwError} />
            </div>
          )}

          {pwSuccess && (
            <div className="mt-4">
              <Alert
                variant="success"
                icon={<Check className="h-4 w-4" />}
                title={pwSuccess}
              />
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Fjalekalimi aktual
              </label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Fut fjalekalimin aktual"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Fjalekalimi i ri
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 karaktere"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Konfirmo fjalekalimin e ri
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Perserit fjalekalimin e ri"
                className="mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Kodi 2FA (TOTP)
              </label>
              <Input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Fut kodin 6-shifror nga aplikacioni"
                maxLength={6}
                className="mt-1 text-center text-lg font-mono tracking-widest"
              />
            </div>

            <Button
              type="submit"
              disabled={pwLoading}
              variant="destructive"
              className="w-full min-h-[48px]"
            >
              {pwLoading ? (
                <>
                  <Spinner size="sm" />
                  Duke ndryshuar...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Ndrysho Fjalekalimin
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
