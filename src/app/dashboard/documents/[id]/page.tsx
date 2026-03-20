"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Upload,
  Shield,
  PenTool,
  ShieldCheck,
  Mail,
  MailOpen,
  MousePointerClick,
  KeyRound,
  Clock,
  Send,
  Hexagon,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  Bell,
  Hash,
  ExternalLink,
  Download,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_STATUS, SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDateTime, relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "info";
  details?: Record<string, string | number | null>;
}

interface SignatureInfo {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  order: number;
  signedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
}

interface DocumentData {
  id: string;
  title: string;
  fileName: string;
  fileHash: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const EVENT_ICONS: Record<string, typeof FileText> = {
  DOCUMENT_UPLOADED: Upload,
  CERTIFICATE_GENERATED: Shield,
  SIGNATURE_PLACED: PenTool,
  SIGNATURE_REJECTED: XCircle,
  EIDAS_ACCEPTED: ShieldCheck,
  EMAIL_OTP_SENT: Mail,
  EMAIL_OTP_VERIFIED: CheckCircle,
  TOTP_VERIFIED: KeyRound,
  PDF_SIGNED: Hash,
  TIMESTAMP_CREATED: Clock,
  STAMLES_SENT: Send,
  POLYGON_CONFIRMED: Hexagon,
  IPFS_PUBLISHED: Globe,
  EMAIL_SENT: Mail,
  EMAIL_OPENED: MailOpen,
  EMAIL_CLICKED: MousePointerClick,
  EMAIL_BOUNCED: AlertTriangle,
  EMAIL_FAILED: XCircle,
  DOCUMENT_VIEWED: Eye,
  REMINDER_SENT: Bell,
};

const STATUS_COLORS = {
  success: {
    ring: "border-green-500 bg-green-500",
    line: "bg-green-400",
    icon: "text-white",
    badge: "success" as const,
  },
  warning: {
    ring: "border-yellow-400 bg-yellow-400",
    line: "bg-yellow-300",
    icon: "text-white",
    badge: "warning" as const,
  },
  error: {
    ring: "border-red-500 bg-red-500",
    line: "bg-red-400",
    icon: "text-white",
    badge: "destructive" as const,
  },
  info: {
    ring: "border-blue-500 bg-blue-500",
    line: "bg-blue-300",
    icon: "text-white",
    badge: "info" as const,
  },
};

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [signatures, setSignatures] = useState<SignatureInfo[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/documents/${id}/timeline`);
        const data = await res.json();
        if (data.success) {
          setDocument(data.data.document);
          setSignatures(data.data.signatures);
          setTimeline(data.data.timeline);
        } else {
          setError(data.error || "Ndodhi nje gabim");
        }
      } catch {
        setError("Ndodhi nje gabim ne lidhje");
      }
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
        {/* Back button skeleton */}
        <Skeleton className="h-5 w-28" />

        {/* Document info header skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
            <Skeleton className="mt-4 h-8 w-full rounded-xl" />
          </CardContent>
        </Card>

        {/* Signatures skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">{error || "Dokumenti nuk u gjet"}</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/documents">Kthehu te Dokumentat</Link>
        </Button>
      </div>
    );
  }

  const st = DOCUMENT_STATUS[document.status] || DOCUMENT_STATUS.DRAFT;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      {/* Back button */}
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Dokumentat
      </Link>

      {/* Document Info Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">
                    {document.title}
                  </h1>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{document.fileName}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground/70">
                  <span>{formatBytes(document.fileSize)}</span>
                  <span>Krijuar: {formatDateTime(document.createdAt)}</span>
                  <span>Pronari: {document.owner.name}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {document.fileUrl && (
                <Button variant="secondary" size="sm" asChild>
                  <a href={`/api/documents/${document.id}/download`} download>
                    <Download className="h-3.5 w-3.5" />
                    Shkarko
                  </a>
                </Button>
              )}
              {!document.fileUrl && (
                <Badge variant="default">
                  <Lock className="h-3 w-3" />
                  File fshihet per privatesine
                </Badge>
              )}
            </div>
          </div>

          {/* File Hash */}
          <div className="mt-4 rounded-xl bg-muted px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              SHA-256:{" "}
            </span>
            <code className="break-all font-mono text-xs text-muted-foreground">
              {document.fileHash}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      {signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Nenshkrimet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {signatures.map((sig) => {
                const sigStatus = SIGNATURE_STATUS[sig.status] || SIGNATURE_STATUS.PENDING;
                return (
                  <div
                    key={sig.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
                        sig.status === "SIGNED"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : sig.status === "REJECTED"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-slate-100 dark:bg-slate-800"
                      )}>
                        {sig.status === "SIGNED" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : sig.status === "REJECTED" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{sig.signerName}</p>
                        <p className="text-xs text-muted-foreground">{sig.signerEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {sig.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(sig.signedAt)}
                        </span>
                      )}
                      <Badge variant={sigStatus.variant}>{sigStatus.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline e Auditimit</CardTitle>
          <p className="text-xs text-muted-foreground">
            Te gjitha ngjarjet per kete dokument, ne rradhe kronologjike
          </p>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nuk ka ngjarje akoma
            </p>
          ) : (
            <div className="relative">
              {timeline.map((event, index) => {
                const isLast = index === timeline.length - 1;
                const colors = STATUS_COLORS[event.status];
                const IconComponent = EVENT_ICONS[event.type] || Info;

                return (
                  <div key={`${event.type}-${index}`} className="relative flex gap-4">
                    {/* Timeline column */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2",
                          colors.ring
                        )}
                      >
                        <IconComponent className={cn("h-4 w-4", colors.icon)} strokeWidth={2} />
                      </div>
                      {!isLast && (
                        <div className={cn("w-0.5 min-h-[24px] flex-1", colors.line)} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={cn("flex-1", isLast ? "pb-0" : "pb-6")}>
                      <div className="rounded-xl border border-border bg-muted/50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{event.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {event.description}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {relativeTime(event.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Event details */}
                        {event.details && Object.keys(event.details).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.details.txHash && (
                              <a
                                href={`https://polygonscan.com/tx/${event.details.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
                              >
                                <Hexagon className="h-3 w-3" />
                                TX: {String(event.details.txHash).substring(0, 10)}...
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {event.details.cid && (
                              <a
                                href={`https://ipfs.io/ipfs/${event.details.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-teal-100 px-2.5 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50"
                              >
                                <Globe className="h-3 w-3" />
                                CID: {String(event.details.cid).substring(0, 12)}...
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {event.details.blockNumber && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Block #{String(event.details.blockNumber)}
                              </span>
                            )}
                            {event.details.sequenceNumber && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-[11px] font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                <Clock className="h-3 w-3" />
                                Chain #{String(event.details.sequenceNumber)}
                              </span>
                            )}
                            {event.details.hash && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {String(event.details.hash).substring(0, 16)}...
                              </span>
                            )}
                            {event.details.serialNumber && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <Shield className="h-3 w-3" />
                                SN: {String(event.details.serialNumber).substring(0, 12)}...
                              </span>
                            )}
                          </div>
                        )}

                        {/* Full timestamp on hover */}
                        <p className="mt-2 text-[10px] text-muted-foreground/60">
                          {formatDateTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
