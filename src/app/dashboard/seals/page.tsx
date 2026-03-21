"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Stamp,
  Plus,
  Shield,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  Copy,
  Check,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Bitcoin,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface CompanySeal {
  id: string;
  name: string;
  description: string | null;
  type: string;
  template: string;
  primaryColor: string;
  secondaryColor: string;
  borderText: string | null;
  centerText: string | null;
  eidasLevel: string;
  etsiPolicy: string | null;
  status: string;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  certificate: { serialNumber: string; validTo: string; revoked: boolean } | null;
  createdBy: { name: string };
  _count: { appliedSeals: number };
}

interface Stats {
  totalSeals: number;
  activeSeals: number;
  totalApplications: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Aktive", variant: "success" },
  INACTIVE: { label: "Joaktive", variant: "default" },
  EXPIRED: { label: "Skaduar", variant: "warning" },
  REVOKED: { label: "Revokuar", variant: "destructive" },
};

const SEAL_TYPES: Record<string, string> = {
  COMPANY_SEAL: "Vula e Kompanise",
  OFFICIAL_STAMP: "Vula Zyrtare",
  INVOICE_SEAL: "Vula Faturash",
  CUSTOM: "Custom",
};

const EIDAS_BADGE: Record<string, { label: string; variant: "default" | "info" | "success" }> = {
  BASIC: { label: "eIDAS Baze", variant: "default" },
  ADVANCED: { label: "eIDAS Avancuar", variant: "info" },
  QUALIFIED: { label: "eIDAS Kualifikuar", variant: "success" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-1 inline-flex items-center rounded p-0.5 text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function SealsPage() {
  const [seals, setSeals] = useState<CompanySeal[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSeals: 0, activeSeals: 0, totalApplications: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", type: "COMPANY_SEAL", template: "official",
    primaryColor: "#0f172a", borderText: "", centerText: "VULE ZYRTARE",
    generateCertificate: true, validityYears: 2,
  });

  const fetchSeals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/dashboard/seals");
    if (res.status === 403) {
      setHasOrganization(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (data.success) {
      setHasOrganization(true);
      setSeals(data.data.seals);
      setStats(data.data.stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSeals(); }, [fetchSeals]);

  const handleCreate = async () => {
    setCreating(true);
    const res = await fetch("/api/dashboard/seals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ name: "", description: "", type: "COMPANY_SEAL", template: "official", primaryColor: "#0f172a", borderText: "", centerText: "VULE ZYRTARE", generateCertificate: true, validityYears: 2 });
      fetchSeals();
    } else {
      const data = await res.json().catch(() => ({}));
      setPlanError(data.error || "Ndodhi nje gabim gjate krijimit te vules");
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleAction = async (sealId: string, action: "activate" | "deactivate" | "revoke") => {
    if (action === "revoke" && !confirm("Jeni te sigurt qe doni te revokoni kete vule?")) return;

    if (action === "revoke") {
      await fetch(`/api/dashboard/seals/${sealId}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "User revoked" }) });
    } else {
      await fetch(`/api/dashboard/seals/${sealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "activate" ? "ACTIVE" : "INACTIVE" }),
      });
    }
    fetchSeals();
  };

  if (loading && hasOrganization === null) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <PageHeader title="Vulat Dixhitale" subtitle="Menaxhoni vulat dixhitale te kompanise per dokumente dhe fatura" />
        <PageSpinner />
      </div>
    );
  }

  if (hasOrganization === false) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <PageHeader title="Vulat Dixhitale" subtitle="Menaxhoni vulat dixhitale te kompanise per dokumente dhe fatura" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Vetem per Organizata</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Vulat dixhitale jane vetem per organizata. Per te krijuar nje organizate, plotesoni formen e kontaktit.
            </p>
            <a
              href="/contact/organization"
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Krijo nje Organizate
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Vulat Dixhitale" subtitle="Menaxhoni vulat dixhitale te kompanise per dokumente dhe fatura" />
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> Krijo Vule te Re
        </Button>
      </div>

      {/* Plan Error */}
      {planError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Nuk keni te drejte perdorimi</h3>
            <p className="max-w-md text-sm text-muted-foreground">{planError}</p>
            <p className="text-xs text-muted-foreground">Kontaktoni suportin teknik per me shume.</p>
            <a
              href="/contact/organization"
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Kontaktoni Suportin
            </a>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Totali Vulave" value={stats.totalSeals.toString()} icon={Stamp} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Vula Aktive" value={stats.activeSeals.toString()} icon={Shield} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Aplikime Totale" value={stats.totalApplications.toString()} icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-900/30" />
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h3 className="text-lg font-semibold text-foreground">Krijo Vule te Re</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Emri i Vules *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" placeholder="p.sh. Vula Zyrtare 2026" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipi</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground">
                  <option value="COMPANY_SEAL">Vula e Kompanise</option>
                  <option value="OFFICIAL_STAMP">Vula Zyrtare</option>
                  <option value="INVOICE_SEAL">Vula Faturash</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Teksti Rrethor</label>
                <input value={form.borderText} onChange={(e) => setForm({ ...form, borderText: e.target.value })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" placeholder="EMRI I KOMPANISE SH.P.K." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Teksti Qendror</label>
                <input value={form.centerText} onChange={(e) => setForm({ ...form, centerText: e.target.value })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" placeholder="VULE ZYRTARE" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Pershkrimi</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" placeholder="Pershkrim opsional" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Vlefshmeria (Vite)</label>
                <select value={form.validityYears} onChange={(e) => setForm({ ...form, validityYears: parseInt(e.target.value) })} className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground">
                  <option value={1}>1 Vit</option>
                  <option value={2}>2 Vite</option>
                  <option value={3}>3 Vite</option>
                  <option value={5}>5 Vite</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.generateCertificate} onChange={(e) => setForm({ ...form, generateCertificate: e.target.checked })} className="rounded border-border" id="genCert" />
              <label htmlFor="genCert" className="text-sm text-foreground">Gjenero certifikate X.509 per kete vule (rekomandohet)</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!form.name || creating}>{creating ? "Duke krijuar..." : "Krijo Vulen"}</Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Anulo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seals List */}
      {loading ? (
        <PageSpinner />
      ) : seals.length === 0 ? (
        <EmptyState icon={Stamp} title="Nuk keni vula dixhitale" description="Krijoni vulen e pare dixhitale per kompanine tuaj" />
      ) : (
        <div className="space-y-2">
          {seals.map((seal) => {
            const isExpanded = expandedId === seal.id;
            const statusCfg = STATUS_BADGE[seal.status] || STATUS_BADGE.INACTIVE;
            const eidasCfg = EIDAS_BADGE[seal.eidasLevel] || EIDAS_BADGE.BASIC;

            return (
              <Card key={seal.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : seal.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : seal.id); }}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                >
                  {/* Seal icon with color */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: seal.primaryColor + "20", color: seal.primaryColor }}>
                    <Stamp className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{seal.name}</span>
                      <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      <Badge variant={eidasCfg.variant}>{eidasCfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">{SEAL_TYPES[seal.type] || seal.type}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span>Krijuar: {formatDateTime(seal.createdAt)}</span>
                      <span>Aplikime: {seal._count.appliedSeals}</span>
                      {seal.certificate && <span>Cert: {seal.certificate.serialNumber.slice(0, 12)}...</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {seal.status === "ACTIVE" && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(seal.id, "deactivate"); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Caktivizo">
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {seal.status === "INACTIVE" && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(seal.id, "activate"); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Aktivizo">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {seal.status !== "REVOKED" && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(seal.id, "revoke"); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" title="Revoko">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <CardContent className="border-t border-border p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Tipi i Vules</span>
                        <p className="mt-1 text-sm text-foreground">{SEAL_TYPES[seal.type] || seal.type}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Template</span>
                        <p className="mt-1 text-sm text-foreground capitalize">{seal.template}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Niveli eIDAS</span>
                        <p className="mt-1 text-sm text-foreground">{seal.eidasLevel}</p>
                      </div>
                      {seal.etsiPolicy && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Politika ETSI</span>
                          <p className="mt-1 text-sm text-foreground">{seal.etsiPolicy}</p>
                        </div>
                      )}
                      {seal.borderText && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Teksti Rrethor</span>
                          <p className="mt-1 text-sm text-foreground">{seal.borderText}</p>
                        </div>
                      )}
                      {seal.centerText && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Teksti Qendror</span>
                          <p className="mt-1 text-sm text-foreground">{seal.centerText}</p>
                        </div>
                      )}
                      {seal.certificate && (
                        <>
                          <div>
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Serial Certifikate</span>
                            <div className="mt-1 flex items-center gap-1">
                              <p className="font-mono text-xs text-foreground">{seal.certificate.serialNumber.slice(0, 24)}...</p>
                              <CopyButton text={seal.certificate.serialNumber} />
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Skadon me</span>
                            <p className="mt-1 text-sm text-foreground">{formatDateTime(seal.certificate.validTo)}</p>
                          </div>
                        </>
                      )}
                      {seal.expiresAt && (
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Vula Skadon</span>
                          <p className="mt-1 text-sm text-foreground">{formatDateTime(seal.expiresAt)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Krijuar nga</span>
                        <p className="mt-1 text-sm text-foreground">{seal.createdBy.name}</p>
                      </div>
                      {seal.description && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Pershkrimi</span>
                          <p className="mt-1 text-sm text-foreground">{seal.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Compliance info */}
                    <div className="mt-4 rounded-xl border border-border bg-muted/50 p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="h-3.5 w-3.5 text-green-500" />
                        <span className="font-medium text-foreground">Pajtueshmeria</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="info">eIDAS {seal.eidasLevel}</Badge>
                        {seal.etsiPolicy && <Badge variant="default">{seal.etsiPolicy}</Badge>}
                        <Badge variant="default">SHA-256</Badge>
                        <Badge variant="default">RSA-2048</Badge>
                        <Badge variant="info">Dual Timestamp</Badge>
                        <Badge variant="warning">OpenTimestamps</Badge>
                      </div>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Cdo aplikim i vules gjeneron 2 timestamps: Server DOC.AL + OpenTimestamps/Bitcoin per siguri maksimale.
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
