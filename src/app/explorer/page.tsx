"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SINGLE_FILE: <FileText className="h-4 w-4" />,
  SUBMITTED_HASH: <Hash className="h-4 w-4" />,
  SIGNATURE: <PenTool className="h-4 w-4" />,
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
      className="ml-1 rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="Kopjo"
    >
      {copied ? (
        <Check className="h-3 w-3 inline" />
      ) : (
        <Copy className="h-3 w-3 inline" />
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
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    );
  }

  function truncateHash(hash: string) {
    if (hash.length <= 20) return hash;
    return hash.slice(0, 10) + "..." + hash.slice(-6);
  }

  function statusBadge(entry: TimestampEntry) {
    if (
      entry.stamlesStatus === "CONFIRMED" ||
      entry.otsStatus === "CONFIRMED"
    ) {
      const link = entry.polygonTxHash
        ? `https://amoy.polygonscan.com/tx/${entry.polygonTxHash}`
        : entry.polygonBlockNumber
          ? `https://amoy.polygonscan.com/block/${entry.polygonBlockNumber}`
          : undefined;
      const badge = (
        <Badge variant="success">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Confirmed
        </Badge>
      );
      if (link) {
        return (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {badge}
          </a>
        );
      }
      return badge;
    }
    if (entry.stamlesStatus === "BATCHED") {
      return (
        <Badge variant="info">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          Batched
        </Badge>
      );
    }
    return (
      <Badge variant="default">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
        Queued
      </Badge>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/api/logo"
                  unoptimized
                  alt="doc.al"
                  width={36}
                  height={36}
                  className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                />
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  doc<span className="text-blue-600">.al</span>
                </span>
              </Link>
              <div className="hidden sm:block h-4 w-px bg-border" />
              <span className="hidden sm:block text-xs text-muted-foreground">
                Explorer
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="hidden sm:inline">Live</span>
                {pagination && (
                  <span className="text-muted-foreground/60 ml-1">
                    {pagination.total}
                  </span>
                )}
              </div>

              <Link
                href="/certificates"
                className="hidden sm:block text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Certifikata
              </Link>

              {userSession ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-muted px-3 py-2.5 sm:py-2 text-sm text-foreground min-h-[44px] sm:min-h-0 sm:w-44"
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
            className="w-full rounded-lg"
          />
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => toggleDetail(entry.sequenceNumber)}
              className={cn(
                "rounded-lg border border-border bg-card p-3 cursor-pointer transition-colors",
                expandedSeq === entry.sequenceNumber &&
                  "border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20",
                newEntryIds.has(entry.id) &&
                  "bg-green-50 dark:bg-green-950/30 animate-pulse"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/explorer/${entry.sequenceNumber}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm"
                  >
                    #{entry.sequenceNumber}
                  </Link>
                  {statusBadge(entry)}
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                    expandedSeq === entry.sequenceNumber && "rotate-90"
                  )}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">
                {formatDate(entry.serverTimestamp)}
              </p>
              <p className="font-mono text-[11px] text-foreground/60 truncate">
                {entry.fingerprint}
              </p>

              {/* Expanded detail */}
              {expandedSeq === entry.sequenceNumber && (
                <div
                  className="mt-3 pt-3 border-t border-border space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {detailLoading ? (
                    <div className="flex justify-center py-3">
                      <Spinner />
                    </div>
                  ) : detail ? (
                    <>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Fingerprint
                        </span>
                        <div className="mt-0.5 rounded bg-muted px-2 py-1.5 flex items-center gap-1">
                          <code className="break-all font-mono text-[11px] text-foreground flex-1">
                            {detail.fingerprint}
                          </code>
                          <CopyButton text={detail.fingerprint} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Seq. Fingerprint
                        </span>
                        <div className="mt-0.5 rounded bg-muted px-2 py-1.5 flex items-center gap-1">
                          <code className="break-all font-mono text-[11px] text-foreground flex-1">
                            {detail.sequentialFingerprint}
                          </code>
                          <CopyButton text={detail.sequentialFingerprint} />
                        </div>
                      </div>
                      {detail.document && (
                        <div className="rounded border border-border p-2">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Dokumenti
                          </span>
                          <p className="text-sm text-foreground mt-0.5">
                            {detail.document.title}
                          </p>
                          <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{detail.document.fileName}</span>
                            <span>
                              {formatBytes(detail.document.fileSize)}
                            </span>
                          </div>
                        </div>
                      )}
                      {detail.signature && (
                        <div className="rounded border border-border p-2">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Nenshkruesi
                          </span>
                          <p className="text-sm text-foreground mt-0.5">
                            {detail.signature.signerName}
                          </p>
                        </div>
                      )}
                      <Link
                        href={`/explorer/${detail.sequenceNumber}`}
                        className="block"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full min-h-[44px] gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Faqja e plote
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Gabim ne ngarkimin e detajeve
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {entries.length === 0 && initialLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`skel-m-${i}`} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40 mb-1.5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}
          {entries.length === 0 && !initialLoading && (
            <p className="text-center text-muted-foreground py-8">
              Nuk ka timestamp entries akoma
            </p>
          )}
        </div>

        {/* Desktop Table */}
        <Card className="overflow-hidden hidden md:block border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-8" />
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">Fingerprint</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">IPFS</TableHead>
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
                        "bg-blue-50/50 dark:bg-blue-950/10",
                      newEntryIds.has(entry.id) &&
                        "bg-green-50 dark:bg-green-950/30 animate-pulse"
                    )}
                  >
                    <TableCell className="text-center px-2">
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform",
                          expandedSeq === entry.sequenceNumber && "rotate-90"
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/explorer/${entry.sequenceNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        #{entry.sequenceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {formatDate(entry.serverTimestamp)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/explorer/${entry.sequenceNumber}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                        title={entry.fingerprint}
                      >
                        {truncateHash(entry.fingerprint)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {TYPE_ICONS[entry.type]}
                        {TYPE_LABELS[entry.type] || entry.type}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(entry)}</TableCell>
                    <TableCell>
                      {entry.ipfsCid ? (
                        <a
                          href={`https://ipfs.io/ipfs/${entry.ipfsCid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="info">IPFS</Badge>
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">
                          --
                        </span>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Expanded Detail Row */}
                  {expandedSeq === entry.sequenceNumber && (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-b border-border bg-muted/20 px-0"
                      >
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Spinner />
                          </div>
                        ) : detail ? (
                          <div className="px-6 py-4">
                            <div className="mb-4 flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground",
                                  "bg-blue-100 dark:bg-blue-900/30"
                                )}
                              >
                                {TYPE_ICONS[detail.type] ||
                                  TYPE_ICONS.SINGLE_FILE}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-foreground">
                                  Entry #{detail.sequenceNumber}
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
                                  className="gap-1 text-xs"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Detaje
                                </Button>
                              </Link>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              {/* Left: Hashes */}
                              <div className="space-y-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      Fingerprint (SHA-256)
                                    </span>
                                    <CopyButton text={detail.fingerprint} />
                                  </div>
                                  <div className="rounded bg-muted px-3 py-1.5">
                                    <code className="break-all font-mono text-xs text-foreground">
                                      {detail.fingerprint}
                                    </code>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      Sequential Fingerprint
                                    </span>
                                    <CopyButton
                                      text={detail.sequentialFingerprint}
                                    />
                                  </div>
                                  <div className="rounded bg-muted px-3 py-1.5">
                                    <code className="break-all font-mono text-xs text-foreground">
                                      {detail.sequentialFingerprint}
                                    </code>
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                                  Seq.FP = SHA-256(prev + fingerprint +
                                  timestamp)
                                </p>
                              </div>

                              {/* Right: Details */}
                              <div className="space-y-3">
                                {/* Polygon Status */}
                                <div
                                  className={cn(
                                    "rounded-lg border p-3",
                                    (
                                      detail as unknown as TimestampEntry
                                    ).stamlesStatus === "CONFIRMED"
                                      ? "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20"
                                      : "border-border"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span
                                      className={cn(
                                        "h-2 w-2 rounded-full",
                                        (
                                          detail as unknown as TimestampEntry
                                        ).stamlesStatus === "CONFIRMED"
                                          ? "bg-green-500"
                                          : "bg-blue-500 animate-pulse"
                                      )}
                                    />
                                    <span className="text-xs font-semibold text-foreground">
                                      Polygon (STAMLES)
                                    </span>
                                  </div>
                                  {(detail as unknown as TimestampEntry)
                                    .polygonTxHash ? (
                                    <a
                                      href={`https://amoy.polygonscan.com/tx/${(detail as unknown as TimestampEntry).polygonTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      TX:{" "}
                                      {(
                                        detail as unknown as TimestampEntry
                                      ).polygonTxHash!.slice(0, 20)}
                                      ...
                                    </a>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground">
                                      Ne rradhe per Merkle batching
                                    </p>
                                  )}
                                </div>

                                {/* IPFS */}
                                {detail.ipfsCid && (
                                  <div className="rounded-lg border border-border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                                      <span className="text-xs font-semibold text-foreground">
                                        IPFS
                                      </span>
                                    </div>
                                    <a
                                      href={`https://ipfs.io/ipfs/${detail.ipfsCid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block break-all font-mono text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {detail.ipfsCid}
                                    </a>
                                  </div>
                                )}

                                {/* Document */}
                                {detail.document && (
                                  <div className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-foreground">
                                        Dokumenti
                                      </span>
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                        Private
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground">
                                      {detail.document.title}
                                    </p>
                                    <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                                      <span>{detail.document.fileName}</span>
                                      <span>
                                        {formatBytes(detail.document.fileSize)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Signature */}
                                {detail.signature && (
                                  <div className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-foreground">
                                        Nenshkruesi
                                      </span>
                                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Lock className="h-3 w-3" />
                                        Private
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground">
                                      {detail.signature.signerName}
                                    </p>
                                    <Badge
                                      variant={
                                        detail.signature.status === "SIGNED"
                                          ? "success"
                                          : "warning"
                                      }
                                      className="mt-1"
                                    >
                                      {detail.signature.status === "SIGNED"
                                        ? "Nenshkruar"
                                        : "Ne pritje"}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Chain Navigation */}
                            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                              <div className="flex items-center gap-2">
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
                                    className="gap-1 text-xs"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                    #{detail.previousEntry.sequenceNumber}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Genesis
                                  </span>
                                )}
                                <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <LinkIcon className="h-3 w-3" />
                                  Chain
                                </span>
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
                                  className="gap-1 text-xs"
                                >
                                  #{detail.nextEntry.sequenceNumber}
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Latest
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-6 text-center text-muted-foreground text-sm">
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
                      <TableCell>
                        <Skeleton className="h-3 w-3" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-10 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {entries.length === 0 && !initialLoading && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="min-h-[44px] min-w-[44px]"
              >
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
