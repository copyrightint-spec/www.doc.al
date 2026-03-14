"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PenLine,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  ChevronDown,
  Check,
  X,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface Signer {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  signedAt: string | null;
  order: number;
}

interface Contract {
  id: string;
  status: string;
  recipientEmails: string[];
  message: string | null;
  companyName: string | null;
  brandColor: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    fileSize: number;
    status: string;
    signatures: Signer[];
  };
  template: { id: string; name: string; category: string | null } | null;
  requester: { id: string; name: string; email: string };
}

/** Page-level contract status mapping (superset of shared CONTRACT_STATUS) */
const PAGE_CONTRACT_STATUS: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }
> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  IN_PROGRESS: { label: "Ne Progres", variant: "info" },
  COMPLETED: { label: "Perfunduar", variant: "success" },
  CANCELLED: { label: "Anulluar", variant: "destructive" },
  EXPIRED: { label: "Skaduar", variant: "default" },
  SELF_SIGNED: { label: "Nenshkruar vete", variant: "success" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function isSelfSigned(contract: Contract) {
  const sigs = contract.document.signatures;
  return (
    sigs.length === 1 &&
    sigs[0].signerEmail === contract.requester.email &&
    contract.status === "COMPLETED"
  );
}

const QUICK_ACTIONS = [
  {
    title: "Krijo Kontrate",
    description: "Nderto nje kontrate te re me pale, baze ligjore dhe terma te personalizuara",
    href: "/dashboard/contracts/new",
    icon: Scale,
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-400/20",
  },
  {
    title: "Nenshkruaj PDF",
    description: "Ngarko nje PDF dhe nenshkruaje vete me firmen tende dixhitale",
    href: "/dashboard/contracts/self-sign",
    icon: PenLine,
    gradient: "from-blue-500 to-blue-600",
    iconBg: "bg-blue-400/20",
  },
  {
    title: "Dergo per Nenshkrim",
    description: "Dergo nje dokument te tjereve per ta nenshkruar dixhitalisht",
    href: "/dashboard/documents",
    icon: Send,
    gradient: "from-sky-500 to-blue-500",
    iconBg: "bg-sky-400/20",
  },
  {
    title: "Krijo nga Template",
    description: "Zgjidh nje template gatshme, plotesoje dhe nenshkruaje menjehere",
    href: "/templates",
    icon: FileText,
    gradient: "from-slate-600 to-slate-700",
    iconBg: "bg-slate-400/20",
  },
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/contracts?${params}`);
    const data = await res.json();
    if (data.success) setContracts(data.data);
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const stats = {
    total: contracts.length,
    pending: contracts.filter((c) => c.status === "PENDING" || c.status === "IN_PROGRESS").length,
    completed: contracts.filter((c) => c.status === "COMPLETED").length,
    expired: contracts.filter((c) => c.status === "EXPIRED" || c.status === "CANCELLED").length,
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="eSign"
        subtitle="Nenshkruaj, dergo per nenshkrim, ose krijo dokumente nga template"
        className="mb-8"
      />

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${action.gradient} p-6 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5`}
            >
              {/* Background decoration */}
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-150" />
              <div className="absolute -right-2 -bottom-6 h-32 w-32 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-125" />

              <div className="relative">
                <div className={`mb-4 inline-flex items-center justify-center rounded-xl ${action.iconBg} p-3 backdrop-blur-sm`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{action.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{action.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-all group-hover:gap-2.5">
                  Fillo tani
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Gjithsej"
          value={stats.total}
          icon={FileText}
          iconColor="text-slate-600 dark:text-slate-400"
          iconBg="bg-slate-100 dark:bg-slate-800"
        />
        <StatCard
          label="Ne Proces"
          value={stats.pending}
          icon={Clock}
          iconColor="text-yellow-600 dark:text-yellow-400"
          iconBg="bg-yellow-50 dark:bg-yellow-900/20"
          valueColor="text-yellow-700 dark:text-yellow-400"
        />
        <StatCard
          label="Perfunduar"
          value={stats.completed}
          icon={CheckCircle2}
          iconColor="text-green-600 dark:text-green-400"
          iconBg="bg-green-50 dark:bg-green-900/20"
          valueColor="text-green-700 dark:text-green-400"
        />
        <StatCard
          label="Anulluar/Skaduar"
          value={stats.expired}
          icon={XCircle}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-50 dark:bg-red-900/20"
          valueColor="text-red-700 dark:text-red-400"
        />
      </div>

      {/* Section Title */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Kerkesa per Nenshkrim</h2>
        <p className="text-xs text-muted-foreground">{contracts.length} gjithsej</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kerko kerkesa per nenshkrim..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { value: "", label: "Te gjitha" },
            { value: "PENDING", label: "Ne pritje" },
            { value: "IN_PROGRESS", label: "Ne progres" },
            { value: "COMPLETED", label: "Perfunduar" },
            { value: "EXPIRED", label: "Skaduar" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                statusFilter !== f.value && "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            const selfSigned = isSelfSigned(contract);
            const st = selfSigned
              ? PAGE_CONTRACT_STATUS.SELF_SIGNED
              : PAGE_CONTRACT_STATUS[contract.status] || PAGE_CONTRACT_STATUS.PENDING;
            const isExpanded = expandedId === contract.id;
            const signedCount = contract.document.signatures.filter((s) => s.status === "SIGNED").length;
            const totalSigners = contract.document.signatures.length;
            const progress = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;

            return (
              <Card key={contract.id} className="transition-all hover:border-slate-300 dark:hover:border-slate-600">
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : contract.id)}
                  className="flex w-full items-center gap-4 p-5 text-left"
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl",
                    selfSigned
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : "bg-blue-50 dark:bg-blue-900/20"
                  )}>
                    {selfSigned ? (
                      <PenLine className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground truncate">{contract.document.title}</h3>
                      <Badge variant={st.variant}>{st.label}</Badge>
                      {selfSigned && (
                        <Badge variant="success">Nenshkruar vete</Badge>
                      )}
                      {contract.companyName && (
                        <Badge variant="purple">{contract.companyName}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Krijuar: {formatDate(contract.createdAt)}</span>
                      <span>Nga: {contract.requester.name}</span>
                      <span>{formatBytes(contract.document.fileSize)}</span>
                      {contract.template && <span>Template: {contract.template.name}</span>}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex flex-shrink-0 items-center gap-3">
                    {!selfSigned && (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{signedCount}/{totalSigners}</p>
                          <p className="text-[10px] text-muted-foreground">nenshkrime</p>
                        </div>
                        <div className="h-10 w-10 flex-shrink-0">
                          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
                            <circle
                              cx="18" cy="18" r="15.5" fill="none"
                              strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${progress} 100`}
                              className={progress === 100 ? "stroke-green-500" : "stroke-blue-500"}
                            />
                          </svg>
                        </div>
                      </>
                    )}
                    {selfSigned && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    <ChevronDown className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )} />
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border px-5 pb-5">
                    {/* Message */}
                    {contract.message && (
                      <div className="mt-4 rounded-xl bg-muted p-3">
                        <p className="text-xs font-medium text-muted-foreground">Mesazh:</p>
                        <p className="mt-1 text-sm text-foreground">{contract.message}</p>
                      </div>
                    )}

                    {/* Signers progress */}
                    <div className="mt-4">
                      <p className="mb-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">Nenshkruesit:</p>
                      <div className="space-y-2">
                        {contract.document.signatures
                          .sort((a, b) => a.order - b.order)
                          .map((sig, i) => {
                            const sigStatus = SIGNATURE_STATUS[sig.status] || SIGNATURE_STATUS.PENDING;
                            return (
                              <div key={sig.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                                <div className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                                  sig.status === "SIGNED"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                                    : sig.status === "REJECTED"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                                )}>
                                  {sig.status === "SIGNED" ? (
                                    <Check className="h-4 w-4" strokeWidth={2.5} />
                                  ) : sig.status === "REJECTED" ? (
                                    <X className="h-4 w-4" strokeWidth={2.5} />
                                  ) : (
                                    i + 1
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground">{sig.signerName}</p>
                                  <p className="text-xs text-muted-foreground">{sig.signerEmail}</p>
                                </div>
                                <div className="text-right">
                                  <Badge variant={sigStatus.variant}>
                                    {sig.status === "SIGNED"
                                      ? (selfSigned ? "Nenshkruar vete" : "Nenshkruar")
                                      : sig.status === "REJECTED"
                                      ? "Refuzuar"
                                      : "Ne pritje"}
                                  </Badge>
                                  {sig.signedAt && (
                                    <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDate(sig.signedAt)}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.18em]">Krijuar nga</p>
                        <p className="mt-0.5 text-sm text-foreground">{contract.requester.name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.18em]">Data</p>
                        <p className="mt-0.5 text-sm text-foreground">{formatDate(contract.createdAt)}</p>
                      </div>
                      {contract.expiresAt && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.18em]">Skadon</p>
                          <p className="mt-0.5 text-sm text-foreground">{formatDate(contract.expiresAt)}</p>
                        </div>
                      )}
                      {contract.completedAt && (
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.18em]">Perfunduar</p>
                          <p className="mt-0.5 text-sm text-foreground">{formatDate(contract.completedAt)}</p>
                        </div>
                      )}
                    </div>

                    {/* Detail link */}
                    <div className="mt-4 flex justify-end">
                      <Button asChild>
                        <Link href={`/dashboard/contracts/${contract.id}`}>
                          Shiko Detajet
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {contracts.length === 0 && !loading && (
            <EmptyState
              icon={FileText}
              title="Nuk keni kerkesa per nenshkrim akoma"
              description="Nenshkruani nje dokument ose dergoni nje kerkese per te filluar"
              action={
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <Link href="/dashboard/contracts/self-sign">
                      <PenLine className="h-4 w-4" />
                      Nenshkruaj PDF
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link href="/dashboard/documents">
                      Dergo per Nenshkrim
                    </Link>
                  </Button>
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
