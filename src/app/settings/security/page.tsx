"use client";

import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, Lock, KeyRound, Check } from "lucide-react";
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
    <div className="mx-auto max-w-xl p-8">
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
              className="mt-4"
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
                  className="w-full"
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
              className="w-full"
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
