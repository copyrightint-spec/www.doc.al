"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  Link as LinkIcon,
  ArrowLeft,
  ArrowRight,
  Search,
  Check,
  Copy,
  Archive,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface TimestampEntry {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
  type: "SINGLE_FILE" | "SUBMITTED_HASH" | "SIGNATURE";
  serverTimestamp: string;
  btcTxId: string | null;
  btcBlockHeight: number | null;
  btcBlockHash: string | null;
  otsStatus: "PENDING" | "CONFIRMED";
  createdAt: string;
  documentId: string | null;
  signatureId: string | null;
  previousEntryId: string | null;
  document: { id: string; title: string; owner: { name: string } } | null;
  signature: { id: string; signerEmail: string; signerName: string } | null;
  previousEntry: { sequenceNumber: number } | null;
  nextEntry: { sequenceNumber: number } | null;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  typeBreakdown: Record<string, number>;
}

const TYPE_BADGE: Record<string, { label: string; variant: "info" | "purple" | "warning" }> = {
  SINGLE_FILE: { label: "Single File", variant: "info" },
  SUBMITTED_HASH: { label: "Submitted Hash", variant: "purple" },
  SIGNATURE: { label: "Signature", variant: "warning" },
};

function truncateFingerprint(fp: string) {
  if (fp.length <= 24) return fp;
  return fp.slice(0, 12) + "..." + fp.slice(-8);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Kopjo"
      className="ml-1.5 inline-flex items-center rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export default function AdminTimestampsPage() {
  const [entries, setEntries] = useState<TimestampEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, confirmed: 0, pending: 0, typeBreakdown: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "30" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/timestamps?${params}`);
    const data = await res.json();
    if (data.success) {
      setEntries(data.data.entries);
      setStats(data.data.stats);
      setTotal(data.data.pagination.total);
      setTotalPages(data.data.pagination.totalPages);
    }
    setLoading(false);
  }, [search, typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const chainIntegrity = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Admin: Timestamps Explorer" subtitle="Blockchain timestamp chain & OpenTimestamps management" />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Entries" value={stats.total.toLocaleString()} icon={Clock} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Confirmed (BTC)" value={stats.confirmed.toLocaleString()} icon={CheckCircle} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Pending" value={stats.pending.toLocaleString()} icon={AlertCircle} iconColor="text-yellow-500" iconBg="bg-yellow-900/30" />
        <StatCard
          label="Chain Integrity"
          value={`${chainIntegrity}%`}
          icon={ShieldCheck}
          iconColor={chainIntegrity === 100 ? "text-green-500" : chainIntegrity > 80 ? "text-yellow-500" : "text-red-500"}
          iconBg={chainIntegrity === 100 ? "bg-green-900/30" : chainIntegrity > 80 ? "bg-yellow-900/30" : "bg-red-900/30"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kerko per fingerprint, seq#, BTC tx ID..."
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <option value="">Te gjitha tipet</option>
          <option value="SINGLE_FILE">Single File</option>
          <option value="SUBMITTED_HASH">Submitted Hash</option>
          <option value="SIGNATURE">Signature</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <option value="">Te gjitha statuset</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Entries List */}
      {loading ? (
        <PageSpinner />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nuk ka timestamp entries"
          description="Provo te ndryshosh filtrat e kerkimit"
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const typeCfg = TYPE_BADGE[entry.type];

            return (
              <Card key={entry.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : entry.id); }}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                >
                  {/* Sequence number */}
                  <div className="flex h-8 w-12 items-center justify-center rounded-lg bg-muted text-xs font-bold text-foreground">
                    #{entry.sequenceNumber}
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-foreground">
                        {truncateFingerprint(entry.fingerprint)}
                      </span>
                      <CopyButton text={entry.fingerprint} />
                      {typeCfg && <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {entry.document && (
                        <span>
                          Doc: <strong>{entry.document.title}</strong> ({entry.document.owner.name})
                        </span>
                      )}
                      <span>{formatDateTime(entry.serverTimestamp)}</span>
                    </div>
                  </div>

                  {/* BTC Status */}
                  <div className="flex items-center gap-2">
                    {entry.otsStatus === "CONFIRMED" ? (
                      <Badge variant="success" className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3" />
                        Block {entry.btcBlockHeight?.toLocaleString()}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="flex items-center gap-1.5">
                        <div className="h-3 w-3 animate-spin rounded-full border border-yellow-500 border-t-transparent" />
                        Pending
                      </Badge>
                    )}

                    {(entry.previousEntry || entry.nextEntry) && (
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    )}

                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <CardContent className="border-t border-border p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Full Fingerprint</span>
                        <div className="mt-1 flex items-center gap-1">
                          <p className="break-all font-mono text-xs text-foreground">{entry.fingerprint}</p>
                          <CopyButton text={entry.fingerprint} />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Sequential Fingerprint</span>
                        <div className="mt-1 flex items-center gap-1">
                          <p className="break-all font-mono text-xs text-foreground">{entry.sequentialFingerprint}</p>
                          <CopyButton text={entry.sequentialFingerprint} />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Type</span>
                        <p className="mt-1 text-xs text-foreground">{TYPE_BADGE[entry.type]?.label || entry.type}</p>
                      </div>

                      {entry.btcTxId && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">BTC Transaction ID</span>
                          <div className="mt-1 flex items-center gap-1">
                            <p className="break-all font-mono text-xs text-foreground">{entry.btcTxId}</p>
                            <CopyButton text={entry.btcTxId} />
                          </div>
                        </div>
                      )}

                      {entry.btcBlockHeight && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Block Height</span>
                          <p className="mt-1 text-xs text-foreground">{entry.btcBlockHeight.toLocaleString()}</p>
                        </div>
                      )}

                      {entry.btcBlockHash && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Block Hash</span>
                          <div className="mt-1 flex items-center gap-1">
                            <p className="break-all font-mono text-xs text-foreground">{entry.btcBlockHash}</p>
                            <CopyButton text={entry.btcBlockHash} />
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Chain Position</span>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {entry.previousEntry ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <ArrowLeft className="h-3 w-3" />
                              Prev: <strong className="text-foreground">#{entry.previousEntry.sequenceNumber}</strong>
                            </span>
                          ) : (
                            <Badge variant="default" className="text-[10px]">Genesis</Badge>
                          )}
                          {entry.nextEntry && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              Next: <strong className="text-foreground">#{entry.nextEntry.sequenceNumber}</strong>
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      {entry.document && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Document</span>
                          <p className="mt-1 text-xs font-medium text-foreground">{entry.document.title}</p>
                          <p className="text-[11px] text-muted-foreground">Owner: {entry.document.owner.name}</p>
                        </div>
                      )}

                      {entry.signature && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Signature</span>
                          <p className="mt-1 text-xs font-medium text-foreground">{entry.signature.signerName}</p>
                          <p className="text-[11px] text-muted-foreground">{entry.signature.signerEmail}</p>
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Server Timestamp</span>
                        <p className="mt-1 text-xs text-foreground">{formatDateTime(entry.serverTimestamp)}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Created At</span>
                        <p className="mt-1 text-xs text-foreground">{formatDateTime(entry.createdAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Faqja {page} nga {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Para</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Pas</Button>
          </div>
        </div>
      )}
    </div>
  );
}
