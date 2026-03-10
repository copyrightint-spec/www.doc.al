"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface TimestampEntry {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
  type: string;
  serverTimestamp: string;
  btcTxId: string | null;
  btcBlockHeight: number | null;
  otsStatus: string;
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

const TYPE_COLORS: Record<string, string> = {
  SINGLE_FILE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  SUBMITTED_HASH: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  SIGNATURE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function ExplorerPage() {
  const [entries, setEntries] = useState<TimestampEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
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

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  }

  function truncateHash(hash: string) {
    if (hash.length <= 20) return hash;
    return hash.slice(0, 16) + "..." + hash.slice(-8);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                doc.al
              </Link>
              <h1 className="mt-1 text-sm text-zinc-500">
                Timestamp Explorer - Public Chain
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Real-time
              {pagination && (
                <span className="ml-2">
                  {pagination.total} total entries
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Te gjitha tipet</option>
            <option value="SINGLE_FILE">single-file</option>
            <option value="SUBMITTED_HASH">submitted-hash</option>
            <option value="SIGNATURE">signature</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kerko me fingerprint hash..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 min-w-[200px]"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">ID</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Time Stamp (UTC)</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Fingerprint (SHA-256)</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Sequential Fingerprint (SHA-256)</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">BTC</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={`border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 ${
                    newEntryIds.has(entry.id)
                      ? "bg-green-50 dark:bg-green-950/30 animate-pulse"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/explorer/${entry.sequenceNumber}`}
                      className="font-mono font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {entry.sequenceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                    {formatDate(entry.serverTimestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-zinc-600 dark:text-zinc-400" title={entry.fingerprint}>
                      {truncateHash(entry.fingerprint)}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${TYPE_COLORS[entry.type] || ""}`}>
                      {TYPE_LABELS[entry.type] || entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-zinc-600 dark:text-zinc-400" title={entry.sequentialFingerprint}>
                      {truncateHash(entry.sequentialFingerprint)}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    {entry.otsStatus === "CONFIRMED" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Block #{entry.btcBlockHeight}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">
                    Nuk ka timestamp entries akoma
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Faqja {pagination.page} nga {pagination.totalPages} ({pagination.total} gjithsej)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Para
              </button>
              <button
                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page === pagination.totalPages}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Pas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
