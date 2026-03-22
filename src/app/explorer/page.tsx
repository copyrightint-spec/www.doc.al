"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  FileText,
  Hash,
  PenTool,
  Link as LinkIcon,
  Home,
  User,
  LogOut,
  Lock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface TimestampEntry {
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_LABELS: Record<string, string> = {
  SINGLE_FILE: "single-file",
  SUBMITTED_HASH: "submitted-hash",
  SIGNATURE: "signature",
};

const TYPE_BADGE_VARIANT: Record<string, "info" | "success" | "purple"> = {
  SINGLE_FILE: "info",
  SUBMITTED_HASH: "success",
  SIGNATURE: "purple",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SINGLE_FILE: <FileText className="h-5 w-5" />,
  SUBMITTED_HASH: <Hash className="h-5 w-5" />,
  SIGNATURE: <PenTool className="h-5 w-5" />,
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="ml-2 rounded-lg px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="Kopjo"
    >
      {copied ? (
        <span className="inline-flex items-center gap-1">
          <Check className="h-3 w-3" /> Kopjuar!
        </span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <Copy className="h-3 w-3" /> Kopjo
        </span>
      )}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

interface UserSession {
  name: string;
  email: string;
  image?: string;
}

export default function ExplorerPage() {
  const [entries, setEntries] = useState<TimestampEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);
  const [detail, setDetail] = useState<EntryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "50",
    });
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/explorer?${params}`);
    const data = await res.json();
    if (data.success) {
      const newIds = new Set<string>();
      if (entries.length > 0) {
        data.data.entries.forEach((e: TimestampEntry) => {
          if (!entries.find((old) => old.id === e.id)) {
            newIds.add(e.id);
          }
        });
      }
      setNewEntryIds(newIds);
      setEntries(data.data.entries);
      setPagination(data.data.pagination);
      setInitialLoading(false);

      if (newIds.size > 0) {
        setTimeout(() => setNewEntryIds(new Set()), 3000);
      }
    }
  }, [page, typeFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEntries();
    const interval = setInterval(fetchEntries, 5000);
    return () => clearInterval(interval);
  }, [fetchEntries]);

  async function toggleDetail(seqNum: number) {
    if (expandedSeq === seqNum) {
      setExpandedSeq(null);
      setDetail(null);
      return;
    }

    setExpandedSeq(seqNum);
    setDetailLoading(true);
    setDetail(null);

    try {
      const res = await fetch(`/api/explorer?seq=${seqNum}`);
      const data = await res.json();
      if (data.success) {
        setDetail(data.data);
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return (
      d.toLocaleString("en-GB", {
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

  function truncateHash(hash: string) {
    if (hash.length <= 20) return hash;
    return hash.slice(0, 16) + "..." + hash.slice(-8);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0" />
                <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
              </Link>
              <h1 className="mt-1 text-xs sm:text-sm text-muted-foreground">
                Timestamp Explorer
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-4">
                <Link
                  href="/certificates"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Certifikata
                </Link>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Real-time
                {pagination && (
                  <span className="ml-2">
                    {pagination.total} total entries
                  </span>
                )}
              </div>

              {/* User avatar */}
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        {/* Mobile real-time indicator */}
        <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Real-time
          {pagination && (
            <span className="ml-2">
              {pagination.total} entries
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-border bg-muted px-3 py-3 sm:py-2 text-base sm:text-sm text-foreground min-h-[48px] sm:min-h-0"
          >
            <option value="">Te gjitha tipet</option>
            <option value="SINGLE_FILE">single-file</option>
            <option value="SUBMITTED_HASH">submitted-hash</option>
            <option value="SIGNATURE">signature</option>
          </select>
          <Input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Kerko me fingerprint hash..."
            className="w-full sm:min-w-[200px] sm:flex-1"
          />
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              onClick={() => toggleDetail(entry.sequenceNumber)}
              className={cn(
                "p-4 cursor-pointer transition-colors",
                expandedSeq === entry.sequenceNumber && "ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20",
                newEntryIds.has(entry.id) && "bg-green-50 dark:bg-green-950/30 animate-pulse"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/explorer/${entry.sequenceNumber}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base"
                  >
                    #{entry.sequenceNumber}
                  </Link>
                  <Badge variant={TYPE_BADGE_VARIANT[entry.type] || "default"}>
                    {TYPE_LABELS[entry.type] || entry.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {entry.stamlesStatus === "CONFIRMED" || entry.otsStatus === "CONFIRMED" ? (
                    <Badge variant="success" className="text-[10px]">Confirmed</Badge>
                  ) : entry.stamlesStatus === "BATCHED" ? (
                    <Badge variant="info" className="text-[10px]">Batched</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">Queued</Badge>
                  )}
                  {entry.ipfsCid && <Badge variant="info" className="text-[10px]">IPFS</Badge>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">{formatDate(entry.serverTimestamp)}</p>
              <div className="space-y-1">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fingerprint</span>
                  <p className="font-mono text-xs text-foreground/70 truncate">{entry.fingerprint}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Seq. Fingerprint</span>
                  <p className="font-mono text-xs text-foreground/70 truncate">{entry.sequentialFingerprint}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center">
                <ChevronRight className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedSeq === entry.sequenceNumber && "rotate-90"
                )} />
              </div>

              {/* Expanded detail on mobile */}
              {expandedSeq === entry.sequenceNumber && (
                <div className="mt-3 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                  {detailLoading ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : detail ? (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Fingerprint</span>
                        <div className="mt-1 rounded-lg bg-muted px-2 py-1.5 flex items-center gap-1">
                          <code className="break-all font-mono text-[11px] text-foreground flex-1">{detail.fingerprint}</code>
                          <CopyButton text={detail.fingerprint} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Seq. Fingerprint</span>
                        <div className="mt-1 rounded-lg bg-muted px-2 py-1.5 flex items-center gap-1">
                          <code className="break-all font-mono text-[11px] text-foreground flex-1">{detail.sequentialFingerprint}</code>
                          <CopyButton text={detail.sequentialFingerprint} />
                        </div>
                      </div>
                      {detail.document && (
                        <div className="rounded-lg border border-border p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Dokumenti</span>
                          <p className="text-sm text-foreground mt-0.5">{detail.document.title}</p>
                          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{detail.document.fileName}</span>
                            <span>{formatBytes(detail.document.fileSize)}</span>
                          </div>
                        </div>
                      )}
                      {detail.signature && (
                        <div className="rounded-lg border border-border p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Nenshkruesi</span>
                          <p className="text-sm text-foreground mt-0.5">{detail.signature.signerName}</p>
                          <Badge variant={detail.signature.status === "SIGNED" ? "success" : "warning"} className="mt-1">
                            {detail.signature.status === "SIGNED" ? "Nenshkruar" : "Ne pritje"}
                          </Badge>
                        </div>
                      )}
                      <Link
                        href={`/explorer/${detail.sequenceNumber}`}
                        className="block"
                      >
                        <Button variant="secondary" size="sm" className="w-full min-h-[44px]">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Faqja e plote
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-2">Gabim ne ngarkimin e detajeve</p>
                  )}
                </div>
              )}
            </Card>
          ))}
          {entries.length === 0 && initialLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={`skel-m-${i}`} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40 mb-2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4 mt-1" />
                </Card>
              ))}
            </div>
          )}
          {entries.length === 0 && !initialLoading && (
            <p className="text-center text-muted-foreground py-8">Nuk ka timestamp entries akoma</p>
          )}
        </div>

        {/* Desktop Table */}
        <Card className="overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Time Stamp (UTC)</TableHead>
                <TableHead>Fingerprint (SHA-256)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sequential Fingerprint (SHA-256)</TableHead>
                <TableHead>Polygon</TableHead>
                <TableHead>IPFS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <TableRow
                    onClick={() => toggleDetail(entry.sequenceNumber)}
                    className={cn(
                      "cursor-pointer",
                      expandedSeq === entry.sequenceNumber &&
                        "bg-blue-50 dark:bg-blue-950/20",
                      newEntryIds.has(entry.id) &&
                        "bg-green-50 dark:bg-green-950/30 animate-pulse"
                    )}
                  >
                    <TableCell className="text-center">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          expandedSeq === entry.sequenceNumber && "rotate-90"
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/explorer/${entry.sequenceNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        #{entry.sequenceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground">
                      {formatDate(entry.serverTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/explorer/${entry.sequenceNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-blue-600/70 hover:text-blue-600 hover:underline dark:text-blue-400/70 dark:hover:text-blue-400"
                        title={entry.fingerprint}
                      >
                        {truncateHash(entry.fingerprint)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          TYPE_BADGE_VARIANT[entry.type] || "default"
                        }
                      >
                        {TYPE_LABELS[entry.type] || entry.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/explorer/${entry.sequenceNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-blue-600/70 hover:text-blue-600 hover:underline dark:text-blue-400/70 dark:hover:text-blue-400"
                        title={entry.sequentialFingerprint}
                      >
                        {truncateHash(entry.sequentialFingerprint)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {entry.stamlesStatus === "CONFIRMED" || entry.otsStatus === "CONFIRMED" ? (
                        <a
                          href={entry.polygonTxHash
                            ? `https://amoy.polygonscan.com/tx/${entry.polygonTxHash}`
                            : entry.polygonBlockNumber
                              ? `https://amoy.polygonscan.com/block/${entry.polygonBlockNumber}`
                              : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="success" className="hover:bg-green-200 dark:hover:bg-green-800 cursor-pointer">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Confirmed
                          </Badge>
                        </a>
                      ) : entry.stamlesStatus === "BATCHED" ? (
                        <Badge variant="info">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                          Batched
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                          Queued
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {entry.ipfsCid ? (
                        <a
                          href={`https://ipfs.io/ipfs/${entry.ipfsCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="info" className="hover:bg-blue-200 dark:hover:bg-blue-800 cursor-pointer">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            IPFS
                          </Badge>
                        </a>
                      ) : (
                        <Badge variant="default" className="opacity-40">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          —
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expandedSeq === entry.sequenceNumber && (
                    <tr>
                      <td
                        colSpan={8}
                        className="border-b border-border bg-muted/30 px-0"
                      >
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner />
                          </div>
                        ) : detail ? (
                          <div className="px-6 py-5">
                            {/* Detail Header */}
                            <div className="mb-5 flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-xl",
                                  detail.type === "SINGLE_FILE"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                    : detail.type === "SIGNATURE"
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                      : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                )}
                              >
                                {TYPE_ICONS[detail.type] ||
                                  TYPE_ICONS.SINGLE_FILE}
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-foreground">
                                  Timestamp Entry #{detail.sequenceNumber}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {TYPE_LABELS[detail.type]} &middot;{" "}
                                  {formatDate(detail.serverTimestamp)}
                                </p>
                              </div>
                              <Link
                                href={`/explorer/${detail.sequenceNumber}`}
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto"
                              >
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Faqja e plote
                                </Button>
                              </Link>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">
                              {/* Left: Hashes */}
                              <div className="space-y-4">
                                {/* Fingerprint */}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                      Fingerprint (SHA-256)
                                    </span>
                                    <CopyButton text={detail.fingerprint} />
                                  </div>
                                  <div className="mt-1 rounded-xl bg-muted px-3 py-2">
                                    <code className="break-all font-mono text-xs text-foreground">
                                      {detail.fingerprint}
                                    </code>
                                  </div>
                                </div>

                                {/* Sequential Fingerprint */}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                      Sequential Fingerprint
                                    </span>
                                    <CopyButton
                                      text={detail.sequentialFingerprint}
                                    />
                                  </div>
                                  <div className="mt-1 rounded-xl bg-muted px-3 py-2">
                                    <code className="break-all font-mono text-xs text-foreground">
                                      {detail.sequentialFingerprint}
                                    </code>
                                  </div>
                                </div>

                                {/* Chain formula */}
                                <div className="rounded-xl border border-dashed border-border bg-card px-3 py-2">
                                  <p className="text-xs text-muted-foreground">
                                    Seq. Fingerprint = SHA-256(
                                    prevSeqFingerprint + fingerprint + timestamp
                                    )
                                  </p>
                                </div>
                              </div>

                              {/* Right: Polygon + IPFS + Document + Signature */}
                              <div className="space-y-4">
                                {/* Polygon Blockchain */}
                                <div className={cn(
                                  "rounded-xl border p-3",
                                  (detail as unknown as TimestampEntry).stamlesStatus === "CONFIRMED"
                                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                                    : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                                )}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "h-2.5 w-2.5 rounded-full",
                                      (detail as unknown as TimestampEntry).stamlesStatus === "CONFIRMED" ? "bg-green-500" : "bg-blue-500 animate-pulse"
                                    )} />
                                    <span className={cn(
                                      "text-sm font-medium",
                                      (detail as unknown as TimestampEntry).stamlesStatus === "CONFIRMED"
                                        ? "text-green-800 dark:text-green-300"
                                        : "text-blue-800 dark:text-blue-300"
                                    )}>
                                      Polygon Blockchain (STAMLES)
                                    </span>
                                    <Badge variant={(detail as unknown as TimestampEntry).stamlesStatus === "CONFIRMED" ? "success" : (detail as unknown as TimestampEntry).stamlesStatus === "BATCHED" ? "info" : "warning"}>
                                      {(detail as unknown as TimestampEntry).stamlesStatus === "CONFIRMED" ? "Konfirmuar" : (detail as unknown as TimestampEntry).stamlesStatus === "BATCHED" ? "Ne Batch" : "Ne Rradhe"}
                                    </Badge>
                                  </div>
                                  {(detail as unknown as TimestampEntry).polygonTxHash ? (
                                    <div className="mt-1 space-y-1">
                                      <div className="flex items-center gap-2 text-[10px]">
                                        <span className="text-muted-foreground">TX:</span>
                                        <a
                                          href={`https://amoy.polygonscan.com/tx/${(detail as unknown as TimestampEntry).polygonTxHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-mono text-green-700 hover:underline dark:text-green-300"
                                        >
                                          {(detail as unknown as TimestampEntry).polygonTxHash!.slice(0, 20)}...
                                        </a>
                                      </div>
                                      {(detail as unknown as TimestampEntry).polygonBlockNumber && (
                                        <div className="flex items-center gap-2 text-[10px]">
                                          <span className="text-muted-foreground">Block:</span>
                                          <span className="font-mono text-foreground">#{(detail as unknown as TimestampEntry).polygonBlockNumber!.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                      Hash i dokumentit eshte ne rradhe per Merkle batching ne Polygon.
                                      Cdo 24 ore, te gjitha hash-et bashkohen ne nje Merkle tree dhe root-i ruhet on-chain.
                                    </p>
                                  )}
                                  <a
                                    href="https://amoy.polygonscan.com/address/0x62ab62912b89fA0aA3A1af3CF0dFAbAE3976EC85#events"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                                  >
                                    Shiko kontrakten ne PolygonScan
                                  </a>
                                </div>

                                {/* IPFS */}
                                {detail.ipfsCid && (
                                  <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                        IPFS Decentralized Proof
                                      </span>
                                    </div>
                                    <a
                                      href={`https://ipfs.io/ipfs/${detail.ipfsCid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block break-all font-mono text-[10px] text-blue-700 hover:text-blue-500 hover:underline dark:text-blue-300 mt-1"
                                    >
                                      {detail.ipfsCid}
                                    </a>
                                  </div>
                                )}

                                {/* Document */}
                                {detail.document && (
                                  <div className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Dokumenti
                                      </span>
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                        Private
                                      </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <Badge variant="default">
                                        {detail.document.fileType}
                                      </Badge>
                                      <p className="text-sm text-muted-foreground">
                                        {detail.document.title}
                                      </p>
                                    </div>
                                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                                      <span>{detail.document.fileName}</span>
                                      <span>
                                        {formatBytes(detail.document.fileSize)}
                                      </span>
                                      <Badge
                                        variant={
                                          detail.document.status === "COMPLETED"
                                            ? "success"
                                            : detail.document.status ===
                                                "PENDING_SIGNATURE"
                                              ? "warning"
                                              : "default"
                                        }
                                      >
                                        {detail.document.status.replace(
                                          /_/g,
                                          " "
                                        )}
                                      </Badge>
                                    </div>
                                  </div>
                                )}

                                {/* Signature */}
                                {detail.signature && (
                                  <div className="rounded-xl border border-border bg-card p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Nenshkruesi
                                      </span>
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                        Private
                                      </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">
                                        {detail.signature.signerName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {detail.signature.signerEmail}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                                      <Badge
                                        variant={
                                          detail.signature.status === "SIGNED"
                                            ? "success"
                                            : "warning"
                                        }
                                      >
                                        {detail.signature.status === "SIGNED"
                                          ? "Nenshkruar"
                                          : "Ne pritje"}
                                      </Badge>
                                      {detail.signature.signedAt && (
                                        <span>
                                          {new Date(
                                            detail.signature.signedAt
                                          ).toLocaleDateString("en-GB")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Chain Navigation */}
                            <div className="mt-5 flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                              <div className="flex items-center gap-3">
                                {detail.previousEntry ? (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDetail(
                                        detail.previousEntry!.sequenceNumber
                                      );
                                    }}
                                    className="gap-1"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                    #{detail.previousEntry.sequenceNumber}
                                  </Button>
                                ) : (
                                  <span className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-medium text-muted-foreground dark:bg-slate-700">
                                    Genesis Block
                                  </span>
                                )}

                                <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                                  <LinkIcon className="h-4 w-4" />
                                  Chain e lidhur kriptografikisht
                                </div>
                              </div>

                              {detail.nextEntry ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDetail(
                                      detail.nextEntry!.sequenceNumber
                                    );
                                  }}
                                  className="gap-1"
                                >
                                  #{detail.nextEntry.sequenceNumber}
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              ) : (
                                <span className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-medium text-muted-foreground dark:bg-slate-700">
                                  Latest
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            Gabim ne ngarkimin e detajeve
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {entries.length === 0 && initialLoading && (
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {entries.length === 0 && !initialLoading && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nuk ka timestamp entries akoma
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Faqja {pagination.page} / {pagination.totalPages} ({pagination.total})
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="min-h-[44px] min-w-[44px]"
              >
                Para
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setPage(Math.min(pagination.totalPages, page + 1))
                }
                disabled={page === pagination.totalPages}
                className="min-h-[44px] min-w-[44px]"
              >
                Pas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
