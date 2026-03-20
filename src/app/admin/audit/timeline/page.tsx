"use client";

import { useState, useCallback } from "react";
import {
  Search,
  FileUp,
  ShieldCheck,
  PenTool,
  Scale,
  Mail,
  KeyRound,
  UserCheck,
  FileSignature,
  Cloud,
  Clock,
  Link2,
  Send,
  Hexagon,
  Globe,
  MailCheck,
  MailOpen,
  MousePointerClick,
  MailX,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTimeFull } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  status: "success" | "warning" | "error" | "info" | "pending";
  details: Record<string, string | number | boolean | null>;
  links?: { label: string; href: string }[];
}

interface TimelineData {
  entityType: string;
  entityId: string;
  entityTitle: string;
  events: TimelineEvent[];
}

const EVENT_ICONS: Record<string, typeof FileUp> = {
  DOCUMENT_UPLOADED: FileUp,
  CERTIFICATE_GENERATED: ShieldCheck,
  SIGNATURE_PLACED: PenTool,
  EIDAS_CONSENT: Scale,
  EMAIL_OTP_SENT: Mail,
  EMAIL_OTP_VERIFIED: MailCheck,
  TOTP_VERIFIED: KeyRound,
  KYC_STATUS: UserCheck,
  PDF_SIGNED: FileSignature,
  S3_UPLOAD: Cloud,
  TIMESTAMP_CREATED: Clock,
  SEQUENTIAL_CHAIN: Link2,
  STAMLES_SUBMITTED: Send,
  POLYGON_CONFIRMED: Hexagon,
  IPFS_PUBLISHED: Globe,
  EMAIL_SENT: Mail,
  EMAIL_OPENED: MailOpen,
  EMAIL_CLICKED: MousePointerClick,
  EMAIL_BOUNCED: MailX,
  EMAIL_FAILED: MailX,
  TOTP_SETUP: ShieldAlert,
};

const STATUS_COLORS: Record<string, string> = {
  success: "border-green-500 bg-green-500",
  warning: "border-yellow-500 bg-yellow-500",
  error: "border-red-500 bg-red-500",
  info: "border-blue-500 bg-blue-500",
  pending: "border-slate-400 bg-slate-400",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: CheckCircle2,
  pending: Loader2,
};

const STATUS_ICON_COLORS: Record<string, string> = {
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  info: "text-blue-500",
  pending: "text-slate-400",
};

const STATUS_BADGE_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "default"> = {
  success: "success",
  warning: "warning",
  error: "destructive",
  info: "info",
  pending: "default",
};

export default function AdminAuditTimelinePage() {
  const [searchType, setSearchType] = useState<"documentId" | "signatureId" | "hash" | "sequenceNumber" | "email">("documentId");
  const [searchValue, setSearchValue] = useState("");
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({ [searchType]: searchValue.trim() });
      const res = await fetch(`/api/admin/audit/timeline?${params}`);
      const json = await res.json();

      if (json.success) {
        setTimeline(json.data);
      } else {
        setError(json.error || "Gabim gjate kerkimit");
        setTimeline(null);
      }
    } catch {
      setError("Gabim ne lidhje me serverin");
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, [searchType, searchValue]);

  const searchTypes = [
    { value: "documentId", label: "ID Dokumenti" },
    { value: "signatureId", label: "ID Nenshkrimi" },
    { value: "hash", label: "Hash Dokumenti" },
    { value: "sequenceNumber", label: "Nr. Sekuence" },
    { value: "email", label: "Email Perdoruesi" },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/audit" className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <PageHeader
          title="Kronologjia e Auditimit"
          subtitle="Gjurmoni cdo hap te nje nenshkrimi ose dokumenti"
        />
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as typeof searchType)}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
            >
              {searchTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={
                  searchType === "documentId" ? "Shkruani ID-ne e dokumentit..."
                    : searchType === "signatureId" ? "Shkruani ID-ne e nenshkrimit..."
                    : searchType === "hash" ? "Shkruani hash-in e dokumentit..."
                    : searchType === "sequenceNumber" ? "Shkruani numrin e sekuences..."
                    : "Shkruani email-in..."
                }
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchValue.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Kerko
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          {/* Entity header skeleton */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
          {/* Timeline events skeleton */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 text-red-500">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {searched && !loading && !error && !timeline && (
        <EmptyState
          icon={Search}
          title="Asnje rezultat"
          description="Nuk u gjet asnje te dhene per kete kerkim. Provoni me nje vlere tjeter."
        />
      )}

      {/* Timeline */}
      {timeline && !loading && (
        <>
          {/* Entity header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {timeline.entityType}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{timeline.entityTitle}</p>
                  <p className="font-mono text-xs text-muted-foreground">{timeline.entityId}</p>
                </div>
                <Badge variant="info" className="ml-auto">
                  {timeline.events.length} ngjarje
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timeline events */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-0">
              {timeline.events.map((event, idx) => {
                const Icon = EVENT_ICONS[event.type] || Clock;
                const StatusIcon = STATUS_ICONS[event.status] || CheckCircle2;
                const isLast = idx === timeline.events.length - 1;

                return (
                  <div key={event.id} className="relative flex gap-4 pb-6">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-card border-border">
                      <Icon className={cn("h-4 w-4", STATUS_ICON_COLORS[event.status])} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Card className={cn(isLast && "mb-0")}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <StatusIcon className={cn("h-4 w-4 shrink-0", STATUS_ICON_COLORS[event.status])} />
                              <h4 className="font-medium text-sm text-foreground truncate">{event.title}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={STATUS_BADGE_VARIANT[event.status]} className="text-[10px]">
                                {event.status === "success" ? "OK" : event.status === "warning" ? "Paralajmerim" : event.status === "error" ? "Gabim" : event.status === "pending" ? "Ne pritje" : "Info"}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatDateTimeFull(event.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(event.details)
                              .filter(([, v]) => v !== null && v !== undefined && v !== "")
                              .map(([key, value]) => (
                                <div key={key}>
                                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                                  </span>
                                  <p className="font-mono text-[11px] text-foreground break-all">
                                    {String(value)}
                                  </p>
                                </div>
                              ))}
                          </div>

                          {/* Links */}
                          {event.links && event.links.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 pt-2 border-t border-border">
                              {event.links.map((link) => (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:underline"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
