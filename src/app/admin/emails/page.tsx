"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail,
  MailOpen,
  MousePointerClick,
  MailX,
  Send,
  ChevronDown,
  RefreshCw,
  Search,
  Eye,
  TrendingUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatDateTimeFull } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface EmailOpen {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  openedAt: string;
}

interface EmailClick {
  id: string;
  url: string;
  ipAddress: string | null;
  userAgent: string | null;
  clickedAt: string;
}

interface EmailLogItem {
  id: string;
  trackingId: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  openCount: number;
  firstOpenAt: string | null;
  lastOpenAt: string | null;
  lastOpenIp: string | null;
  lastOpenUa: string | null;
  clickCount: number;
  firstClickAt: string | null;
  lastClickAt: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  opens: EmailOpen[];
  clicks: EmailClick[];
}

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  failed: number;
  deliveryRate: string;
  openRate: string;
  clickRate: string;
  bounceRate: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple"; icon: typeof Mail }
> = {
  QUEUED: { label: "Ne rradhe", variant: "default", icon: Clock },
  SENT: { label: "Derguar", variant: "success", icon: Send },
  DELIVERED: { label: "Dorezuar", variant: "success", icon: CheckCircle2 },
  OPENED: { label: "Hapur", variant: "info", icon: MailOpen },
  BOUNCED: { label: "Kthyer", variant: "warning", icon: MailX },
  FAILED: { label: "Deshtuar", variant: "destructive", icon: XCircle },
};

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<EmailLogItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchEmails = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (statusFilter) params.set("status", statusFilter);
      if (recipientFilter) params.set("recipient", recipientFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      try {
        const res = await fetch(`/api/admin/emails?${params}`);
        const data = await res.json();
        if (data.success) {
          setEmails(data.data);
          setStats(data.stats);
          setPagination(data.pagination);
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, recipientFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmails(pagination.page);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails, pagination.page]);

  function parseUserAgent(ua: string | null): string {
    if (!ua) return "-";
    // Extract browser and OS basics
    if (ua.length > 60) return ua.substring(0, 60) + "...";
    return ua;
  }

  if (loading && emails.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Email list skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                  <div className="min-w-0 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-4 w-24 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Emailet"
          subtitle={`${pagination.total} emaile gjithsej`}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchEmails(pagination.page)}
          disabled={loading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Rifresko
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Derguar</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.sent}</p>
              <p className="text-[11px] text-muted-foreground">
                {stats.deliveryRate}% dorezim
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Hapur</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.opened}</p>
              <p className="text-[11px] text-muted-foreground">
                {stats.openRate}% hapje
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Klikime</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.clickRate}%</p>
              <p className="text-[11px] text-muted-foreground">
                shkalla e klikimeve
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Kthyer</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.bounced}</p>
              <p className="text-[11px] text-muted-foreground">
                {stats.bounceRate}% bounce
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Gjithsej</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground">
                {stats.failed} deshtuar
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {["", "QUEUED", "SENT", "DELIVERED", "OPENED", "BOUNCED", "FAILED"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s ? STATUS_CONFIG[s]?.label || s : "Te gjitha"}
            </Button>
          ))}
        </div>
        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={recipientFilter}
            onChange={(e) => setRecipientFilter(e.target.value)}
            placeholder="Kerko per marresin..."
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="Nga data"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
          placeholder="Deri ne"
        />
      </div>

      {/* Email List */}
      {emails.length === 0 ? (
        <EmptyState icon={Mail} title="Nuk ka emaile" description="Nuk u gjeten emaile me keto filtra." />
      ) : (
        <div className="space-y-2">
          {emails.map((email) => {
            const statusCfg = STATUS_CONFIG[email.status];
            const isExpanded = expandedId === email.id;
            const StatusIcon = statusCfg?.icon || Mail;

            return (
              <div key={email.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                {/* Row header */}
                <div
                  className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/50"
                  onClick={() => setExpandedId(isExpanded ? null : email.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={cn("h-4 w-4 shrink-0",
                      email.status === "SENT" || email.status === "DELIVERED" ? "text-green-500" :
                      email.status === "OPENED" ? "text-blue-500" :
                      email.status === "BOUNCED" ? "text-yellow-500" :
                      email.status === "FAILED" ? "text-red-500" :
                      "text-muted-foreground"
                    )} />
                    {statusCfg && (
                      <Badge variant={statusCfg.variant} className="shrink-0">
                        {statusCfg.label}
                      </Badge>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {email.to}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                    {email.openCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {email.openCount}
                      </span>
                    )}
                    {email.clickCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" /> {email.clickCount}
                      </span>
                    )}
                    <span>{formatDateTime(email.createdAt)}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                    />
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Email details */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Detaje
                        </p>
                        <div className="mt-1 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Nga:</span> {email.from}</p>
                          <p><span className="text-muted-foreground">Drejt:</span> {email.to}</p>
                          <p><span className="text-muted-foreground">Tracking ID:</span>{" "}
                            <span className="font-mono text-xs">{email.trackingId}</span>
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Statistika
                        </p>
                        <div className="mt-1 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Hapje:</span> {email.openCount}x</p>
                          {email.firstOpenAt && (
                            <p><span className="text-muted-foreground">Hapja e pare:</span> {formatDateTime(email.firstOpenAt)}</p>
                          )}
                          {email.lastOpenAt && (
                            <p><span className="text-muted-foreground">Hapja e fundit:</span> {formatDateTime(email.lastOpenAt)}</p>
                          )}
                          <p><span className="text-muted-foreground">Klikime:</span> {email.clickCount}x</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Konteksti
                        </p>
                        <div className="mt-1 space-y-1 text-sm">
                          {email.entityType && (
                            <p><span className="text-muted-foreground">Lloji:</span> {email.entityType}</p>
                          )}
                          {email.entityId && (
                            <p>
                              <span className="text-muted-foreground">ID:</span>{" "}
                              <span className="font-mono text-xs">{email.entityId}</span>
                            </p>
                          )}
                          {email.errorMessage && (
                            <p className="text-red-500">
                              <span className="text-muted-foreground">Gabim:</span> {email.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tracking Timeline */}
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-2">
                        Kronologjia e gjurmimit
                      </p>
                      <div className="relative space-y-0">
                        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

                        {/* Sent event */}
                        <TimelineRow
                          icon={<Send className="h-3 w-3 text-green-500" />}
                          label="Derguar"
                          time={email.sentAt || email.createdAt}
                          status="success"
                        />

                        {/* Delivered */}
                        {email.deliveredAt && (
                          <TimelineRow
                            icon={<CheckCircle2 className="h-3 w-3 text-green-500" />}
                            label="Dorezuar"
                            time={email.deliveredAt}
                            status="success"
                          />
                        )}

                        {/* Opens */}
                        {email.opens.map((open, idx) => (
                          <TimelineRow
                            key={open.id}
                            icon={<MailOpen className="h-3 w-3 text-blue-500" />}
                            label={`Hapur (${idx + 1})`}
                            time={open.openedAt}
                            status="info"
                            details={[
                              open.ipAddress ? `IP: ${open.ipAddress}` : null,
                              open.userAgent ? parseUserAgent(open.userAgent) : null,
                            ].filter(Boolean) as string[]}
                          />
                        ))}

                        {/* Clicks */}
                        {email.clicks.map((click, idx) => (
                          <TimelineRow
                            key={click.id}
                            icon={<MousePointerClick className="h-3 w-3 text-purple-500" />}
                            label={`Klikuar (${idx + 1})`}
                            time={click.clickedAt}
                            status="info"
                            details={[
                              click.url,
                              click.ipAddress ? `IP: ${click.ipAddress}` : null,
                            ].filter(Boolean) as string[]}
                            linkUrl={click.url}
                          />
                        ))}

                        {/* Bounced */}
                        {email.bouncedAt && (
                          <TimelineRow
                            icon={<MailX className="h-3 w-3 text-yellow-500" />}
                            label="Kthyer (Bounce)"
                            time={email.bouncedAt}
                            status="warning"
                            details={email.errorMessage ? [email.errorMessage] : undefined}
                          />
                        )}

                        {/* Failed */}
                        {email.failedAt && (
                          <TimelineRow
                            icon={<XCircle className="h-3 w-3 text-red-500" />}
                            label="Deshtoi"
                            time={email.failedAt}
                            status="error"
                            details={email.errorMessage ? [email.errorMessage] : undefined}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Faqja {pagination.page} nga {pagination.totalPages} ({pagination.total} gjithsej)
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchEmails(pagination.page - 1)}
            >
              Para
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEmails(pagination.page + 1)}
            >
              Pas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineRow({
  icon,
  label,
  time,
  status,
  details,
  linkUrl,
}: {
  icon: React.ReactNode;
  label: string;
  time: string;
  status: "success" | "info" | "warning" | "error";
  details?: string[];
  linkUrl?: string;
}) {
  const dotColor =
    status === "success" ? "bg-green-500" :
    status === "info" ? "bg-blue-500" :
    status === "warning" ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div className="relative flex items-start gap-3 pb-3 pl-0">
      <div className={cn("relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-card flex items-center justify-center", dotColor)}>
        <div className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">{formatDateTimeFull(time)}</span>
        </div>
        {details && details.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {details.map((d, i) => (
              <p key={i} className="text-[11px] text-muted-foreground font-mono break-all">
                {d}
              </p>
            ))}
          </div>
        )}
        {linkUrl && (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline mt-0.5"
          >
            <ExternalLink className="h-3 w-3" />
            Hap linkun
          </a>
        )}
      </div>
    </div>
  );
}
