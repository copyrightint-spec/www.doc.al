"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Stamp,
  CheckCircle,
  Building2,
  ChevronDown,
  Play,
  Pause,
  Ban,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface Seal {
  id: string;
  name: string;
  type: string;
  status: string;
  eidasLevel: string;
  etsiPolicy: string | null;
  expiresAt: string | null;
  createdAt: string;
  organization: { name: string; plan: string };
  certificate: { serialNumber: string; validTo: string; revoked: boolean } | null;
  createdBy: { name: string };
  _count: { appliedSeals: number };
}

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Aktive", variant: "success" },
  INACTIVE: { label: "Joaktive", variant: "default" },
  EXPIRED: { label: "Skaduar", variant: "warning" },
  REVOKED: { label: "Revokuar", variant: "destructive" },
};

const TYPE_LABELS: Record<string, string> = {
  COMPANY_SEAL: "Vula Kompanise",
  OFFICIAL_STAMP: "Vula Zyrtare",
  INVOICE_SEAL: "Vula Faturash",
  CUSTOM: "Custom",
};

export default function AdminSealsPage() {
  const [seals, setSeals] = useState<Seal[]>([]);
  const [stats, setStats] = useState({ totalSeals: 0, activeSeals: 0, totalApplications: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "30" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/seals?${params}`);
    const data = await res.json();
    if (data.success) {
      setSeals(data.data.seals);
      setStats(data.data.stats);
      setTotalPages(data.data.pagination.totalPages);
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => { fetchSeals(); }, [fetchSeals]);

  const handleAction = async (id: string, action: string, reason?: string) => {
    await fetch("/api/admin/seals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reason }),
    });
    fetchSeals();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Admin: Vulat Dixhitale" subtitle="Menaxhimi i vulave dixhitale te te gjitha organizatave" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Totali Vulave" value={stats.totalSeals.toString()} icon={Stamp} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Vula Aktive" value={stats.activeSeals.toString()} icon={CheckCircle} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Aplikime Totale" value={stats.totalApplications.toString()} icon={FileText} iconColor="text-blue-500" iconBg="bg-blue-900/30" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kerko sipas emrit te vules ose organizates..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground"
        >
          <option value="">Te gjitha statuset</option>
          <option value="ACTIVE">Aktive</option>
          <option value="INACTIVE">Joaktive</option>
          <option value="EXPIRED">Skaduar</option>
          <option value="REVOKED">Revokuar</option>
        </select>
      </div>

      {loading ? (
        <PageSpinner />
      ) : seals.length === 0 ? (
        <EmptyState icon={Stamp} title="Nuk ka vula" description="Nuk ka vula dixhitale te regjistruara" />
      ) : (
        <div className="space-y-2">
          {seals.map((seal) => {
            const isExpanded = expandedId === seal.id;
            const sCfg = STATUS_BADGE[seal.status] || STATUS_BADGE.INACTIVE;

            return (
              <Card key={seal.id}>
                <div
                  role="button" tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : seal.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : seal.id); }}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Stamp className="h-5 w-5 text-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{seal.name}</span>
                      <Badge variant={sCfg.variant}>{sCfg.label}</Badge>
                      <Badge variant="info">eIDAS {seal.eidasLevel}</Badge>
                      <span className="text-xs text-muted-foreground">{TYPE_LABELS[seal.type] || seal.type}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span><Building2 className="mr-0.5 inline h-3 w-3" />{seal.organization.name}</span>
                      <span>Plan: <strong>{seal.organization.plan}</strong></span>
                      <span>Aplikime: {seal._count.appliedSeals}</span>
                      <span>{formatDateTime(seal.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {seal.status === "ACTIVE" && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(seal.id, "deactivate"); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Caktivizo"><Pause className="h-4 w-4" /></button>
                    )}
                    {seal.status === "INACTIVE" && (
                      <button onClick={(e) => { e.stopPropagation(); handleAction(seal.id, "activate"); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" title="Aktivizo"><Play className="h-4 w-4" /></button>
                    )}
                    {!["REVOKED"].includes(seal.status) && (
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Revoko vulen?")) handleAction(seal.id, "revoke", "Admin revoked"); }} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" title="Revoko"><Ban className="h-4 w-4" /></button>
                    )}
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>
                {isExpanded && (
                  <CardContent className="border-t border-border p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Organizata</span><p className="mt-1 text-sm text-foreground">{seal.organization.name}</p></div>
                      <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Plani</span><p className="mt-1 text-sm text-foreground">{seal.organization.plan}</p></div>
                      <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Tipi</span><p className="mt-1 text-sm text-foreground">{TYPE_LABELS[seal.type] || seal.type}</p></div>
                      <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">eIDAS Level</span><p className="mt-1 text-sm text-foreground">{seal.eidasLevel}</p></div>
                      {seal.etsiPolicy && <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">ETSI</span><p className="mt-1 text-sm text-foreground">{seal.etsiPolicy}</p></div>}
                      {seal.certificate && (
                        <>
                          <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Certifikate</span><p className="mt-1 font-mono text-xs text-foreground">{seal.certificate.serialNumber.slice(0, 20)}...</p></div>
                          <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Cert Skadon</span><p className="mt-1 text-sm text-foreground">{formatDateTime(seal.certificate.validTo)}</p></div>
                        </>
                      )}
                      <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Krijuar nga</span><p className="mt-1 text-sm text-foreground">{seal.createdBy.name}</p></div>
                      {seal.expiresAt && <div><span className="text-[10px] font-semibold uppercase text-muted-foreground">Skadon</span><p className="mt-1 text-sm text-foreground">{formatDateTime(seal.expiresAt)}</p></div>}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
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
