"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Home,
  User,
  LogOut,
  Lock,
  Link as LinkIcon,
  Server,
  Box,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";

interface SignatureTimeline {
  signerName: string;
  signerEmail: string;
  signedAt: string | null;
  status: string;
  order: number;
  timestampEntry: {
    sequenceNumber: number;
    fingerprint: string;
    serverTimestamp: string;
    otsStatus: string;
    btcBlockHeight: number | null;
  } | null;
}

interface EntryDetail {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
  type: string;
  serverTimestamp: string;
  btcTxId: string | null;
  btcBlockHeight: number | null;
  btcBlockHash: string | null;
  otsStatus: string;
  ipfsCid: string | null;
  document: {
    title: string;
    fileName: string;
    fileHash: string;
    fileSize: number;
    fileType: string;
    status: string;
  } | null;
  documentSignatures: SignatureTimeline[] | null;
  signature: {
    signerName: string;
    signerEmail: string;
    signedAt: string;
    status: string;
  } | null;
  previousEntry: {
    id: string;
    sequenceNumber: number;
    sequentialFingerprint: string;
    fingerprint: string;
  } | null;
  nextEntry: {
    id: string;
    sequenceNumber: number;
    sequentialFingerprint: string;
    fingerprint: string;
  } | null;
}

interface UserSession {
  name: string;
  email: string;
  image?: string;
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE_FILE: "single-file",
  SUBMITTED_HASH: "submitted-hash",
  SIGNATURE: "signature",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Kopjuar!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label || "Kopjo"}
        </>
      )}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDateFull(iso: string) {
  return (
    new Date(iso).toLocaleString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

function formatDateShort(iso: string) {
  return (
    new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export default function EntryDetailPage({
  params,
}: {
  params: Promise<{ sequenceNumber: string }>;
}) {
  const { sequenceNumber } = use(params);
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setUserSession({
            name: data.user.name || "",
            email: data.user.email || "",
            image: data.user.image || undefined,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/explorer?seq=${sequenceNumber}`);
      const data = await res.json();
      if (data.success) {
        setEntry(data.data);
      }
      setLoading(false);
    }
    load();
  }, [sequenceNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageSpinner />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">
            Entry #{sequenceNumber} nuk u gjet
          </p>
          <Link
            href="/explorer"
            className="mt-4 inline-block text-blue-500 hover:underline"
          >
            Kthehu ne Explorer
          </Link>
        </div>
      </div>
    );
  }

  const hasTimeline =
    entry.documentSignatures && entry.documentSignatures.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with user avatar */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/explorer"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Explorer
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-lg font-bold text-foreground">
              Entry #{entry.sequenceNumber}
            </h1>
            <Badge
              variant={
                entry.type === "SINGLE_FILE"
                  ? "info"
                  : entry.type === "SIGNATURE"
                    ? "purple"
                    : "success"
              }
            >
              {TYPE_LABELS[entry.type]}
            </Badge>
          </div>

          {/* User section */}
          <div className="flex items-center gap-4">
            {userSession ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  {userSession.image ? (
                    <img
                      src={userSession.image}
                      alt=""
                      className="h-8 w-8 rounded-full ring-2 ring-border"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 ring-2 ring-border dark:bg-slate-700 dark:text-slate-300">
                      {userSession.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden text-sm font-medium text-foreground sm:block">
                    {userSession.name}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-xl">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/settings/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profili im
                      </Link>
                      <div className="mt-1 border-t border-border pt-1">
                        <button
                          onClick={() =>
                            signOut({ callbackUrl: "/auth/login" })
                          }
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-muted dark:text-red-400"
                        >
                          <LogOut className="h-4 w-4" />
                          Dil nga llogaria
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/auth/login">
                <Button size="sm">Identifikohu</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        {/* ========== DUAL TIMESTAMP DISPLAY ========== */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Krahasimi i Timestamps
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Server Timestamp */}
              <div className="rounded-xl border border-border bg-muted p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Server Timestamp (UTC)
                  </span>
                </div>
                <p className="text-lg font-medium text-foreground">
                  {formatDateFull(entry.serverTimestamp)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Koha e regjistrimit ne serverin doc.al
                </p>
              </div>

              {/* Blockchain Timestamp */}
              <div
                className={cn(
                  "rounded-xl border p-4",
                  entry.otsStatus === "CONFIRMED"
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                    : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Box className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Blockchain Timestamp (Bitcoin)
                  </span>
                </div>
                {entry.otsStatus === "CONFIRMED" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-medium text-green-700 dark:text-green-300">
                        Block #{entry.btcBlockHeight}
                      </p>
                      <Badge variant="success">Ankoruar ne Bitcoin</Badge>
                    </div>
                    <p className="mt-1 text-xs text-green-600 dark:text-green-500/70">
                      Verifikuar ne blockchain-in e Bitcoin
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
                      <p className="text-lg font-medium text-yellow-700 dark:text-yellow-300">
                        Ne pritje...
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-500/70">
                      Duke pritur konfirmimin ne Bitcoin blockchain
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Verification checkmark when both timestamps align */}
            {entry.otsStatus === "CONFIRMED" && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800/50 dark:bg-green-950/20">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Timestamps te verifikuara
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-500/70">
                    Timestamp i serverit dhe blockchain-it jane te lidhura
                    kriptografikisht. Integriteti i te dhenave eshte i garantuar.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== HASHES ========== */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vlerat Hash
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Fingerprint (SHA-256)
                  </span>
                  <CopyButton text={entry.fingerprint} />
                </div>
                <div className="mt-1 rounded-xl bg-muted px-4 py-3">
                  <code className="break-all font-mono text-sm text-foreground">
                    {entry.fingerprint}
                  </code>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Sequential Fingerprint (SHA-256)
                  </span>
                  <CopyButton text={entry.sequentialFingerprint} />
                </div>
                <div className="mt-1 rounded-xl bg-muted px-4 py-3">
                  <code className="break-all font-mono text-sm text-foreground">
                    {entry.sequentialFingerprint}
                  </code>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> SequentialFingerprint = SHA-256(
                  prevSequentialFingerprint + fingerprint + serverTimestamp )
                </p>
                {entry.previousEntry && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
                    prev:{" "}
                    {entry.previousEntry.sequentialFingerprint.slice(0, 24)}...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== TIMESTAMP CHAIN VISUALIZATION ========== */}
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Zinxhiri i Integritetit
            </h2>
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {/* Previous */}
              {entry.previousEntry ? (
                <Link
                  href={`/explorer/${entry.previousEntry.sequenceNumber}`}
                  className="flex min-w-[100px] flex-col items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  <span className="text-[10px] text-muted-foreground">
                    Para
                  </span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    #{entry.previousEntry.sequenceNumber}
                  </span>
                  <code className="text-[9px] text-muted-foreground">
                    {entry.previousEntry.fingerprint.slice(0, 12)}...
                  </code>
                </Link>
              ) : (
                <div className="flex min-w-[100px] flex-col items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    Genesis
                  </span>
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    --
                  </span>
                </div>
              )}

              {/* Arrow */}
              <div className="flex items-center">
                <div
                  className={cn(
                    "h-0.5 w-6",
                    entry.otsStatus === "CONFIRMED"
                      ? "bg-green-600"
                      : "bg-yellow-600"
                  )}
                />
                <ChevronRight
                  className={cn(
                    "-ml-1 h-4 w-4",
                    entry.otsStatus === "CONFIRMED"
                      ? "text-green-600"
                      : "text-yellow-600"
                  )}
                />
              </div>

              {/* Current */}
              <div
                className={cn(
                  "flex min-w-[120px] flex-col items-center gap-1 rounded-xl border-2 px-4 py-3",
                  entry.otsStatus === "CONFIRMED"
                    ? "border-green-600 bg-green-50 dark:bg-green-950/30"
                    : "border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    entry.otsStatus === "CONFIRMED"
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  Aktuale
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    entry.otsStatus === "CONFIRMED"
                      ? "text-green-700 dark:text-green-300"
                      : "text-yellow-700 dark:text-yellow-300"
                  )}
                >
                  #{entry.sequenceNumber}
                </span>
                <code
                  className={cn(
                    "text-[9px]",
                    entry.otsStatus === "CONFIRMED"
                      ? "text-green-600/70 dark:text-green-500/70"
                      : "text-yellow-600/70 dark:text-yellow-500/70"
                  )}
                >
                  {entry.fingerprint.slice(0, 12)}...
                </code>
                <Badge
                  variant={
                    entry.otsStatus === "CONFIRMED" ? "success" : "warning"
                  }
                  className="mt-1 text-[9px]"
                >
                  {entry.otsStatus === "CONFIRMED"
                    ? "BTC Konfirmuar"
                    : "BTC Pending"}
                </Badge>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="h-0.5 w-6 bg-border" />
                <ChevronRight className="-ml-1 h-4 w-4 text-muted-foreground" />
              </div>

              {/* Next */}
              {entry.nextEntry ? (
                <Link
                  href={`/explorer/${entry.nextEntry.sequenceNumber}`}
                  className="flex min-w-[100px] flex-col items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                  <span className="text-[10px] text-muted-foreground">
                    Pas
                  </span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    #{entry.nextEntry.sequenceNumber}
                  </span>
                  <code className="text-[9px] text-muted-foreground">
                    {entry.nextEntry.fingerprint.slice(0, 12)}...
                  </code>
                </Link>
              ) : (
                <div className="flex min-w-[100px] flex-col items-center gap-1 rounded-xl border border-dashed border-border bg-muted px-3 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    Me i fundit
                  </span>
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    --
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========== BITCOIN BLOCKCHAIN ========== */}
        <div
          className={cn(
            "rounded-2xl border p-6",
            entry.otsStatus === "CONFIRMED"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
              : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
          )}
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bitcoin Blockchain
          </h2>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "h-3 w-3 rounded-full",
                entry.otsStatus === "CONFIRMED"
                  ? "bg-green-500"
                  : "bg-yellow-500 animate-pulse"
              )}
            />
            <span
              className={cn(
                "text-lg font-medium",
                entry.otsStatus === "CONFIRMED"
                  ? "text-green-800 dark:text-green-200"
                  : "text-yellow-800 dark:text-yellow-200"
              )}
            >
              {entry.otsStatus === "CONFIRMED"
                ? "Konfirmuar ne Bitcoin Blockchain"
                : "Ne pritje te konfirmimit..."}
            </span>
          </div>

          {entry.otsStatus === "CONFIRMED" && (
            <div className="mt-4 space-y-3">
              {entry.btcBlockHeight && (
                <div className="flex items-center justify-between rounded-xl bg-slate-100/50 px-4 py-2 dark:bg-slate-800/50">
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Block Height
                  </span>
                  <span className="font-mono text-sm font-bold text-green-800 dark:text-green-200">
                    #{entry.btcBlockHeight}
                  </span>
                </div>
              )}
              {entry.btcTxId && (
                <div className="rounded-xl bg-slate-100/50 px-4 py-2 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Transaction ID
                    </span>
                    <CopyButton text={entry.btcTxId} />
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs text-green-800 dark:text-green-200">
                    {entry.btcTxId}
                  </code>
                </div>
              )}
              {entry.btcBlockHash && (
                <div className="rounded-xl bg-slate-100/50 px-4 py-2 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Block Hash
                    </span>
                    <CopyButton text={entry.btcBlockHash} />
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs text-green-800 dark:text-green-200">
                    {entry.btcBlockHash}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== IPFS BLOCKCHAIN PROOF ========== */}
        {entry.ipfsCid && (
          <Card className="border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-200">IPFS Decentralized Proof</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Prove kriptografike e ruajtur ne blockchain-in IPFS
                    </p>
                  </div>
                </div>
                <a
                  href={`https://ipfs.io/ipfs/${entry.ipfsCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Shiko ne IPFS
                </a>
              </div>

              {/* CID */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/50 px-4 py-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">Content Identifier (CID)</span>
                  <CopyButton text={entry.ipfsCid} />
                </div>
                <code className="block break-all font-mono text-xs text-blue-800 dark:text-blue-200">
                  {entry.ipfsCid}
                </code>
              </div>

              {/* Interpreted IPFS Data */}
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/50 p-4 space-y-3">
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Te dhenat e ruajtura ne IPFS Blockchain
                </h4>

                <div className="grid gap-2">
                  <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 dark:bg-slate-700/30 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="10"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">Platforma</p>
                      <p className="text-sm font-semibold text-foreground">doc.al</p>
                      <p className="text-[10px] text-muted-foreground">Platforma e Nenshkrimit Elektronik &amp; Timestamp</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 dark:bg-slate-700/30 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">Hash i Dokumentit</p>
                      <code className="text-xs font-mono text-foreground break-all">{entry.fingerprint}</code>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Gjurma dixhitale SHA-256 e dokumentit te nenshkruar</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 dark:bg-slate-700/30 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">Nenshkruesi</p>
                      <p className="text-sm font-semibold text-foreground">
                        {entry.signature ? `${entry.signature.signerName}` : "I panjohur"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Identiteti i maskuar per mbrojtje te privatesis</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 dark:bg-slate-700/30 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">Verifikimi</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          eIDAS 910/2014
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          Email OTP
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          2FA TOTP
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Nenshkrimi u verifikua me 3 metoda te pavarura</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-blue-50/50 dark:bg-slate-700/30 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-blue-500 dark:text-blue-400">Zinxhiri (Chain)</p>
                      <div className="space-y-1 mt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Numri:</span>
                          <span className="font-mono font-semibold text-foreground">#{entry.sequenceNumber}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Sequential Fingerprint:</span>
                          <code className="block text-[10px] font-mono text-foreground break-all mt-0.5">{entry.sequentialFingerprint}</code>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Lidhet me entry-t e meparshme duke formuar nje zinxhir te panderpritur</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 p-3">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50 mt-0.5">
                      <svg className="h-3.5 w-3.5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium uppercase text-orange-600 dark:text-orange-400">Bitcoin Blockchain</p>
                      <p className="text-sm font-semibold text-foreground">
                        {entry.otsStatus === "CONFIRMED" ? `Konfirmuar - Block #${entry.btcBlockHeight}` : "Ne pritje te konfirmimit"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Hash-i eshte derguar ne OpenTimestamps per ankorim ne Bitcoin</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[10px] text-blue-500 dark:text-blue-500 leading-relaxed">
                Keto te dhena jane te ruajtura ne menyre te perhershme ne rrjetin global te blockchain-it IPFS.
                Askush nuk mund t&apos;i ndryshoje ose fshije ato. Dokumenti origjinal nuk ruhet ne IPFS -
                vetem prova kriptografike (hash) qe verteton ekzistencen e tij ne momentin e nenshkrimit.
              </p>
            </div>
          </Card>
        )}

        {/* ========== DOCUMENT ========== */}
        {entry.document && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dokumenti i lidhur
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Te dhenat jane te maskuara per privatesi
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Badge variant="default" className="text-sm font-bold">
                  {entry.document.fileType}
                </Badge>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {entry.document.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{entry.document.fileName}</span>
                    <span>{formatBytes(entry.document.fileSize)}</span>
                    <Badge
                      variant={
                        entry.document.status === "COMPLETED"
                          ? "success"
                          : entry.document.status === "PENDING_SIGNATURE"
                            ? "warning"
                            : "default"
                      }
                    >
                      {entry.document.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </div>
              {entry.document.fileHash && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      File Hash (SHA-256):
                    </span>
                    <CopyButton text={entry.document.fileHash} />
                  </div>
                  <div className="mt-1 rounded-xl bg-muted px-3 py-2">
                    <code className="break-all font-mono text-xs text-muted-foreground">
                      {entry.document.fileHash}
                    </code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========== SIGNATURE ========== */}
        {entry.signature && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nenshkruesi
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Identiteti i maskuar
                </span>
              </div>
              <div className="mt-3">
                <p className="text-lg font-medium text-foreground">
                  {entry.signature.signerName}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.signature.signerEmail}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Badge
                  variant={
                    entry.signature.status === "SIGNED" ? "success" : "warning"
                  }
                >
                  {entry.signature.status === "SIGNED"
                    ? "Nenshkruar"
                    : "Ne pritje"}
                </Badge>
                {entry.signature.signedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.signature.signedAt).toLocaleDateString(
                      "en-GB"
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== SIGNING TIMELINE ========== */}
        {hasTimeline && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timeline e Nenshkrimeve
              </h2>

              <div className="relative">
                {entry.documentSignatures!.map((sig, idx) => {
                  const isLast =
                    idx === entry.documentSignatures!.length - 1;
                  const isSigned = sig.status === "SIGNED";
                  const isPending = sig.status === "PENDING";

                  return (
                    <div key={idx} className="relative flex gap-4">
                      {/* Vertical line */}
                      {!isLast && (
                        <div className="absolute bottom-0 left-[15px] top-[32px] w-0.5 bg-border" />
                      )}

                      {/* Node */}
                      <div className="relative z-10 flex-shrink-0 pt-1">
                        {isSigned ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/20">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        ) : isPending ? (
                          <div className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-yellow-600 shadow-lg shadow-yellow-600/20">
                            <Clock className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={cn(
                          "mb-4 flex-1 rounded-xl border p-4",
                          isSigned
                            ? "border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/20"
                            : isPending
                              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-950/20"
                              : "border-border bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {sig.signerName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {sig.signerEmail}
                            </span>
                          </div>
                          <Badge
                            variant={
                              isSigned
                                ? "success"
                                : isPending
                                  ? "warning"
                                  : "default"
                            }
                            className="text-[10px]"
                          >
                            {isSigned
                              ? "Nenshkruar"
                              : isPending
                                ? "Ne pritje"
                                : sig.status}
                          </Badge>
                        </div>

                        {sig.signedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Nenshkruar me: {formatDateShort(sig.signedAt)}
                          </p>
                        )}

                        {sig.timestampEntry && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/explorer/${sig.timestampEntry.sequenceNumber}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 font-mono text-[10px] text-blue-600 transition-colors hover:bg-slate-200 dark:text-blue-400 dark:hover:bg-slate-700"
                            >
                              Entry #{sig.timestampEntry.sequenceNumber}
                            </Link>
                            <Badge
                              variant={
                                sig.timestampEntry.otsStatus === "CONFIRMED"
                                  ? "success"
                                  : "warning"
                              }
                              className="text-[9px]"
                            >
                              {sig.timestampEntry.otsStatus === "CONFIRMED"
                                ? `BTC Block #${sig.timestampEntry.btcBlockHeight}`
                                : "BTC Pending"}
                            </Badge>
                            <code className="font-mono text-[9px] text-muted-foreground/60">
                              hash:{" "}
                              {sig.timestampEntry.fingerprint.slice(0, 16)}...
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== CHAIN NAVIGATION ========== */}
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            {entry.previousEntry ? (
              <Link href={`/explorer/${entry.previousEntry.sequenceNumber}`}>
                <Button variant="secondary" className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Entry #{entry.previousEntry.sequenceNumber}
                </Button>
              </Link>
            ) : (
              <span className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                Genesis Entry
              </span>
            )}

            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <LinkIcon className="h-4 w-4" />
              Chain kriptografike
            </span>

            {entry.nextEntry ? (
              <Link href={`/explorer/${entry.nextEntry.sequenceNumber}`}>
                <Button variant="secondary" className="gap-2">
                  Entry #{entry.nextEntry.sequenceNumber}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <span className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                Latest Entry
              </span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
