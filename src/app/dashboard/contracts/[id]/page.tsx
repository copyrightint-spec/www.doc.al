"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Check,
  X,
  Clock,
  Mail,
  MailOpen,
  MousePointerClick,
  Eye,
  PenTool,
  Bell,
  Info,
  Download,
  Upload,
  Shield,
  ShieldCheck,
  KeyRound,
  Hash,
  Send,
  Hexagon,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDateTime, relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface SignerInfo {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  order: number;
  signedAt: string | null;
  viewedAt: string | null;
  verificationSentAt: string | null;
  lastReminderAt: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  metadata: Record<string, string> | null;
  user: { id: string; name: string; email: string } | null;
}

interface ContractDetail {
  id: string;
  status: string;
  message: string | null;
  companyName: string | null;
  companyLogo: string | null;
  brandColor: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    status: string;
    createdAt: string;
    owner: { id: string; name: string; email: string; image: string | null };
  };
  signatures: SignerInfo[];
  requester: { id: string; name: string; email: string; image: string | null };
  template: { id: string; name: string; category: string | null } | null;
  auditLogs: AuditEntry[];
  isOwner: boolean;
  isRequester: boolean;
}

// Contract-level status mapping (these statuses differ from the shared CONTRACT_STATUS constants)
const CONTRACT_PAGE_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" }> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  IN_PROGRESS: { label: "Ne Progres", variant: "info" },
  COMPLETED: { label: "Perfunduar", variant: "success" },
  CANCELLED: { label: "Anulluar", variant: "destructive" },
  EXPIRED: { label: "Skaduar", variant: "default" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function getSignerNodeState(
  signer: SignerInfo,
  index: number,
  allSigners: SignerInfo[]
): "completed" | "in_progress" | "pending" | "rejected" | "expired" {
  if (signer.status === "SIGNED") return "completed";
  if (signer.status === "REJECTED") return "rejected";
  if (signer.status === "EXPIRED") return "expired";
  const previousCompleted = allSigners
    .filter((s) => s.order < signer.order)
    .every((s) => s.status === "SIGNED");
  if (previousCompleted && index === allSigners.findIndex((s) => s.status === "PENDING")) {
    return "in_progress";
  }
  return "pending";
}

interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "info";
  details?: Record<string, string | number | null>;
}

const TIMELINE_ICONS: Record<string, typeof FileText> = {
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

const TIMELINE_STATUS_COLORS = {
  success: {
    ring: "border-green-500 bg-green-500",
    line: "bg-green-400",
    icon: "text-white",
  },
  warning: {
    ring: "border-yellow-400 bg-yellow-400",
    line: "bg-yellow-300",
    icon: "text-white",
  },
  error: {
    ring: "border-red-500 bg-red-500",
    line: "bg-red-400",
    icon: "text-white",
  },
  info: {
    ring: "border-blue-500 bg-blue-500",
    line: "bg-blue-300",
    icon: "text-white",
  },
};

interface StampData {
  certificationHash: string;
  verificationUrl: string;
  qrCodeDataUri: string;
  stampedAt: string;
  document: { title: string; fileName: string; fileHash: string };
  signers: { name: string; email: string; signedAt: string | null; order: number }[];
  blockchain: { status: string; btcBlockHeight: number | null; btcTxId: string | null } | null;
}

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [stamp, setStamp] = useState<StampData | null>(null);
  const [stampLoading, setStampLoading] = useState(false);
  const [docTimeline, setDocTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/${id}`);
        const data = await res.json();
        if (data.success) {
          setContract(data.data);
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

  // Ngarko timeline-in e dokumentit
  useEffect(() => {
    async function loadTimeline() {
      if (!contract) return;
      setTimelineLoading(true);
      try {
        const res = await fetch(`/api/documents/${contract.document.id}/timeline`);
        const data = await res.json();
        if (data.success) {
          setDocTimeline(data.data.timeline);
        }
      } catch {
        // silent - timeline is optional enhancement
      }
      setTimelineLoading(false);
    }
    loadTimeline();
  }, [contract]);

  // Ngarko vulen DOC.AL kur kontrata eshte COMPLETED
  useEffect(() => {
    async function loadStamp() {
      if (!contract || contract.status !== "COMPLETED") return;
      setStampLoading(true);
      try {
        const res = await fetch(`/api/documents/${contract.document.id}/stamp`);
        const data = await res.json();
        if (data.success) {
          setStamp(data.data);
        }
      } catch {
        // silent - stamp is optional enhancement
      }
      setStampLoading(false);
    }
    loadStamp();
  }, [contract]);

  async function sendReminder(signatureId: string) {
    setSendingReminder(signatureId);
    try {
      await fetch(`/api/signatures/${signatureId}/remind`, { method: "POST" });
    } catch {
      // silent
    }
    setSendingReminder(null);
  }

  if (loading) {
    return <PageSpinner />;
  }

  if (error || !contract) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">{error || "Kerkesa nuk u gjet"}</p>
        <Button variant="link" asChild>
          <Link href="/dashboard/contracts">Kthehu te eSign</Link>
        </Button>
      </div>
    );
  }

  const st = CONTRACT_PAGE_STATUS[contract.status] || CONTRACT_PAGE_STATUS.PENDING;
  const signedCount = contract.signatures.filter((s) => s.status === "SIGNED").length;
  const totalSigners = contract.signatures.length;
  const progressPercent = totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0;
  const canManage = contract.isOwner || contract.isRequester;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      {/* Back button */}
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        eSign
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
                    {contract.document.title}
                  </h1>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{contract.document.fileName}</p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground/70">
                  <span>{formatBytes(contract.document.fileSize)}</span>
                  <span>Krijuar: {formatDateTime(contract.createdAt)}</span>
                  {contract.expiresAt && (
                    <span>Skadon: {formatDateTime(contract.expiresAt)}</span>
                  )}
                  {contract.completedAt && (
                    <span className="text-green-600 dark:text-green-400">
                      Perfunduar: {formatDateTime(contract.completedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {canManage && contract.status !== "COMPLETED" && contract.status !== "CANCELLED" && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Jeni i sigurt qe doni te anuloni kete kontrate?")) {
                      fetch(`/api/contracts/${id}/cancel`, { method: "POST" }).then(() =>
                        window.location.reload()
                      );
                    }
                  }}
                >
                  Anulo
                </Button>
              </div>
            )}
          </div>

          {/* Owner & Company Info */}
          <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              {contract.requester.image ? (
                <img src={contract.requester.image} alt="" className="h-7 w-7 rounded-full" />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {contract.requester.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Krijuar nga</p>
                <p className="text-sm font-medium text-foreground">{contract.requester.name}</p>
              </div>
            </div>
            {contract.companyName && (
              <div className="flex items-center gap-2">
                {contract.companyLogo ? (
                  <img src={contract.companyLogo} alt="" className="h-7 w-7 rounded-lg object-contain" />
                ) : (
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: contract.brandColor || "hsl(var(--primary))" }}
                  >
                    {contract.companyName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Kompania</p>
                  <p className="text-sm font-medium text-foreground">{contract.companyName}</p>
                </div>
              </div>
            )}
            {contract.template && (
              <div>
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium text-foreground">{contract.template.name}</p>
              </div>
            )}
          </div>

          {/* Message */}
          {contract.message && (
            <div className="mt-4 rounded-xl bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground">Mesazhi:</p>
              <p className="mt-1 text-sm text-foreground">{contract.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Progress Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Progresi i nenshkrimeve
            </p>
            <p className="text-sm font-bold text-foreground">
              {signedCount} nga {totalSigners}{" "}
              <span className="font-normal text-muted-foreground">({progressPercent}%)</span>
            </p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? "#22c55e" : "hsl(var(--primary))",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Signing Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline e Nenshkrimeve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {contract.signatures.map((signer, index) => {
              const state = getSignerNodeState(signer, index, contract.signatures);
              const isLast = index === contract.signatures.length - 1;
              const sigStatus = SIGNATURE_STATUS[signer.status] || SIGNATURE_STATUS.PENDING;

              const nodeStyles = {
                completed: {
                  ring: "border-green-500 bg-green-500",
                  line: "bg-green-400",
                  icon: <Check className="h-4 w-4 text-white" strokeWidth={3} />,
                },
                in_progress: {
                  ring: "border-yellow-400 bg-yellow-400 animate-pulse",
                  line: "bg-slate-200 dark:bg-slate-700",
                  icon: <Clock className="h-4 w-4 text-white" strokeWidth={2.5} />,
                },
                pending: {
                  ring: "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700",
                  line: "bg-slate-200 dark:bg-slate-700",
                  icon: (
                    <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                  ),
                },
                rejected: {
                  ring: "border-red-500 bg-red-500",
                  line: "bg-slate-200 dark:bg-slate-700",
                  icon: <X className="h-4 w-4 text-white" strokeWidth={3} />,
                },
                expired: {
                  ring: "border-slate-400 bg-slate-400",
                  line: "bg-slate-200 dark:bg-slate-700",
                  icon: <Clock className="h-4 w-4 text-white" strokeWidth={2.5} />,
                },
              };

              const ns = nodeStyles[state];

              return (
                <div key={signer.id} className="relative flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2",
                        ns.ring
                      )}
                    >
                      {ns.icon}
                    </div>
                    {!isLast && (
                      <div className={cn("w-0.5 min-h-[40px] flex-1", ns.line)} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {signer.signerName}
                          </p>
                          <p className="text-xs text-muted-foreground">{signer.signerEmail}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sigStatus.variant}>{sigStatus.label}</Badge>
                          {canManage && signer.status === "PENDING" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => sendReminder(signer.id)}
                              disabled={sendingReminder === signer.id}
                              className="h-auto px-2.5 py-1 text-[10px]"
                            >
                              {sendingReminder === signer.id ? "Duke derguar..." : "Dergo Kujtese"}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Key Timestamps */}
                      <div className="mt-3 flex flex-wrap gap-4">
                        {signer.verificationSentAt && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-[11px] text-muted-foreground">
                              Derguar: {relativeTime(signer.verificationSentAt)}
                            </span>
                          </div>
                        )}
                        {signer.viewedAt && (
                          <div className="flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-[11px] text-muted-foreground">
                              Pare: {relativeTime(signer.viewedAt)}
                            </span>
                          </div>
                        )}
                        {signer.signedAt && (
                          <div className="flex items-center gap-1.5">
                            <PenTool className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-[11px] text-muted-foreground">
                              Nenshkruar: {relativeTime(signer.signedAt)}
                            </span>
                          </div>
                        )}
                        {signer.lastReminderAt && (
                          <div className="flex items-center gap-1.5">
                            <Bell className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-[11px] text-muted-foreground">
                              Kujtese: {relativeTime(signer.lastReminderAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      {state === "in_progress" && (
                        <p className="mt-2 text-[11px] font-medium text-yellow-600 dark:text-yellow-400">
                          Ne pritje te nenshkrimit...
                        </p>
                      )}
                      {state === "completed" && signer.signedAt && (
                        <p className="mt-2 text-[11px] text-green-600 dark:text-green-400">
                          Nenshkruar {formatDateTime(signer.signedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      {contract.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historiku i Aktivitetit</CardTitle>
          </CardHeader>
          <div className="divide-y divide-border">
            {contract.auditLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {log.action.replace(/_/g, " ").toLowerCase()}
                    {log.user && (
                      <span className="ml-1 text-muted-foreground">
                        nga {log.user.name}
                      </span>
                    )}
                  </p>
                </div>
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline e Dokumentit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Timeline e Dokumentit</CardTitle>
          <p className="text-xs text-muted-foreground">
            Te gjitha ngjarjet e dokumentit ne rradhe kronologjike
          </p>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : docTimeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nuk ka ngjarje akoma
            </p>
          ) : (
            <div className="relative">
              {docTimeline.map((event, index) => {
                const isLast = index === docTimeline.length - 1;
                const colors = TIMELINE_STATUS_COLORS[event.status];
                const IconComponent = TIMELINE_ICONS[event.type] || Info;

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
                          <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(event.timestamp)}
                          </span>
                        </div>

                        {/* Event details */}
                        {event.details && Object.keys(event.details).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.details.txHash && (
                              <a
                                href={`https://polygonscan.com/tx/${event.details.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
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

      {/* Certifikimi DOC.AL - vetem per kontrata te perfunduara */}
      {contract.status === "COMPLETED" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-black text-primary-foreground">D</span>
              </div>
              <div>
                <CardTitle>Certifikimi DOC.AL</CardTitle>
                <p className="text-xs text-muted-foreground">Vula dixhitale e verifikimit</p>
              </div>
            </div>
          </CardHeader>

          {stampLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner />
            </div>
          ) : stamp ? (
            <CardContent>
              <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="overflow-hidden rounded-xl border border-border bg-card p-2">
                    <img
                      src={stamp.qrCodeDataUri}
                      alt="QR Code per verifikim"
                      className="h-40 w-40"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = stamp.qrCodeDataUri;
                      link.download = `docal-qr-${stamp.certificationHash.substring(0, 8)}.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Shkarko QR Kodin
                  </Button>
                </div>

                {/* Stamp Details */}
                <div className="flex-1 space-y-4">
                  {/* Certification Hash */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Hash i Certifikimit</p>
                    <p className="mt-1 break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground">
                      {stamp.certificationHash}
                    </p>
                  </div>

                  {/* Verification URL */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">URL e Verifikimit</p>
                    <a
                      href={stamp.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block break-all text-sm font-medium text-primary hover:text-primary/80"
                    >
                      {stamp.verificationUrl}
                    </a>
                  </div>

                  {/* Stamped Date */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Data e Certifikimit</p>
                      <p className="mt-0.5 text-sm text-foreground">
                        {formatDateTime(stamp.stampedAt)}
                      </p>
                    </div>
                    {stamp.blockchain && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Blockchain</p>
                        <p className="mt-0.5 text-sm">
                          {stamp.blockchain.status === "CONFIRMED" ? (
                            <span className="text-green-600 dark:text-green-400">BTC i konfirmuar</span>
                          ) : (
                            <span className="text-yellow-600 dark:text-yellow-400">Ne pritje</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Signers Summary */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Nenshkruesit ({stamp.signers.length})
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stamp.signers.map((signer, i) => (
                        <Badge key={i} variant="success" className="gap-1">
                          <Check className="h-3 w-3" strokeWidth={3} />
                          {signer.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Vula e certifikimit nuk mund te gjenerohej per momentin.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
