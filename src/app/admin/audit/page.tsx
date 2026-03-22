"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Activity, CalendarDays, Users, Zap, ChevronDown, Search, GitBranch } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface AuditUser {
  id: string;
  name: string | null;
  email: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string | null;
  user: AuditUser | null;
}

interface AuditData {
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: { total: number; todayCount: number; uniqueActions: number; uniqueUsers: number };
  filters: { actions: string[]; entityTypes: string[] };
}

function getActionBadgeVariant(action: string): "default" | "success" | "warning" | "info" | "destructive" | "purple" {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("CREATED")) return "success";
  if (upper.includes("UPDATE") || upper.includes("UPDATED")) return "info";
  if (upper.includes("DELETE") || upper.includes("DELETED")) return "destructive";
  if (upper.includes("SIGN") || upper.includes("VERIFY")) return "warning";
  if (upper.includes("LOGIN") || upper.includes("AUTH")) return "purple";
  return "default";
}

export default function AdminAuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "50" });
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    if (entityTypeFilter) params.set("entityType", entityTypeFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);

    const res = await fetch(`/api/admin/audit?${params}`);
    const json = await res.json();
    if (json.success) {
      setData(json.data);
    }
    setLoading(false);
  }, [page, search, actionFilter, entityTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = data?.pagination.totalPages || 1;

  function renderPageNumbers() {
    const pages: number[] = [];
    const maxVisible = 7;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  if (loading && !data) {
    return <PageSpinner />;
  }

  const stats = data?.stats;
  const logs = data?.logs || [];
  const actions = data?.filters.actions || [];
  const entityTypes = data?.filters.entityTypes || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Audit Log"
        subtitle="System-wide activity and event history"
        actions={
          <Link href="/admin/audit/timeline">
            <Button variant="secondary">
              <GitBranch className="mr-2 h-4 w-4" />
              Kronologjia e Detajuar
            </Button>
          </Link>
        }
      />

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Logs" value={stats.total.toLocaleString()} icon={Activity} iconColor="text-muted-foreground" iconBg="bg-muted" />
          <StatCard label="Today" value={stats.todayCount.toLocaleString()} icon={CalendarDays} iconColor="text-blue-400" iconBg="bg-blue-900/30" />
          <StatCard label="Unique Actions" value={stats.uniqueActions} icon={Zap} iconColor="text-blue-400" iconBg="bg-blue-900/30" />
          <StatCard label="Unique Users" value={stats.uniqueUsers} icon={Users} iconColor="text-green-400" iconBg="bg-green-900/30" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by action, entity, user, IP..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={entityTypeFilter}
          onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <option value="">All Entity Types</option>
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
          placeholder="To"
        />
      </div>

      {/* Loading overlay */}
      {loading && data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Refreshing...
        </div>
      )}

      {/* Table */}
      {logs.length === 0 && !loading ? (
        <EmptyState
          icon={Activity}
          title="No audit logs found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)} className="font-mono">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground" title={log.entityId}>
                      {log.entityId.length > 16
                        ? log.entityId.slice(0, 16) + "..."
                        : log.entityId}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <p className="text-foreground">{log.user.name || "\u2014"}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <ChevronDown
                        className={cn("h-4 w-4 text-muted-foreground transition-transform", expandedRow === log.id && "rotate-180")}
                      />
                    </TableCell>
                  </TableRow>

                  {expandedRow === log.id && (
                    <tr className="border-b border-border">
                      <td colSpan={7} className="bg-background px-6 py-4">
                        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Full Entity ID</p>
                            <p className="mt-0.5 break-all font-mono text-foreground">{log.entityId}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">User Agent</p>
                            <p className="mt-0.5 break-all text-muted-foreground">{log.userAgent || "\u2014"}</p>
                          </div>
                          <div className="sm:col-span-2 lg:col-span-1">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Log ID</p>
                            <p className="mt-0.5 break-all font-mono text-muted-foreground">{log.id}</p>
                          </div>
                          {log.metadata && (
                            <div className="sm:col-span-2 lg:col-span-3">
                              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Metadata</p>
                              <pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-card p-3 font-mono text-foreground">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({data?.pagination.total.toLocaleString()} entries)
          </p>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              First
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            {renderPageNumbers().map((p) => (
              <Button
                key={p}
                variant={p === page ? "primary" : "ghost"}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
