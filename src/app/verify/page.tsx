"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileCheck,
  Hash,
  Shield,
  Terminal,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

interface VerifyResult {
  found: boolean;
  fingerprint: string;
  sequenceNumber?: number;
  sequentialFingerprint?: string;
  type?: string;
  serverTimestamp?: string;
  otsStatus?: string;
  polygonTxHash?: string | null;
  polygonBlockNumber?: number | null;
  message?: string;
  document?: {
    id: string;
    title: string;
    fileName: string;
  } | null;
  signature?: {
    id: string;
    signerName: string;
    signerEmail: string;
    signedAt: string;
  } | null;
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
    const fileInput = form.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
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
    const fileInput = form.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
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
    {
      id: "file" as const,
      label: "Original File",
      desc: "(single-file timestamp)",
      icon: <Upload className="h-4 w-4" />,
    },
    {
      id: "certificate" as const,
      label: "Certificate",
      desc: "(needed for multiple files)",
      icon: <FileCheck className="h-4 w-4" />,
    },
    {
      id: "hash" as const,
      label: "SHA-2 Fingerprint",
      desc: "",
      icon: <Hash className="h-4 w-4" />,
    },
    {
      id: "offline" as const,
      label: "Offline",
      desc: "",
      icon: <Terminal className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <Link href="/" className="text-xl font-bold text-foreground">
              doc.al
            </Link>
            <h1 className="mt-1 text-sm text-muted-foreground">
              Verify Time Stamp
            </h1>
          </div>
          <Link
            href="/explorer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Explorer
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Method Tabs */}
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <Button
              key={m.id}
              variant={method === m.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setMethod(m.id);
                setResult(null);
                setError("");
              }}
              className="gap-1.5"
            >
              {m.icon}
              {m.label}{" "}
              {m.desc && (
                <span className="text-xs opacity-60">{m.desc}</span>
              )}
            </Button>
          ))}
        </div>

        {/* Verify Forms */}
        <Card>
          <CardContent className="p-6">
            {method === "file" && (
              <form onSubmit={handleFileVerify} className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950/30">
                  <input type="file" className="hidden" id="verify-file" />
                  <label htmlFor="verify-file" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
                    <p className="mt-2 font-medium text-green-800 dark:text-green-300">
                      Original File
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      (single-file timestamp)
                    </p>
                  </label>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Duke verifikuar...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Send Fingerprint & Verify
                    </>
                  )}
                </Button>
              </form>
            )}

            {method === "certificate" && (
              <form onSubmit={handleCertificateVerify} className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-6 text-center dark:border-yellow-800 dark:bg-yellow-950/30">
                  <input
                    type="file"
                    accept=".ots,.p7s,.pem,.crt"
                    className="hidden"
                    id="verify-cert"
                  />
                  <label htmlFor="verify-cert" className="cursor-pointer">
                    <FileCheck className="mx-auto h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    <p className="mt-2 font-medium text-yellow-800 dark:text-yellow-300">
                      Certificate
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      (needed for multiple files)
                    </p>
                  </label>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Duke verifikuar...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Upload Certificate & Verify
                    </>
                  )}
                </Button>
              </form>
            )}

            {method === "hash" && (
              <form onSubmit={handleHashVerify} className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/30">
                  <label className="mb-2 block text-sm font-medium text-blue-800 dark:text-blue-300">
                    SHA-2 Fingerprint:
                  </label>
                  <Input
                    type="text"
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value.trim())}
                    placeholder="Fut SHA-256 hash (64 hex characters)..."
                    className="border-blue-300 bg-white font-mono dark:border-blue-700 dark:bg-slate-800"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Duke verifikuar...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      Verify
                    </>
                  )}
                </Button>
              </form>
            )}

            {method === "offline" && (
              <div className="space-y-4 text-sm text-foreground">
                <h3 className="font-semibold text-foreground">
                  Verifikim i Pavarur (Offline)
                </h3>
                <p className="text-muted-foreground">
                  Verifikoni timestamp direkt ne Polygon blockchain pa nevoje te besoni serverin tone:
                </p>
                <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
                  <li>
                    Gjeni hash-in SHA-256 te dokumentit tuaj
                  </li>
                  <li>
                    Kontrolloni ne{" "}
                    <a href="https://amoy.polygonscan.com/address/0x62ab62912b89fA0aA3A1af3CF0dFAbAE3976EC85#events" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                      PolygonScan
                    </a>{" "}
                    qe Merkle root perfshin hash-in tuaj
                  </li>
                  <li>
                    Verifikoni Merkle proof nga IPFS metadata per te provuar perfshirjen
                  </li>
                  <li>
                    Kontrolloni STAMLES explorer per detaje te plota:{" "}
                    <a href="https://scan.stamles.eu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                      scan.stamles.eu
                    </a>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Verifikimi offline garanton qe nuk keni nevoje te besoni
                  serverin tone - prova eshte e ruajtur ne Polygon blockchain dhe IPFS.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert
            variant="destructive"
            icon={<XCircle className="h-5 w-5" />}
            title={error}
          />
        )}

        {/* Result */}
        {result && (
          <div
            className={cn(
              "rounded-2xl border p-6",
              result.found
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            )}
          >
            <div className="mb-4 flex items-center gap-3">
              <Badge
                variant={result.found ? "success" : "destructive"}
                className="px-4 py-1.5 text-sm font-bold"
              >
                {result.found ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />I VLEFSHËM
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />I PAVLEFSHËM
                  </span>
                )}
              </Badge>
            </div>

            {result.found ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Chain Position
                  </dt>
                  <dd>
                    <Link
                      href={`/explorer/${result.sequenceNumber}`}
                      className="font-mono font-bold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      #{result.sequenceNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Timestamp</dt>
                  <dd className="text-foreground">
                    {result.serverTimestamp &&
                      new Date(result.serverTimestamp).toLocaleString("en-GB", {
                        timeZone: "UTC",
                      })}{" "}
                    UTC
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fingerprint</dt>
                  <dd className="break-all font-mono text-xs text-foreground">
                    {result.fingerprint}
                  </dd>
                </div>
                {result.otsStatus === "CONFIRMED" && result.polygonBlockNumber ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Polygon Blockchain (STAMLES)
                    </dt>
                    <dd className="font-medium text-green-700 dark:text-green-400">
                      <a
                        href={`https://amoy.polygonscan.com/tx/${result.polygonTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Block #{result.polygonBlockNumber}
                      </a>
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Polygon Blockchain (STAMLES)
                    </dt>
                    <dd className="text-purple-600 dark:text-purple-400">
                      Ne rradhe per Merkle batching
                    </dd>
                  </div>
                )}
                {result.signature && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Nenshkruar nga
                    </dt>
                    <dd className="text-foreground">
                      {result.signature.signerName} (
                      {result.signature.signerEmail})
                    </dd>
                  </div>
                )}
                {result.document && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Dokument</dt>
                    <dd className="text-foreground">
                      {result.document.title} ({result.document.fileName})
                    </dd>
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
