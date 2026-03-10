"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/audit-log?${params}`);
    const data = await res.json();
    if (data.success) {
      setLogs(data.data.logs);
      setTotalPages(data.data.pagination.totalPages);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function exportCsv() {
    const rows = logs.map((l) =>
      [
        new Date(l.createdAt).toISOString(),
        l.user?.name || "N/A",
        l.user?.email || "N/A",
        l.action,
        l.entityType,
        l.entityId,
        l.ipAddress || "",
      ].join(",")
    );
    const csv = "Data,Perdoruesi,Email,Veprimi,Tipi,ID,IP\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actionColors: Record<string, string> = {
    DOCUMENT_UPLOADED: "text-blue-600",
    DOCUMENT_SIGNED: "text-green-600",
    SIGNING_REQUEST_CREATED: "text-purple-600",
    CERTIFICATE_GENERATED: "text-indigo-600",
    CERTIFICATE_REVOKED: "text-red-600",
    SIGNING_OTP_SENT: "text-yellow-600",
    SIGNING_OTP_VERIFIED: "text-green-600",
    SIGNING_OTP_FAILED: "text-red-600",
    SIGNING_TOTP_VERIFIED: "text-green-600",
    SIGNING_TOTP_FAILED: "text-red-600",
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Audit Log</h1>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700"
        >
          Eksporto CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <option value="">Te gjitha veprimet</option>
          <option value="DOCUMENT_UPLOADED">Ngarkim dokumenti</option>
          <option value="DOCUMENT_SIGNED">Nenshkrim</option>
          <option value="SIGNING_REQUEST_CREATED">Kerkese nenshkrimi</option>
          <option value="CERTIFICATE_GENERATED">Certifikate e re</option>
          <option value="CERTIFICATE_REVOKED">Revokim certifikate</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Data</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Perdoruesi</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Veprimi</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">Tipi</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-600">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-500">
                  {new Date(log.createdAt).toLocaleString("en-GB")}
                </td>
                <td className="px-4 py-3">
                  {log.user ? (
                    <span className="text-zinc-900 dark:text-zinc-100">{log.user.name}</span>
                  ) : (
                    <span className="text-zinc-400">System</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${actionColors[log.action] || "text-zinc-700"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {log.entityType}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {log.ipAddress || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">Faqja {page} nga {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">
              Para
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">
              Pas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
