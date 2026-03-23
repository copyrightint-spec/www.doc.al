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
  FileText,
  Hexagon,
  Globe,
  ExternalLink,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChainVisualization from "@/components/ChainVisualization";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

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
  polygonTxHash: string | null;
  polygonBlockNumber: number | null;
  stamlesStatus: string | null;
  stamlesBatchId: string | null;
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
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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

function truncateHash(hash: string) {
  if (hash.length <= 16) return hash;
  return hash.slice(0, 10) + "..." + hash.slice(-6);
}

interface HashTimelineItem {
  step: number;
  action: string;
  icon: React.ComponentType<{ className?: string }>;
  hash?: string;
  cid?: string;
  label: string;
  sublabel?: string;
  link?: string;
  status: "completed" | "in-progress" | "pending";
}

function HashTimeline({ entry }: { entry: EntryDetail }) {
  const [expanded, setExpanded] = useState(false);

  const timeline: HashTimelineItem[] = [];

  // Step 1: Document hash
  timeline.push({
    step: 1,
    action: "DOCUMENT",
    icon: FileText,
    hash: entry.fingerprint,
    label: "Hash i Dokumentit (SHA-256)",
    status: "completed",
  });

  // Step 2: Chain registration
  timeline.push({
    step: 2,
    action: "CHAIN",
    icon: LinkIcon,
    hash: entry.sequentialFingerprint,
    label: `Zinxhiri doc.al #${entry.sequenceNumber}`,
    sublabel: entry.previousEntry
      ? `Lidhur me #${entry.previousEntry.sequenceNumber}`
      : "Genesis",
    status: "completed",
  });

  // Step 3: Polygon
  if (entry.polygonTxHash) {
    timeline.push({
      step: 3,
      action: "POLYGON",
      icon: Hexagon,
      hash: entry.polygonTxHash,
      label: "Polygon Blockchain",
      sublabel: entry.polygonBlockNumber
        ? `Block #${entry.polygonBlockNumber.toLocaleString()}`
        : undefined,
      link: `https://amoy.polygonscan.com/tx/${entry.polygonTxHash}`,
      status: "completed",
    });
  } else {
    timeline.push({
      step: 3,
      action: "POLYGON",
      icon: Hexagon,
      label: "Polygon Blockchain",
      status: entry.stamlesStatus === "BATCHED" ? "in-progress" : "pending",
    });
  }

  // Step 4: IPFS
  if (entry.ipfsCid) {
    timeline.push({
      step: 4,
      action: "IPFS",
      icon: Globe,
      cid: entry.ipfsCid,
      label: "IPFS Proof",
      link: `https://ipfs.io/ipfs/${entry.ipfsCid}`,
      status: "completed",
    });
  } else {
    timeline.push({
      step: 4,
      action: "IPFS",
      icon: Globe,
      label: "IPFS Proof",
      status: "pending",
    });
  }

  const dotColor = (status: string) => {
    if (status === "completed") return "bg-green-500";
    if (status === "in-progress") return "bg-blue-500 animate-pulse";
    return "bg-slate-500";
  };

  const lineColor = (status: string) => {
    if (status === "completed") return "bg-green-500/30";
    if (status === "in-progress") return "bg-blue-500/30";
    return "bg-border";
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors min-h-[44px]"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            expanded && "rotate-90"
          )}
        />
        Shiko Kronologjine
      </button>

      {expanded && (
        <div className="mt-3 pl-1">
          {timeline.map((item, idx) => {
            const Icon = item.icon;
            const isLast = idx === timeline.length - 1;
            const hashValue = item.hash || item.cid;

            return (
              <div key={item.step} className="relative flex gap-3">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      "absolute left-[7px] top-[20px] bottom-0 w-px",
                      lineColor(item.status)
                    )}
                  />
                )}

                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 pt-1.5">
                  <div
                    className={cn("h-[14px] w-[14px] rounded-full", dotColor(item.status))}
                  />
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    {item.status === "in-progress" && (
                      <span className="text-[10px] text-blue-500">
                        Ne perpunim...
                      </span>
                    )}
                    {item.status === "pending" && (
                      <span className="text-[10px] text-muted-foreground">
                        Ne pritje
                      </span>
                    )}
                  </div>

                  {item.sublabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.sublabel}
                    </p>
                  )}

                  {hashValue && (
                    <div className="mt-1 flex items-center gap-1">
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {truncateHash(hashValue)}
                        </a>
                      ) : (
                        <code className="font-mono text-xs text-muted-foreground">
                          {truncateHash(hashValue)}
                        </code>
                      )}
                      <CopyButton text={hashValue} />
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
  const [showIpfsPopup, setShowIpfsPopup] = useState(false);
  const [ipfsData, setIpfsData] = useState<Record<string, unknown> | null>(
    null
  );
  const [ipfsLoading, setIpfsLoading] = useState(false);
  const [ipfsError, setIpfsError] = useState<string | null>(null);

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
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card px-4 sm:px-6 py-3">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
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
      {/* Header */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/explorer"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Explorer
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base font-bold text-foreground">
              Entry #{entry.sequenceNumber}
            </h1>
            <Badge
              variant={
                entry.type === "SINGLE_FILE"
                  ? "info"
                  : entry.type === "SIGNATURE"
                    ? "info"
                    : "success"
              }
            >
              {TYPE_LABELS[entry.type]}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {userSession ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
                >
                  {userSession.image ? (
                    <img
                      src={userSession.image}
                      alt=""
                      className="h-7 w-7 rounded-full ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 ring-1 ring-border dark:bg-slate-700 dark:text-slate-300">
                      {userSession.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-card py-1 shadow-lg">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/settings/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profili im
                      </Link>
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={() =>
                            signOut({ callbackUrl: "/auth/login" })
                          }
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted dark:text-red-400"
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

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-4">
        {/* Timestamp + Status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm text-muted-foreground">
            {formatDateFull(entry.serverTimestamp)}
          </p>
          <div className="flex items-center gap-2">
            {entry.otsStatus === "CONFIRMED" || entry.stamlesStatus === "CONFIRMED" ? (
              <Badge variant="success">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Konfirmuar ne Polygon
              </Badge>
            ) : entry.stamlesStatus === "BATCHED" ? (
              <Badge variant="info">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Ne Batch
              </Badge>
            ) : (
              <Badge variant="default">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
                Ne Rradhe
              </Badge>
            )}
            {entry.ipfsCid && (
              <Badge variant="info">IPFS</Badge>
            )}
          </div>
        </div>

        {/* Hashes */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Hash-et Kriptografike
          </h2>

          {/* Fingerprint */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                Fingerprint (SHA-256)
              </span>
              <CopyButton text={entry.fingerprint} />
            </div>
            <div className="rounded bg-muted px-3 py-2">
              <code className="break-all font-mono text-xs text-foreground">
                {entry.fingerprint}
              </code>
            </div>
          </div>

          {/* Sequential Fingerprint */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                Sequential Fingerprint
              </span>
              <CopyButton text={entry.sequentialFingerprint} />
            </div>
            <div className="rounded bg-muted px-3 py-2">
              <code className="break-all font-mono text-xs text-foreground">
                {entry.sequentialFingerprint}
              </code>
            </div>
          </div>

          {/* Formula */}
          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            Seq. Fingerprint = SHA-256(prevSeqFingerprint + fingerprint +
            timestamp)
          </p>
        </div>

        {/* Chain Visualization */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            Zinxhiri i Integritetit
          </h2>
          <ChainVisualization
            currentEntry={{
              sequenceNumber: entry.sequenceNumber,
              fingerprint: entry.fingerprint,
              sequentialFingerprint: entry.sequentialFingerprint,
              serverTimestamp: entry.serverTimestamp,
            }}
            previousEntry={entry.previousEntry}
            nextEntry={entry.nextEntry}
          />
        </div>

        {/* Hash Timeline */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">
            Kronologjia e Hash-eve
          </h2>
          <HashTimeline entry={entry} />
        </div>

        {/* Blockchain Status */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Statusi Blockchain
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Polygon */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    entry.stamlesStatus === "CONFIRMED"
                      ? "bg-green-500"
                      : "bg-blue-500 animate-pulse"
                  )}
                />
                <span className="text-xs font-semibold text-foreground">
                  Polygon
                </span>
              </div>
              {entry.polygonTxHash ? (
                <a
                  href={`https://amoy.polygonscan.com/tx/${entry.polygonTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  TX: {truncateHash(entry.polygonTxHash)}
                </a>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Ne rradhe per Merkle batching
                </p>
              )}
              {entry.polygonBlockNumber && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Block #{entry.polygonBlockNumber.toLocaleString()}
                </p>
              )}
            </div>

            {/* IPFS */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    entry.ipfsCid ? "bg-green-500" : "bg-slate-400"
                  )}
                />
                <span className="text-xs font-semibold text-foreground">
                  IPFS
                </span>
              </div>
              {entry.ipfsCid ? (
                <div>
                  <button
                    onClick={async () => {
                      setShowIpfsPopup(true);
                      if (!ipfsData) {
                        setIpfsLoading(true);
                        setIpfsError(null);
                        try {
                          const res = await fetch(
                            `https://ipfs.io/ipfs/${entry.ipfsCid}`
                          );
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          const data = await res.json();
                          setIpfsData(data);
                        } catch (err) {
                          setIpfsError(
                            err instanceof Error
                              ? err.message
                              : "Failed to fetch"
                          );
                        } finally {
                          setIpfsLoading(false);
                        }
                      }
                    }}
                    className="font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline break-all text-left"
                  >
                    {truncateHash(entry.ipfsCid)}
                  </button>
                  <CopyButton text={entry.ipfsCid} />
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Ne pritje</p>
              )}
            </div>

            {/* STAMLES */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    entry.stamlesStatus === "CONFIRMED"
                      ? "bg-green-500"
                      : "bg-blue-500 animate-pulse"
                  )}
                />
                <span className="text-xs font-semibold text-foreground">
                  STAMLES
                </span>
              </div>
              <a
                href={`https://scan.stamles.eu/verify/${entry.fingerprint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                Verifiko ne STAMLES
              </a>
            </div>
          </div>

          {/* Verification banner */}
          {entry.otsStatus === "CONFIRMED" && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/50 dark:bg-green-950/20 px-3 py-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-800 dark:text-green-300">
                Timestamp i verifikuar ne Polygon blockchain. Integriteti i te
                dhenave eshte i garantuar.
              </p>
            </div>
          )}
        </div>

        {/* Document */}
        {entry.document && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Dokumenti
              </h2>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Private
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {entry.document.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
            {entry.document.fileHash && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">
                    File Hash (SHA-256):
                  </span>
                  <CopyButton text={entry.document.fileHash} />
                </div>
                <div className="rounded bg-muted px-3 py-2">
                  <code className="break-all font-mono text-xs text-muted-foreground">
                    {entry.document.fileHash}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature */}
        {entry.signature && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Nenshkruesi
              </h2>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Identiteti i maskuar
              </span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {entry.signature.signerName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {entry.signature.signerEmail}
            </p>
            <div className="mt-2 flex items-center gap-2">
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
          </div>
        )}

        {/* Signing Timeline */}
        {hasTimeline && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">
              Timeline e Nenshkrimeve
            </h2>
            <div className="relative">
              {entry.documentSignatures!.map((sig, idx) => {
                const isLast = idx === entry.documentSignatures!.length - 1;
                const isSigned = sig.status === "SIGNED";
                const isPending = sig.status === "PENDING";

                return (
                  <div key={idx} className="relative flex gap-3">
                    {!isLast && (
                      <div className="absolute bottom-0 left-[9px] top-[22px] w-px bg-border" />
                    )}
                    <div className="relative z-10 flex-shrink-0 pt-1">
                      <div
                        className={cn(
                          "h-[18px] w-[18px] rounded-full flex items-center justify-center",
                          isSigned
                            ? "bg-green-600"
                            : isPending
                              ? "bg-blue-500 animate-pulse"
                              : "bg-slate-400"
                        )}
                      >
                        {isSigned ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : (
                          <Clock className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </div>
                    <div className={cn("flex-1 pb-3", isLast && "pb-0")}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {sig.signerName}
                        </span>
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
                      <p className="text-xs text-muted-foreground">
                        {sig.signerEmail}
                      </p>
                      {sig.signedAt && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateShort(sig.signedAt)}
                        </p>
                      )}
                      {sig.timestampEntry && (
                        <div className="mt-1 flex items-center gap-2">
                          <Link
                            href={`/explorer/${sig.timestampEntry.sequenceNumber}`}
                            className="font-mono text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Entry #{sig.timestampEntry.sequenceNumber}
                          </Link>
                          <code className="font-mono text-[10px] text-muted-foreground/60">
                            {sig.timestampEntry.fingerprint.slice(0, 16)}...
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* IPFS Popup Modal */}
        {showIpfsPopup && entry.ipfsCid && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowIpfsPopup(false)}
          >
            <div
              className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-foreground">
                    IPFS Content
                  </span>
                  <code className="text-[10px] text-muted-foreground font-mono">
                    {truncateHash(entry.ipfsCid)}
                  </code>
                </div>
                <button
                  onClick={() => setShowIpfsPopup(false)}
                  className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-4">
                {ipfsLoading && (
                  <div className="flex flex-col items-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Duke marre te dhenat nga IPFS...
                    </p>
                  </div>
                )}
                {ipfsError && (
                  <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 text-center">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Gabim: {ipfsError}
                    </p>
                    <button
                      onClick={async () => {
                        setIpfsLoading(true);
                        setIpfsError(null);
                        try {
                          const res = await fetch(
                            `https://ipfs.io/ipfs/${entry.ipfsCid}`
                          );
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          const data = await res.json();
                          setIpfsData(data);
                        } catch (err) {
                          setIpfsError(
                            err instanceof Error
                              ? err.message
                              : "Failed to fetch"
                          );
                        } finally {
                          setIpfsLoading(false);
                        }
                      }}
                      className="mt-2 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      Provo perseri
                    </button>
                  </div>
                )}
                {ipfsData && !ipfsLoading && (
                  <div className="rounded-lg bg-muted p-3 overflow-x-auto">
                    <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap break-all text-foreground">
                      {JSON.stringify(ipfsData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <a
                  href={`https://ipfs.io/ipfs/${entry.ipfsCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Hap ne IPFS Gateway
                </a>
                {ipfsData && (
                  <CopyButton
                    text={JSON.stringify(ipfsData, null, 2)}
                    label="Kopjo JSON"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chain Navigation */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          {entry.previousEntry ? (
            <Link href={`/explorer/${entry.previousEntry.sequenceNumber}`}>
              <Button variant="secondary" size="sm" className="gap-1 min-h-[44px]">
                <ChevronLeft className="h-4 w-4" />
                #{entry.previousEntry.sequenceNumber}
              </Button>
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Genesis Entry</span>
          )}

          <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
            <LinkIcon className="h-3.5 w-3.5" />
            Chain kriptografike
          </span>

          {entry.nextEntry ? (
            <Link href={`/explorer/${entry.nextEntry.sequenceNumber}`}>
              <Button variant="secondary" size="sm" className="gap-1 min-h-[44px]">
                #{entry.nextEntry.sequenceNumber}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Latest Entry</span>
          )}
        </div>
      </div>
    </div>
  );
}
