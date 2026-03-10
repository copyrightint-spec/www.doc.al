"use client";

import { useState } from "react";
import Image from "next/image";

export default function SecuritySettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "setup" | "verified">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Siguria
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Konfiguro autentifikimin me dy faktor (2FA) per te nenshkruar dokumente.
      </p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Google Authenticator (TOTP)
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Kerkohet per nenshkrim te dokumentave. Skanoni QR kodin me Google Authenticator.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {status === "idle" && (
          <button
            onClick={handleSetup}
            disabled={loading}
            className="mt-4 rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Duke konfiguruar..." : "Aktivizo 2FA"}
          </button>
        )}

        {status === "setup" && qrCode && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-center">
              <Image src={qrCode} alt="TOTP QR Code" width={200} height={200} />
            </div>
            {secret && (
              <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">Kodi manual:</p>
                <code className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {secret}
                </code>
              </div>
            )}
            <form onSubmit={handleVerify} className="space-y-3">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Fut kodin 6-shifror"
                maxLength={6}
                className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-center text-lg font-mono tracking-widest outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={loading || token.length !== 6}
                className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {loading ? "Duke verifikuar..." : "Verifiko & Aktivizo"}
              </button>
            </form>
          </div>
        )}

        {status === "verified" && (
          <div className="mt-4 rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              2FA u aktivizua me sukses!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
