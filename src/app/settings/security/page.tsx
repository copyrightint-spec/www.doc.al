"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, Lock, KeyRound, Check, Copy, Printer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

export default function SecuritySettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "setup" | "verified">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
            <div className="mt-6 space-y-4">
              <div className="flex justify-center">
                <Image src={qrCode} alt="TOTP QR Code" width={200} height={200} />
              </div>
              {secret && (
                <div className="rounded-xl bg-muted p-3 text-center">
                  <p className="text-xs text-muted-foreground">Kodi manual:</p>
                  <code className="text-sm font-mono font-bold text-foreground">
                    {secret}
                  </code>
                </div>
              )}
              <form onSubmit={handleVerify} className="space-y-3">
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Fut kodin 6-shifror"
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-widest"
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
                    "Verifiko & Aktivizo"
                  )}
                </Button>
              </form>
            </div>
          )}

          {status === "verified" && (
            <div className="mt-4">
              <Alert
                variant="success"
                icon={<Check className="h-4 w-4" />}
                title="2FA u aktivizua me sukses!"
              />
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
