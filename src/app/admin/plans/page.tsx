"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Shield,
  Zap,
  ChevronDown,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

interface OrgWithPlan {
  id: string;
  name: string;
  domain: string | null;
  plan: string;
  billingCycle: string | null;
  planExpiresAt: string | null;
  createdAt: string;
  _count: { users: number; documents: number; certificates: number; companySeals: number };
  planQuotas: Array<{
    id: string;
    maxTimestamps: number; usedTimestamps: number;
    maxSignatures: number; usedSignatures: number;
    maxSeals: number; usedSeals: number;
    maxApiCalls: number; usedApiCalls: number;
    maxDocuments: number; usedDocuments: number;
    periodStart: string; periodEnd: string;
  }>;
}

const PLAN_BADGE: Record<string, { label: string; variant: "default" | "info" | "purple" | "success" }> = {
  FREE: { label: "Free", variant: "default" },
  PRO: { label: "Professional", variant: "info" },
  ENTERPRISE: { label: "Enterprise", variant: "purple" },
};

function QuotaBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{used.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminPlansPage() {
  const [orgs, setOrgs] = useState<OrgWithPlan[]>([]);
  const [planStats, setPlanStats] = useState({ FREE: 0, PRO: 0, ENTERPRISE: 0 });
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editCycle, setEditCycle] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (planFilter) params.set("plan", planFilter);
    const res = await fetch(`/api/admin/plans?${params}`);
    const data = await res.json();
    if (data.success) {
      setOrgs(data.data.organizations);
      setPlanStats(data.data.planStats);
    }
    setLoading(false);
  }, [planFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlanUpdate = async (orgId: string) => {
    const body: Record<string, string> = { organizationId: orgId };
    if (editPlan) body.plan = editPlan;
    if (editCycle) body.billingCycle = editCycle;

    await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditingId(null);
    fetchData();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Admin: Planet & Kuotat" subtitle="Menaxhimi i planeve dhe kuotave te organizatave" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Free" value={planStats.FREE.toString()} icon={Users} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Professional" value={planStats.PRO.toString()} icon={Zap} iconColor="text-blue-500" iconBg="bg-blue-900/30" />
        <StatCard label="Enterprise" value={planStats.ENTERPRISE.toString()} icon={Shield} iconColor="text-blue-500" iconBg="bg-blue-900/30" />
      </div>

      <div className="flex gap-3">
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground">
          <option value="">Te gjitha planet</option>
          <option value="FREE">Free</option>
          <option value="PRO">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {loading ? (
        <PageSpinner />
      ) : orgs.length === 0 ? (
        <EmptyState icon={Building2} title="Nuk ka organizata" description="Nuk ka organizata te regjistruara" />
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => {
            const isExpanded = expandedId === org.id;
            const isEditing = editingId === org.id;
            const pCfg = PLAN_BADGE[org.plan] || PLAN_BADGE.FREE;
            const quota = org.planQuotas[0];

            return (
              <Card key={org.id}>
                <div
                  role="button" tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : org.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : org.id); }}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Building2 className="h-5 w-5 text-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{org.name}</span>
                      <Badge variant={pCfg.variant}>{pCfg.label}</Badge>
                      {org.billingCycle && <span className="text-xs text-muted-foreground">{org.billingCycle === "YEARLY" ? "Vjetor" : "Mujor"}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span>{org._count.users} perdorues</span>
                      <span>{org._count.documents} dokumente</span>
                      <span>{org._count.companySeals} vula</span>
                      <span>{org._count.certificates} certifikata</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(isEditing ? null : org.id); setEditPlan(org.plan); setEditCycle(org.billingCycle || "MONTHLY"); }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                      title="Ndrysho Planin"
                    ><Settings className="h-4 w-4" /></button>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>

                {/* Plan edit inline */}
                {isEditing && (
                  <div className="border-t border-border px-4 py-3">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Plani</label>
                        <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                          <option value="FREE">Free</option>
                          <option value="PRO">Professional</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Cikli</label>
                        <select value={editCycle} onChange={(e) => setEditCycle(e.target.value)} className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground">
                          <option value="MONTHLY">Mujor</option>
                          <option value="YEARLY">Vjetor</option>
                        </select>
                      </div>
                      <Button size="sm" onClick={() => handlePlanUpdate(org.id)}>Ruaj</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Anulo</Button>
                    </div>
                  </div>
                )}

                {/* Expanded quota details */}
                {isExpanded && quota && (
                  <CardContent className="border-t border-border p-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perdorimi i Kuotave — Periudha Aktuale</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <QuotaBar label="Timestamps" used={quota.usedTimestamps} max={quota.maxTimestamps} />
                      <QuotaBar label="Nenshkrime" used={quota.usedSignatures} max={quota.maxSignatures} />
                      <QuotaBar label="Vula (eStamps)" used={quota.usedSeals} max={quota.maxSeals} />
                      <QuotaBar label="API Thirrje" used={quota.usedApiCalls} max={quota.maxApiCalls} />
                      <QuotaBar label="Dokumente" used={quota.usedDocuments} max={quota.maxDocuments} />
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground">
                      Periudha: {new Date(quota.periodStart).toLocaleDateString("sq-AL")} - {new Date(quota.periodEnd).toLocaleDateString("sq-AL")}
                    </div>
                  </CardContent>
                )}
                {isExpanded && !quota && (
                  <CardContent className="border-t border-border p-4">
                    <p className="text-sm text-muted-foreground">Nuk ka te dhena kuotash per kete periudhe. Kuotat do te krijohen automatikisht ne perdorimin e pare.</p>
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
