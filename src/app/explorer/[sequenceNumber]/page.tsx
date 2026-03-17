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
              <div className="rounded-xl border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Box className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Polygon Blockchain (STAMLES)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <p className="text-lg font-medium text-purple-700 dark:text-purple-300">
                    STAMLES Merkle Batching
                  </p>
                </div>
                <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                  Hash-i eshte ne STAMLES queue. Cdo 24 ore, te gjitha hash-et bashkohen ne nje Merkle tree
                  dhe root-i ruhet ne Polygon blockchain.
                </p>
                <a
                  href="https://amoy.polygonscan.com/address/0x62ab62912b89fA0aA3A1af3CF0dFAbAE3976EC85#events"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Shiko ne PolygonScan
                </a>
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
                    ? "Polygon Konfirmuar"
                    : "Polygon Queued"}
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

        {/* ========== 3 SECURITY LAYERS BADGES ========== */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <p className="text-xs font-bold text-purple-400">Polygon</p>
            <p className="text-[9px] text-muted-foreground">Blockchain</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <p className="text-xs font-bold text-blue-400">IPFS</p>
            <p className="text-[9px] text-muted-foreground">Decentralized Proof</p>
          </div>
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-xs font-bold text-green-400">STAMLES</p>
            <p className="text-[9px] text-muted-foreground">Trust System</p>
          </div>
        </div>

        {/* ========== POLYGON BLOCKCHAIN ========== */}
        <Card className="border-purple-500/20 overflow-hidden">
          <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/50">
                  <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-purple-800 dark:text-purple-200">Polygon Blockchain</h3>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400">Merkle root i ruajtur on-chain</p>
                </div>
              </div>
              <a href="https://amoy.polygonscan.com/address/0x62ab62912b89fA0aA3A1af3CF0dFAbAE3976EC85#events" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors">
                PolygonScan
              </a>
            </div>
            <div className="rounded-xl bg-white/60 dark:bg-slate-800/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-purple-600 dark:text-purple-400">Kontrata</span><code className="font-mono text-[10px] text-foreground">StamlesTimestamp</code></div>
              <div className="flex justify-between"><span className="text-purple-600 dark:text-purple-400">Network</span><span className="text-foreground">Polygon Amoy Testnet</span></div>
              <div className="flex justify-between"><span className="text-purple-600 dark:text-purple-400">Address</span><code className="font-mono text-[10px] text-purple-400">0x62ab...EC85</code></div>
            </div>
            <p className="mt-3 text-[10px] text-purple-500 leading-relaxed">
              Hash-i i dokumentit eshte ne STAMLES queue. Cdo 24 ore, te gjitha hash-et bashkohen ne nje Merkle tree dhe vetem root-i (32 byte) ruhet ne Polygon blockchain. Kjo provon ekzistencen e dokumentit pa ekspozuar permbajtjen.
            </p>
          </div>
        </Card>

        {/* ========== IPFS DECENTRALIZED PROOF ========== */}
        {entry.ipfsCid && (
          <Card className="border-blue-500/20 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-800 dark:text-blue-200">IPFS Decentralized Proof</h3>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Prove kriptografike e shperndare globalisht</p>
                  </div>
                </div>
                <a href={`https://ipfs.io/ipfs/${entry.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                  Shiko ne IPFS
                </a>
              </div>
              <div className="rounded-xl bg-white/60 dark:bg-slate-800/50 px-4 py-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">CID</span>
                  <CopyButton text={entry.ipfsCid} />
                </div>
                <code className="block break-all font-mono text-xs text-blue-800 dark:text-blue-200">{entry.ipfsCid}</code>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/40 dark:bg-slate-800/30 p-2.5">
                  <span className="text-[9px] uppercase text-blue-500">Nenshkruesi</span>
                  <p className="font-semibold text-foreground">{entry.signature ? entry.signature.signerName : "—"}</p>
                </div>
                <div className="rounded-lg bg-white/40 dark:bg-slate-800/30 p-2.5">
                  <span className="text-[9px] uppercase text-blue-500">Verifikimi</span>
                  <div className="flex gap-1 mt-0.5">
                    <span className="rounded bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[8px] font-bold text-green-700 dark:text-green-400">eIDAS</span>
                    <span className="rounded bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[8px] font-bold text-green-700 dark:text-green-400">OTP</span>
                    <span className="rounded bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[8px] font-bold text-green-700 dark:text-green-400">2FA</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ========== STAMLES - DECENTRALIZED TRUST SYSTEM ========== */}
        <Card className="border-green-500/20 overflow-hidden">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/50">
                  <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-green-800 dark:text-green-200">STAMLES - Decentralized Trust System</h3>
                  <p className="text-[10px] text-green-600 dark:text-green-400">Merkle tree batching + Polygon blockchain</p>
                </div>
              </div>
              <a href={`http://37.187.226.220:3001/verify/${entry.fingerprint}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                Shiko ne STAMLES
              </a>
            </div>

            <div className="rounded-xl bg-white/60 dark:bg-slate-800/50 p-4 space-y-3">
              <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                Hash-i i dokumentit eshte i regjistruar ne STAMLES. Cdo 24 ore, te gjitha hash-et bashkohen ne nje
                <strong> Merkle Tree</strong> dhe vetem <strong>Root-i</strong> (32 byte) ruhet ne <strong>Polygon blockchain</strong>.
                Nje transaksion i vetem provon mijera dokumenta.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a href={`http://37.187.226.220:3001/verify/${entry.fingerprint}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-green-100/50 dark:bg-green-900/20 p-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-200 dark:bg-green-800/50">
                    <svg className="h-4 w-4 text-green-700 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-green-700 dark:text-green-300 group-hover:underline">Verifiko ne STAMLES</p>
                    <p className="text-[9px] text-green-600 dark:text-green-500">Merkle proof + Polygon TX</p>
                  </div>
                </a>
                <a href="http://37.187.226.220:3001/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-green-100/50 dark:bg-green-900/20 p-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-200 dark:bg-green-800/50">
                    <svg className="h-4 w-4 text-green-700 dark:text-green-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-green-700 dark:text-green-300 group-hover:underline">STAMLES Explorer</p>
                    <p className="text-[9px] text-green-600 dark:text-green-500">Blocks, hashes, transactions</p>
                  </div>
                </a>
              </div>

              <div className="mt-2 rounded-lg bg-white/40 dark:bg-slate-800/40 p-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Si funksionon</p>
                <div className="space-y-1.5 text-[10px] text-green-700 dark:text-green-300">
                  <div className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-green-200 dark:bg-green-800 text-[8px] font-black">1</span>Hash-i i dokumentit dergohet ne STAMLES</div>
                  <div className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-green-200 dark:bg-green-800 text-[8px] font-black">2</span>Bashkohet me hash-e te tjera ne Merkle Tree</div>
                  <div className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-green-200 dark:bg-green-800 text-[8px] font-black">3</span>Vetem Root (32 byte) shkon ne Polygon</div>
                  <div className="flex items-center gap-2"><span className="flex h-4 w-4 items-center justify-center rounded bg-green-200 dark:bg-green-800 text-[8px] font-black">4</span>Merkle proof provon hash-in tuaj kundrejt root-it on-chain</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

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
                                ? `Polygon #${sig.timestampEntry.btcBlockHeight}`
                                : "Polygon Queued"}
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
