"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Layers,
  Crown,
  Zap,
  Plus,
  Search,
  ChevronDown,
  Users,
  Stamp,
  CreditCard,
  Settings,
  Save,
  Shield,
  FileText,
  Check,
  X,
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

interface PlanQuota {
  id: string;
  maxTimestamps: number; usedTimestamps: number;
  maxSignatures: number; usedSignatures: number;
  maxSeals: number; usedSeals: number;
  maxSealTemplates: number;
  maxApiCalls: number; usedApiCalls: number;
  maxDocuments: number; usedDocuments: number;
  maxUsers: number;
  periodStart: string; periodEnd: string;
  billingCycle: string;
}

interface OrgUser {
  id: string; name: string; email: string; role: string; kycStatus: string; createdAt: string;
}

interface OrgSeal {
  id: string; name: string; type: string; status: string; eidasLevel: string; createdAt: string;
  _count: { appliedSeals: number };
}

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  logo: string | null;
  primaryColor: string | null;
  plan: string;
  apiQuota: number;
  billingCycle: string | null;
  customQuotas: Record<string, number> | null;
  planExpiresAt: string | null;
  verifiedAt: string | null;
  webhookUrl: string | null;
  emailFromName: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { users: number; documents: number; certificates: number; apiKeys: number; signingTemplates: number; companySeals: number };
  users: OrgUser[];
  companySeals: OrgSeal[];
  planQuotas: PlanQuota[];
}

interface PlanDef {
  name: string; label: string; quotas: Record<string, number>; features: string[];
  eidasLevel: string; etsiCompliance: string[]; sealTypes: string[];
  billingCycles: { monthly: number; yearly: number };
}

const PLAN_BADGE: Record<string, { label: string; variant: "default" | "info" | "purple" }> = {
  FREE: { label: "Free", variant: "default" },
  PRO: { label: "Professional", variant: "info" },
  ENTERPRISE: { label: "Enterprise", variant: "purple" },
};

const SEAL_STATUS: Record<string, { label: string; variant: "success" | "default" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Aktive", variant: "success" },
  INACTIVE: { label: "Joaktive", variant: "default" },
  EXPIRED: { label: "Skaduar", variant: "warning" },
  REVOKED: { label: "Revokuar", variant: "destructive" },
};

const KYC_BADGE: Record<string, { label: string; variant: "success" | "default" | "warning" | "destructive" }> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  VERIFIED: { label: "Verifikuar", variant: "success" },
  REJECTED: { label: "Refuzuar", variant: "destructive" },
};

type TabType = "info" | "plan" | "users" | "seals";

function QuotaInput({ label, value, onChange, used }: { label: string; value: number; onChange: (v: number) => void; used?: number }) {
  const pct = used !== undefined && value > 0 ? Math.min(100, Math.round((used / value) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {used !== undefined && <span className="text-[10px] text-muted-foreground">{used} perdorur</span>}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground"
      />
      {used !== undefined && (
        <div className="mt-1 h-1 w-full rounded-full bg-muted">
          <div className={cn("h-1 rounded-full", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500")} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [planDefs, setPlanDefs] = useState<Record<string, PlanDef>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [planStats, setPlanStats] = useState({ FREE: 0, PRO: 0, ENTERPRISE: 0 });

  // Expanded org state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Plan editing state
  const [editPlan, setEditPlan] = useState("");
  const [editCycle, setEditCycle] = useState("MONTHLY");
  const [editQuotas, setEditQuotas] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // Create org state
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", domain: "", plan: "FREE" });
  const [creating, setCreating] = useState(false);

  // User assignment state
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string; role: string; kycStatus: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);

    const res = await fetch(`/api/admin/organizations?${params}`);
    const data = await res.json();
    if (data.success) {
      setOrganizations(data.data.organizations);
      setTotal(data.data.pagination.total);
      setPlanStats(data.data.planStats);
      if (data.data.planDefinitions) setPlanDefs(data.data.planDefinitions);
    }
    setLoading(false);
  }, [page, search, planFilter]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const expandOrg = (orgId: string) => {
    if (expandedId === orgId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orgId);
    setActiveTab("info");

    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setEditPlan(org.plan);
      setEditCycle(org.billingCycle || "MONTHLY");
      const quota = org.planQuotas[0];
      const def = planDefs[org.plan];
      setEditQuotas({
        maxTimestamps: quota?.maxTimestamps ?? def?.quotas.maxTimestamps ?? 50,
        maxSignatures: quota?.maxSignatures ?? def?.quotas.maxSignatures ?? 10,
        maxSeals: quota?.maxSeals ?? def?.quotas.maxSeals ?? 0,
        maxSealTemplates: quota?.maxSealTemplates ?? def?.quotas.maxSealTemplates ?? 0,
        maxApiCalls: quota?.maxApiCalls ?? def?.quotas.maxApiCalls ?? 100,
        maxDocuments: quota?.maxDocuments ?? def?.quotas.maxDocuments ?? 25,
        maxUsers: quota?.maxUsers ?? def?.quotas.maxUsers ?? 1,
      });
    }
  };

  const handlePlanPreset = (planName: string) => {
    setEditPlan(planName);
    const def = planDefs[planName];
    if (def) {
      setEditQuotas({
        maxTimestamps: def.quotas.maxTimestamps,
        maxSignatures: def.quotas.maxSignatures,
        maxSeals: def.quotas.maxSeals,
        maxSealTemplates: def.quotas.maxSealTemplates,
        maxApiCalls: def.quotas.maxApiCalls,
        maxDocuments: def.quotas.maxDocuments,
        maxUsers: def.quotas.maxUsers,
      });
    }
  };

  const handleSavePlan = async (orgId: string) => {
    setSaving(true);
    await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        plan: editPlan,
        billingCycle: editCycle,
        customQuotas: editQuotas,
      }),
    });
    setSaving(false);
    fetchOrgs();
  };

  const searchUnassignedUsers = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&unassigned=true&limit=10`);
    const data = await res.json();
    if (data.success) setSearchResults(data.data.users);
    setSearching(false);
  }, []);

  const handleAssignUser = async (userId: string, orgId: string) => {
    setAssigning(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, organizationId: orgId }),
    });
    setAssigning(null);
    setUserSearch("");
    setSearchResults([]);
    fetchOrgs();
  };

  const handleRemoveUser = async (userId: string) => {
    setAssigning(userId);
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, organizationId: null }),
    });
    setAssigning(null);
    fetchOrgs();
  };

  const handleCreate = async () => {
    if (!newOrg.name) return;
    setCreating(true);
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrg),
    });
    if (res.ok) {
      setShowCreate(false);
      setNewOrg({ name: "", domain: "", plan: "FREE" });
      fetchOrgs();
    }
    setCreating(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <PageHeader title="Menaxhimi i Organizatave" subtitle={`${total} organizata gjithsej`} />
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" /> Krijo Organizate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Totali" value={total} icon={Building2} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Free" value={planStats.FREE} icon={Layers} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Professional" value={planStats.PRO} icon={Zap} iconColor="text-blue-400" iconBg="bg-blue-900/30" />
        <StatCard label="Enterprise" value={planStats.ENTERPRISE} icon={Crown} iconColor="text-blue-400" iconBg="bg-blue-900/30" />
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-3 font-semibold text-foreground">Krijo Organizate te Re</h3>
            <div className="flex flex-wrap gap-3">
              <input value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="Emri i organizates *" className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" />
              <input value={newOrg.domain} onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })} placeholder="Domain (opsional)" className="w-48 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground" />
              <select value={newOrg.plan} onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })} className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground">
                <option value="FREE">Free</option>
                <option value="PRO">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <Button onClick={handleCreate} disabled={!newOrg.name || creating}>{creating ? "Duke krijuar..." : "Krijo"}</Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Anulo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Kerko per emer ose domain..." className="pl-10" />
        </div>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }} className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground">
          <option value="">Te gjitha planet</option>
          <option value="FREE">Free</option>
          <option value="PRO">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Organizations */}
      {loading && organizations.length === 0 ? (
        <PageSpinner />
      ) : organizations.length === 0 ? (
        <EmptyState icon={Building2} title="Nuk ka organizata" description="Krijoni organizaten e pare" />
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => {
            const isExpanded = expandedId === org.id;
            const pCfg = PLAN_BADGE[org.plan] || PLAN_BADGE.FREE;
            const quota = org.planQuotas[0];

            return (
              <Card key={org.id}>
                {/* Header */}
                <div
                  role="button" tabIndex={0}
                  onClick={() => expandOrg(org.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") expandOrg(org.id); }}
                  className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: org.primaryColor || "#3b82f6" }}
                  >
                    {org.logo ? <img src={org.logo} alt="" className="h-10 w-10 rounded-xl object-cover" /> : org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{org.name}</span>
                      <Badge variant={pCfg.variant}>{pCfg.label}</Badge>
                      {org.billingCycle === "YEARLY" && <Badge variant="info">Vjetor</Badge>}
                      {org.verifiedAt && <Badge variant="success">Verifikuar</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      {org.domain && <span>{org.domain}</span>}
                      <span>{org._count.users} perdorues</span>
                      <span>{org._count.documents} dokumente</span>
                      <span>{org._count.companySeals} vula</span>
                      <span>{org._count.certificates} certifikata</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Tabs */}
                    <div className="flex border-b border-border">
                      {([
                        { key: "info" as TabType, label: "Info", icon: Settings },
                        { key: "plan" as TabType, label: "Plan & Kuota", icon: CreditCard },
                        { key: "users" as TabType, label: `Perdoruesit (${org._count.users})`, icon: Users },
                        { key: "seals" as TabType, label: `Vulat (${org._count.companySeals})`, icon: Stamp },
                      ]).map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors",
                            activeTab === tab.key
                              ? "border-b-2 border-foreground text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <tab.icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Tab: Info */}
                    {activeTab === "info" && (
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">ID</p>
                            <p className="mt-0.5 font-mono text-xs text-foreground">{org.id}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Domain</p>
                            <p className="mt-0.5 text-foreground">{org.domain || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ngjyra</p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <div className="h-4 w-4 rounded border border-border" style={{ backgroundColor: org.primaryColor || "#3b82f6" }} />
                              <span className="text-xs text-foreground">{org.primaryColor || "#3b82f6"}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Email From</p>
                            <p className="mt-0.5 text-foreground">{org.emailFromName || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Webhook</p>
                            <p className="mt-0.5 max-w-[200px] truncate text-foreground">{org.webhookUrl || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">API Keys</p>
                            <p className="mt-0.5 text-foreground">{org._count.apiKeys}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Templates</p>
                            <p className="mt-0.5 text-foreground">{org._count.signingTemplates}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Krijuar</p>
                            <p className="mt-0.5 text-foreground">{formatDateTime(org.createdAt)}</p>
                          </div>
                        </div>
                      </CardContent>
                    )}

                    {/* Tab: Plan & Quota */}
                    {activeTab === "plan" && (
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Plan selector */}
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zgjidh Planin</label>
                            <div className="flex gap-2">
                              {["FREE", "PRO", "ENTERPRISE"].map((p) => {
                                const def = planDefs[p];
                                return (
                                  <button
                                    key={p}
                                    onClick={() => handlePlanPreset(p)}
                                    className={cn(
                                      "flex-1 rounded-xl border-2 p-3 text-left transition-colors",
                                      editPlan === p ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold text-foreground">{def?.label || p}</span>
                                      {editPlan === p && <Check className="h-4 w-4 text-foreground" />}
                                    </div>
                                    {def && (
                                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                                        {def.billingCycles.monthly > 0 ? `€${def.billingCycles.monthly}/muaj` : "Falas"} · eIDAS {def.eidasLevel}
                                      </p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Billing cycle */}
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cikli i Faturimit</label>
                            <div className="flex gap-2">
                              <button onClick={() => setEditCycle("MONTHLY")} className={cn("rounded-lg px-4 py-2 text-sm", editCycle === "MONTHLY" ? "bg-foreground text-background" : "border border-border text-foreground")}>Mujor</button>
                              <button onClick={() => setEditCycle("YEARLY")} className={cn("rounded-lg px-4 py-2 text-sm", editCycle === "YEARLY" ? "bg-foreground text-background" : "border border-border text-foreground")}>Vjetor (ulje 20%)</button>
                            </div>
                          </div>

                          {/* Custom quotas */}
                          <div>
                            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kuotat e Personalizuara</label>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                              <QuotaInput label="Timestamps" value={editQuotas.maxTimestamps || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxTimestamps: v })} used={quota?.usedTimestamps} />
                              <QuotaInput label="eSign" value={editQuotas.maxSignatures || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxSignatures: v })} used={quota?.usedSignatures} />
                              <QuotaInput label="Stampime/Muaj" value={editQuotas.maxSeals || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxSeals: v })} used={quota?.usedSeals} />
                              <QuotaInput label="Template Vule" value={editQuotas.maxSealTemplates || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxSealTemplates: v })} used={org._count.companySeals} />
                              <QuotaInput label="API Thirrje" value={editQuotas.maxApiCalls || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxApiCalls: v })} used={quota?.usedApiCalls} />
                              <QuotaInput label="Dokumente" value={editQuotas.maxDocuments || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxDocuments: v })} used={quota?.usedDocuments} />
                              <QuotaInput label="Perdorues" value={editQuotas.maxUsers || 0} onChange={(v) => setEditQuotas({ ...editQuotas, maxUsers: v })} />
                            </div>
                          </div>

                          {/* eIDAS info */}
                          {planDefs[editPlan] && (
                            <div className="rounded-xl border border-border bg-muted/50 p-3">
                              <div className="flex items-center gap-2 text-xs">
                                <Shield className="h-3.5 w-3.5 text-green-500" />
                                <span className="font-medium text-foreground">Pajtueshmeria e Planit: {planDefs[editPlan].label}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge variant="info">eIDAS {planDefs[editPlan].eidasLevel}</Badge>
                                {planDefs[editPlan].etsiCompliance.map((e: string) => <Badge key={e} variant="default">{e}</Badge>)}
                              </div>
                              {planDefs[editPlan].sealTypes.length > 0 && (
                                <p className="mt-1.5 text-[10px] text-muted-foreground">
                                  Tipet e vulave: {planDefs[editPlan].sealTypes.join(", ")}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Save */}
                          <Button onClick={() => handleSavePlan(org.id)} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" /> {saving ? "Duke ruajtur..." : "Ruaj Planin & Kuotat"}
                          </Button>
                        </div>
                      </CardContent>
                    )}

                    {/* Tab: Users */}
                    {activeTab === "users" && (
                      <CardContent className="p-4">
                        {/* Add user search */}
                        <div className="mb-4">
                          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shto Perdorues ne Organizate</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              value={userSearch}
                              onChange={(e) => { setUserSearch(e.target.value); searchUnassignedUsers(e.target.value); }}
                              placeholder="Kerko perdorues pa organizate (emer ose email)..."
                              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 pl-10 text-sm text-foreground"
                            />
                            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Duke kerkuar...</div>}
                          </div>
                          {searchResults.length > 0 && (
                            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-card">
                              {searchResults.map((u) => (
                                <div key={u.id} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={KYC_BADGE[u.kycStatus]?.variant || "default"}>
                                      {KYC_BADGE[u.kycStatus]?.label || u.kycStatus}
                                    </Badge>
                                    <button
                                      onClick={() => handleAssignUser(u.id, org.id)}
                                      disabled={assigning === u.id}
                                      className="flex items-center gap-1 rounded-lg bg-foreground px-2.5 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-50"
                                    >
                                      <Plus className="h-3 w-3" />
                                      {assigning === u.id ? "..." : "Shto"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {userSearch.length >= 2 && searchResults.length === 0 && !searching && (
                            <p className="mt-2 text-xs text-muted-foreground">Nuk u gjet asnje perdorues pa organizate.</p>
                          )}
                        </div>

                        {/* Current members */}
                        {org.users.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Kjo organizate nuk ka perdorues.</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anetaret ({org.users.length})</p>
                            {org.users.map((user) => (
                              <div key={user.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={user.role === "ADMIN" ? "purple" : user.role === "SUPER_ADMIN" ? "destructive" : "default"}>
                                    {user.role}
                                  </Badge>
                                  <Badge variant={KYC_BADGE[user.kycStatus]?.variant || "default"}>
                                    {KYC_BADGE[user.kycStatus]?.label || user.kycStatus}
                                  </Badge>
                                  <button
                                    onClick={() => handleRemoveUser(user.id)}
                                    disabled={assigning === user.id}
                                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                    title="Hiq nga organizata"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}

                    {/* Tab: Seals */}
                    {activeTab === "seals" && (() => {
                      const templateLimit = quota?.maxSealTemplates ?? planDefs[org.plan]?.quotas?.maxSealTemplates ?? 0;
                      const sealCount = org._count.companySeals;
                      const sealPct = templateLimit > 0 ? Math.min(100, Math.round((sealCount / templateLimit) * 100)) : 0;
                      const atLimit = templateLimit > 0 && sealCount >= templateLimit;
                      const appLimit = quota?.maxSeals ?? planDefs[org.plan]?.quotas?.maxSeals ?? 0;
                      const appUsed = quota?.usedSeals ?? 0;

                      return (
                        <CardContent className="p-4">
                          {/* Seal quota info */}
                          <div className="mb-4 space-y-3">
                            {/* Template limit */}
                            <div className="rounded-xl border border-border bg-muted/50 p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Stamp className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template Vulave (sa vula mund te krijoje)</span>
                                </div>
                                <span className={cn("text-sm font-semibold", atLimit ? "text-red-500" : "text-foreground")}>
                                  {sealCount} / {templateLimit === 0 ? "0 (i bllokuar)" : templateLimit}
                                </span>
                              </div>
                              {templateLimit > 0 && (
                                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                                  <div
                                    className={cn("h-1.5 rounded-full transition-all", sealPct >= 90 ? "bg-red-500" : sealPct >= 70 ? "bg-yellow-500" : "bg-blue-500")}
                                    style={{ width: `${sealPct}%` }}
                                  />
                                </div>
                              )}
                              {atLimit && (
                                <p className="mt-1.5 text-[11px] text-red-500">
                                  Organizata ka arritur limitin e template-ve te vulave. Rrisni kuoten ne tab-in &quot;Plan &amp; Kuota&quot;.
                                </p>
                              )}
                              {templateLimit === 0 && org.plan === "FREE" && (
                                <p className="mt-1.5 text-[11px] text-muted-foreground">
                                  Plani Free nuk perfshin vula dixhitale. Upgrade ne PRO ose ENTERPRISE per te aktivizuar vulat.
                                </p>
                              )}
                            </div>

                            {/* Seal application usage (per period) */}
                            {appLimit > 0 && (
                              <div className="rounded-xl border border-border bg-muted/50 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stampime kete periudhe</span>
                                  <span className="text-sm font-semibold text-foreground">{appUsed} / {appLimit}</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                                  <div
                                    className={cn("h-1.5 rounded-full transition-all", appLimit > 0 && appUsed / appLimit >= 0.9 ? "bg-red-500" : appUsed / appLimit >= 0.7 ? "bg-yellow-500" : "bg-blue-500")}
                                    style={{ width: `${appLimit > 0 ? Math.min(100, Math.round((appUsed / appLimit) * 100)) : 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Seal list */}
                          {org.companySeals.length === 0 ? (
                            <div className="text-center py-4">
                              <Stamp className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-2 text-sm text-muted-foreground">
                                {templateLimit === 0 ? "Vulat nuk jane te aktivizuara per kete plan." : "Kjo organizate nuk ka vula te regjistruara akoma."}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {org.companySeals.map((seal) => {
                                const sCfg = SEAL_STATUS[seal.status] || SEAL_STATUS.INACTIVE;
                                return (
                                  <div key={seal.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                                    <div className="flex items-center gap-3">
                                      <Stamp className="h-5 w-5 text-foreground" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">{seal.name}</p>
                                        <p className="text-xs text-muted-foreground">{seal.type.replace(/_/g, " ")} · {seal.eidasLevel} · {seal._count.appliedSeals} aplikime</p>
                                      </div>
                                    </div>
                                    <Badge variant={sCfg.variant}>{sCfg.label}</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      );
                    })()}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Faqja {page} nga {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Para</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)}>Pas</Button>
          </div>
        </div>
      )}
    </div>
  );
}
