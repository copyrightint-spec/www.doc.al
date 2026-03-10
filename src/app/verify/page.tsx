"use client";

import { useState } from "react";
import Link from "next/link";

interface VerifyResult {
  found: boolean;
  fingerprint: string;
  sequenceNumber?: number;
  sequentialFingerprint?: string;
  type?: string;
  serverTimestamp?: string;
  btcTxId?: string | null;
  btcBlockHeight?: number | null;
  otsStatus?: string;
  message?: string;
  document?: { id: string; title: string; fileName: string } | null;
  signature?: { id: string; signerName: string; signerEmail: string; signedAt: string } | null;
}

type VerifyMethod = "file" | "certificate" | "hash" | "offline";

export default function VerifyPage() {
  const [method, setMethod] = useState<VerifyMethod>("file");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hashInput, setHashInput] = useState("");

  async function handleFileVerify(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/timestamp/verify", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Ndodhi nje gabim");
    } finally {
      setLoading(false);
    }
  }

  async function handleHashVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!hashInput || !/^[a-f0-9]{64}$/i.test(hashInput)) {
      setError("Fut nje hash SHA-256 te vlefshem (64 karaktere hex)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/timestamp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hashInput }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Ndodhi nje gabim");
    } finally {
      setLoading(false);
    }
  }

  async function handleCertificateVerify(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/timestamp/verify", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError("Ndodhi nje gabim");
    } finally {
      setLoading(false);
    }
  }

  const methods = [
    { id: "file" as const, label: "Original File", desc: "(single-file timestamp)" },
    { id: "certificate" as const, label: "Certificate", desc: "(needed for multiple files)" },
    { id: "hash" as const, label: "SHA-2 Fingerprint", desc: "" },
    { id: "offline" as const, label: "Offline", desc: "" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">doc.al</Link>
            <h1 className="mt-1 text-sm text-zinc-500">Verify Time Stamp</h1>
          </div>
          <Link href="/explorer" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            Explorer &rarr;
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Method Tabs */}
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMethod(m.id); setResult(null); setError(""); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                method === m.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
              }`}
            >
              {m.label} <span className="text-xs opacity-60">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Verify Forms */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {method === "file" && (
            <form onSubmit={handleFileVerify} className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/30">
                <input type="file" className="hidden" id="verify-file" />
                <label htmlFor="verify-file" className="cursor-pointer">
                  <p className="font-medium text-green-800 dark:text-green-300">Original File</p>
                  <p className="text-xs text-green-600 dark:text-green-400">(single-file timestamp)</p>
                </label>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
                {loading ? "Duke verifikuar..." : "Send Fingerprint & Verify"}
              </button>
            </form>
          )}

          {method === "certificate" && (
            <form onSubmit={handleCertificateVerify} className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
                <input type="file" accept=".ots,.p7s,.pem,.crt" className="hidden" id="verify-cert" />
                <label htmlFor="verify-cert" className="cursor-pointer">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">Certificate</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">(needed for multiple files)</p>
                </label>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
                {loading ? "Duke verifikuar..." : "Upload Certificate & Verify"}
              </button>
            </form>
          )}

          {method === "hash" && (
            <form onSubmit={handleHashVerify} className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
                <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                  SHA-2 Fingerprint:
                </label>
                <input
                  type="text"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value.trim())}
                  placeholder="Fut SHA-256 hash (64 hex characters)..."
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 font-mono text-sm dark:border-blue-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
                {loading ? "Duke verifikuar..." : "Verify"}
              </button>
            </form>
          )}

          {method === "offline" && (
            <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Offline Verification Instructions</h3>
              <p>Per te verifikuar nje timestamp offline duke perdorur OpenTimestamps:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Instaloni OpenTimestamps client: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">pip install opentimestamps-client</code></li>
                <li>Shkarkoni skedarin .ots nga faqja e detajeve te timestamp-it</li>
                <li>Ekzekutoni: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">ots verify document.ots</code></li>
                <li>Per upgrade te proof-it: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-xs">ots upgrade document.ots</code></li>
              </ol>
              <p className="text-xs text-zinc-500">
                Verifikimi offline garanton qe nuk keni nevoje te besoni serverin tone - mund te verifikoni direkt ne Bitcoin blockchain.
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-xl border p-6 ${
            result.found
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
                result.found
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}>
                {result.found ? "I VLEFSHËM" : "I PAVLEFSHËM"}
              </span>
            </div>

            {result.found ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Chain Position</dt>
                  <dd>
                    <Link href={`/explorer/${result.sequenceNumber}`} className="font-mono font-bold text-blue-600 hover:underline">
                      #{result.sequenceNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Timestamp</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {result.serverTimestamp && new Date(result.serverTimestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Fingerprint</dt>
                  <dd className="break-all font-mono text-xs">{result.fingerprint}</dd>
                </div>
                {result.otsStatus === "CONFIRMED" && result.btcBlockHeight && (
                  <div>
                    <dt className="text-xs text-zinc-500">Bitcoin Block</dt>
                    <dd className="font-medium text-green-700 dark:text-green-400">
                      Block #{result.btcBlockHeight}
                    </dd>
                  </div>
                )}
                {result.signature && (
                  <div>
                    <dt className="text-xs text-zinc-500">Nenshkruar nga</dt>
                    <dd>{result.signature.signerName} ({result.signature.signerEmail})</dd>
                  </div>
                )}
                {result.document && (
                  <div>
                    <dt className="text-xs text-zinc-500">Dokument</dt>
                    <dd>{result.document.title} ({result.document.fileName})</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-red-700 dark:text-red-400">
                {result.message || "Ky hash nuk u gjet ne chain"}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
