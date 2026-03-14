"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  User,
  Building2,
  Clock,
  ChevronDown,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface RenewalAlert {
  id: string;
  daysBeforeExpiry: number;
  status: "PENDING" | "SENT" | "ACKNOWLEDGED";
  sentAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

interface Certificate {
  id: string;
  serialNumber: string;
  subjectDN: string;
  issuerDN: string;
  publicKey: string;
  validFrom: string;
  validTo: string;
  revoked: boolean;
  revokedAt: string | null;
  revokeReason: string | null;
  type: "PERSONAL" | "ORGANIZATION" | "TSA";
  autoRenew: boolean;
  renewalNotifiedAt: string | null;
  createdAt: string;
  userId: string | null;
  organizationId: string | null;
  user: { id: string; name: string; email: string } | null;
  organization: { id: string; name: string } | null;
  renewalAlerts: RenewalAlert[];
  _count: { signatures: number };
}

interface Stats {
  total: number;
  active: number;
  expiring: number;
  revoked: number;
  personal: number;
  organization: number;
  tsa: number;
}

const TYPE_BADGE: Record<string, { label: string; variant: "info" | "purple" | "warning" }> = {
  PERSONAL: { label: "Personal", variant: "info" },
  ORGANIZATION: { label: "Organization", variant: "purple" },
  TSA: { label: "TSA", variant: "warning" },
};

const ALERT_STATUS_BADGE: Record<string, { variant: "warning" | "info" | "success" }> = {
  PENDING: { variant: "warning" },
  SENT: { variant: "info" },
  ACKNOWLEDGED: { variant: "success" },
};

function daysUntil(d: string) {
  const now = new Date();
  const target = new Date(d);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryColor(validTo: string) {
  const days = daysUntil(validTo);
  if (days < 0) return "text-red-500";
  if (days <= 30) return "text-red-500";
  if (days <= 90) return "text-yellow-500";
  return "text-green-500";
}

function certStatus(cert: Certificate): { label: string; variant: "success" | "warning" | "destructive" | "default" } {
  if (cert.revoked) return { label: "Revoked", variant: "destructive" };
  const days = daysUntil(cert.validTo);
  if (days < 0) return { label: "Expired", variant: "default" };
  if (days <= 90) return { label: "Expiring", variant: "warning" };
  return { label: "Active", variant: "success" };
}

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showExpiring, setShowExpiring] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, expiring: 0, revoked: 0, personal: 0, organization: 0, tsa: 0 });
  const [userRole, setUserRole] = useState<string>("");
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "30" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (showExpiring) params.set("expiring", "true");
    if (showRevoked) params.set("revoked", "true");

    const res = await fetch(`/api/admin/certificates?${params}`);
    const data = await res.json();
    if (data.success) {
      setCertificates(data.data.certificates);
      setTotal(data.data.pagination.total);
    }
    setLoading(false);
  }, [search, typeFilter, showExpiring, showRevoked, page]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/certificates?limit=10000");
    const data = await res.json();
    if (data.success) {
      const all: Certificate[] = data.data.certificates;
      const now = new Date();
      const in90 = new Date();
      in90.setDate(in90.getDate() + 90);

      setStats({
        total: data.data.pagination.total,
        active: all.filter((c) => !c.revoked && new Date(c.validTo) > now).length,
        expiring: all.filter((c) => !c.revoked && new Date(c.validTo) > now && new Date(c.validTo) <= in90).length,
        revoked: all.filter((c) => c.revoked).length,
        personal: all.filter((c) => c.type === "PERSONAL").length,
        organization: all.filter((c) => c.type === "ORGANIZATION").length,
        tsa: all.filter((c) => c.type === "TSA").length,
      });
    }
  }, []);

  const fetchUserRole = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data?.role) {
        setUserRole(data.data.role);
      }
    }
  }, []);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);
  useEffect(() => { fetchStats(); fetchUserRole(); }, [fetchStats, fetchUserRole]);

  async function handleRevoke(certificateId: string) {
    setActionLoading(true);
    const res = await fetch("/api/admin/certificates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateId, action: "revoke", revokeReason: revokeReason || undefined }),
    });
    if (res.ok) {
      setRevokeConfirm(null);
      setRevokeReason("");
      fetchCertificates();
      fetchStats();
    }
    setActionLoading(false);
  }

  async function handleToggleAutoRenew(certificateId: string) {
    setActionLoading(true);
    const res = await fetch("/api/admin/certificates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateId, action: "toggleAutoRenew" }),
    });
    if (res.ok) {
      fetchCertificates();
    }
    setActionLoading(false);
  }

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Admin: Certifikata" subtitle={`${stats.total} certifikata gjithsej ne sistem`} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total" value={stats.total} icon={Shield} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Active" value={stats.active} icon={ShieldCheck} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Expiring Soon" value={stats.expiring} icon={ShieldAlert} iconColor="text-yellow-500" iconBg="bg-yellow-900/30" />
        <StatCard label="Revoked" value={stats.revoked} icon={ShieldX} iconColor="text-red-500" iconBg="bg-red-900/30" />
        <StatCard label="Personal" value={stats.personal} icon={User} iconColor="text-blue-500" iconBg="bg-blue-900/30" />
        <StatCard label="Organization" value={stats.organization} icon={Building2} iconColor="text-purple-500" iconBg="bg-purple-900/30" />
        <StatCard label="TSA" value={stats.tsa} icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-900/30" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by serial number, subject DN, email..."
            className="pl-10"
          />
        </div>

        <div className="flex gap-1.5">
          {(["", "PERSONAL", "ORGANIZATION", "TSA"] as const).map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "primary" : "ghost"}
              size="sm"
              onClick={() => { setTypeFilter(t); setPage(1); }}
            >
              {t === "" ? "All Types" : t === "PERSONAL" ? "Personal" : t === "ORGANIZATION" ? "Organization" : "TSA"}
            </Button>
          ))}
        </div>

        <Button
          variant={showExpiring ? "primary" : "ghost"}
          size="sm"
          onClick={() => { setShowExpiring(!showExpiring); setShowRevoked(false); setPage(1); }}
        >
          Expiring Soon
        </Button>

        <Button
          variant={showRevoked ? "destructive" : "ghost"}
          size="sm"
          onClick={() => { setShowRevoked(!showRevoked); setShowExpiring(false); setPage(1); }}
        >
          Revoked
        </Button>
      </div>

      {/* Certificates List */}
      {loading ? (
        <PageSpinner />
      ) : certificates.length === 0 ? (
        <EmptyState icon={Shield} title="Nuk ka certifikata" />
      ) : (
        <div className="space-y-2">
          {certificates.map((cert) => {
            const isExpanded = expandedId === cert.id;
            const status = certStatus(cert);
            const days = daysUntil(cert.validTo);
            const owner = cert.user ? cert.user.name || cert.user.email : cert.organization?.name || "-";
            const typeCfg = TYPE_BADGE[cert.type];

            return (
              <Card key={cert.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : cert.id)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="max-w-[200px] truncate font-mono text-sm font-medium text-foreground" title={cert.serialNumber}>
                        {cert.serialNumber.length > 20 ? cert.serialNumber.slice(0, 20) + "..." : cert.serialNumber}
                      </h3>
                      {typeCfg && <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span className="max-w-[250px] truncate" title={cert.subjectDN}>{cert.subjectDN}</span>
                      <span>Owner: <strong>{owner}</strong></span>
                      <span>
                        {formatDate(cert.validFrom)} - <span className={expiryColor(cert.validTo)}>{formatDate(cert.validTo)}</span>
                        {!cert.revoked && days >= 0 && (
                          <span className={cn("ml-1", expiryColor(cert.validTo))}>({days}d)</span>
                        )}
                      </span>
                      {cert.autoRenew && (
                        <span className="text-green-500" title="Auto-Renew enabled">
                          <RefreshCw className="inline h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{cert._count.signatures} sig{cert._count.signatures !== 1 ? "s" : ""}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border p-4">
                    {/* Details grid */}
                    <div className="mb-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">Serial Number</span>
                        <p className="break-all font-mono font-medium text-foreground">{cert.serialNumber}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject DN</span>
                        <p className="break-all font-medium text-foreground">{cert.subjectDN}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Issuer DN</span>
                        <p className="break-all font-medium text-foreground">{cert.issuerDN}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid From</span>
                        <p className="font-medium text-foreground">{formatDate(cert.validFrom)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid To</span>
                        <p className={cn("font-medium", expiryColor(cert.validTo))}>{formatDate(cert.validTo)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Signatures</span>
                        <p className="font-medium text-foreground">{cert._count.signatures}</p>
                      </div>
                      {cert.user && (
                        <div>
                          <span className="text-muted-foreground">User</span>
                          <p className="font-medium text-foreground">{cert.user.name} ({cert.user.email})</p>
                        </div>
                      )}
                      {cert.organization && (
                        <div>
                          <span className="text-muted-foreground">Organization</span>
                          <p className="font-medium text-foreground">{cert.organization.name}</p>
                        </div>
                      )}
                      {cert.revoked && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Revoked At</span>
                            <p className="font-medium text-red-500">{cert.revokedAt ? formatDate(cert.revokedAt) : "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Revoke Reason</span>
                            <p className="font-medium text-red-500">{cert.revokeReason || "-"}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-muted-foreground">Created</span>
                        <p className="font-medium text-foreground">{formatDate(cert.createdAt)}</p>
                      </div>
                    </div>

                    {/* Renewal Alerts */}
                    {cert.renewalAlerts.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Renewal Alerts</p>
                        <div className="space-y-1">
                          {cert.renewalAlerts.map((alert) => {
                            const alertCfg = ALERT_STATUS_BADGE[alert.status];
                            return (
                              <div key={alert.id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-xs">
                                <Badge variant={alertCfg?.variant || "default"}>{alert.status}</Badge>
                                <span className="text-muted-foreground">{alert.daysBeforeExpiry} days before expiry</span>
                                {alert.sentAt && <span className="text-muted-foreground">Sent: {formatDate(alert.sentAt)}</span>}
                                {alert.acknowledgedAt && <span className="text-muted-foreground">Ack: {formatDate(alert.acknowledgedAt)}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions (SUPER_ADMIN only) */}
                    {isSuperAdmin && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                        {!cert.revoked && (
                          <>
                            {revokeConfirm === cert.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="text"
                                  value={revokeReason}
                                  onChange={(e) => setRevokeReason(e.target.value)}
                                  placeholder="Revoke reason (optional)"
                                  className="h-8 text-xs"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRevoke(cert.id)}
                                  disabled={actionLoading}
                                >
                                  {actionLoading ? "..." : "Confirm Revoke"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => { setRevokeConfirm(null); setRevokeReason(""); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRevokeConfirm(cert.id)}
                                className="border border-red-800 text-red-400 hover:bg-red-900/30"
                              >
                                Revoke Certificate
                              </Button>
                            )}
                          </>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleAutoRenew(cert.id)}
                          disabled={actionLoading}
                          className={cn(
                            "border",
                            cert.autoRenew
                              ? "border-green-800 text-green-400 hover:bg-green-900/30"
                              : "border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {cert.autoRenew ? "Disable Auto-Renew" : "Enable Auto-Renew"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 30)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 30)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
