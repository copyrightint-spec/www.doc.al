"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, AlertTriangle, Download, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

interface RenewalAlert {
  id: string;
  daysBeforeExpiry: number;
  status: string;
  sentAt: string | null;
}

interface Certificate {
  id: string;
  serialNumber: string;
  subjectDN: string;
  issuerDN: string;
  validFrom: string;
  validTo: string;
  type: string;
  revoked: boolean;
  autoRenew: boolean;
  renewalNotifiedAt: string | null;
  createdAt: string;
  renewalAlerts: RenewalAlert[];
}

const TYPE_LABELS: Record<string, string> = {
  PERSONAL: "Personale",
  ORGANIZATION: "Organizative",
  TSA: "TSA",
};

function daysUntilExpiry(validTo: string) {
  return Math.ceil((new Date(validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(validTo: string, revoked: boolean): { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" } {
  if (revoked) return { label: "Revokuar", variant: "destructive" };
  const days = daysUntilExpiry(validTo);
  if (days < 0) return { label: "Skaduar", variant: "default" };
  if (days <= 30) return { label: `Skadon per ${days} dite`, variant: "destructive" };
  if (days <= 60) return { label: `Skadon per ${days} dite`, variant: "warning" };
  if (days <= 90) return { label: `Skadon per ${days} dite`, variant: "info" };
  return { label: "Aktiv", variant: "success" };
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [org, setOrg] = useState("");
  const [country, setCountry] = useState("AL");
  const [years, setYears] = useState("2");
  const [error, setError] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportPassword, setExportPassword] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "expiring" | "expired" | "revoked">("all");

  useEffect(() => { fetchCerts(); }, []);

  async function fetchCerts() {
    const res = await fetch("/api/certificates");
    const data = await res.json();
    if (data.success) setCerts(data.data);
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: org, country, validityYears: parseInt(years) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowGenerate(false);
      setOrg("");
      fetchCerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport(certId: string) {
    if (!exportPassword) return;
    try {
      const res = await fetch("/api/certificates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId: certId, password: exportPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificate.p12";
      a.click();
      URL.revokeObjectURL(url);
      setExportingId(null);
      setExportPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim ne eksportim");
    }
  }

  async function handleRevoke(certId: string) {
    if (!confirm("Jeni te sigurt qe doni te revokoni kete certifikate?")) return;
    const res = await fetch("/api/certificates/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificateId: certId, reason: "User requested" }),
    });
    if (res.ok) fetchCerts();
  }

  const filtered = certs.filter((cert) => {
    const days = daysUntilExpiry(cert.validTo);
    switch (filterStatus) {
      case "active": return !cert.revoked && days > 90;
      case "expiring": return !cert.revoked && days > 0 && days <= 90;
      case "expired": return !cert.revoked && days <= 0;
      case "revoked": return cert.revoked;
      default: return true;
    }
  });

  const activeCount = certs.filter((c) => !c.revoked && daysUntilExpiry(c.validTo) > 0).length;
  const expiringCount = certs.filter((c) => !c.revoked && daysUntilExpiry(c.validTo) > 0 && daysUntilExpiry(c.validTo) <= 90).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Certifikatat"
        subtitle={`${certs.length} gjithsej | ${activeCount} aktive | ${expiringCount} duke skaduar`}
        actions={
          <Button onClick={() => setShowGenerate(!showGenerate)}>
            <Plus className="h-4 w-4" />
            Gjenero Certifikate
          </Button>
        }
      />

      {expiringCount > 0 && (
        <Alert
          variant="warning"
          icon={<AlertTriangle className="h-5 w-5" />}
          title={`${expiringCount} certifikata po skadojne brenda 90 diteve`}
          description="Do merrni njoftime automatike 3 muaj, 2 muaj, 1 muaj perpara, dhe cdo dite ne muajin e fundit."
        />
      )}

      {/* Filter Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Gjithsej", value: certs.length, filter: "all" as const },
          { label: "Aktive", value: certs.filter((c) => !c.revoked && daysUntilExpiry(c.validTo) > 90).length, filter: "active" as const },
          { label: "Duke Skaduar", value: expiringCount, filter: "expiring" as const },
          { label: "Revokuar", value: certs.filter((c) => c.revoked).length, filter: "revoked" as const },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setFilterStatus(s.filter)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all",
              filterStatus === s.filter
                ? "border-accent bg-blue-50 dark:bg-blue-900/10"
                : "border-border bg-card hover:border-slate-300 dark:hover:border-slate-600"
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
          </button>
        ))}
      </div>

      {/* Generate Form */}
      {showGenerate && (
        <Card>
          <CardHeader>
            <CardTitle>Gjenero Certifikate te Re</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Organizata (opsionale)</label>
                <Input type="text" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Emri i organizates" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Shteti</label>
                <Input type="text" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Vlefshmeri</label>
                <select value={years} onChange={(e) => setYears(e.target.value)} className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground">
                  <option value="1">1 vit</option>
                  <option value="2">2 vite</option>
                  <option value="3">3 vite</option>
                </select>
              </div>
              <div className="md:col-span-3">
                {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" disabled={generating}>
                    {generating ? "Duke gjeneruar..." : "Gjenero"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowGenerate(false)}>Anulo</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cert) => {
            const status = getExpiryBadge(cert.validTo, cert.revoked);
            const days = daysUntilExpiry(cert.validTo);

            return (
              <Card key={cert.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-mono text-sm font-medium text-foreground">{cert.serialNumber}</h3>
                      <Badge variant="info">{TYPE_LABELS[cert.type] || cert.type}</Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{cert.subjectDN}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Nga: {new Date(cert.validFrom).toLocaleDateString("sq-AL")}</span>
                      <span>Deri: {new Date(cert.validTo).toLocaleDateString("sq-AL")}</span>
                      <span>Leshuar: {cert.issuerDN}</span>
                    </div>

                    {!cert.revoked && days > 0 && days <= 90 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={cn("font-medium", days <= 30 ? "text-red-600" : "text-yellow-600")}>
                            {days} dite te mbetura
                          </span>
                          <span className="text-muted-foreground">Rinovimi automatik: {cert.autoRenew ? "Po" : "Jo"}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={cn("h-full rounded-full transition-all", days <= 30 ? "bg-red-500" : "bg-yellow-500")}
                            style={{ width: `${Math.max(5, (days / 90) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {cert.renewalAlerts && cert.renewalAlerts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {cert.renewalAlerts.map((alert) => (
                          <Badge key={alert.id} variant="default" className="text-[9px]">
                            {alert.status === "SENT" ? "Njoftuar" : "Ne pritje"} ({alert.daysBeforeExpiry}d)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {!cert.revoked && days > 0 && (
                      <>
                        {exportingId === cert.id ? (
                          <div className="flex gap-1">
                            <Input
                              type="password"
                              value={exportPassword}
                              onChange={(e) => setExportPassword(e.target.value)}
                              placeholder="Password"
                              className="h-8 w-28 text-xs"
                            />
                            <Button size="sm" onClick={() => handleExport(cert.id)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setExportingId(null); setExportPassword(""); }}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => setExportingId(cert.id)}>Eksporto</Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => handleRevoke(cert.id)}>Revoko</Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <EmptyState
              icon={Shield}
              title={filterStatus !== "all" ? "Nuk ka certifikata me kete filter" : "Nuk keni certifikata akoma"}
              description="Gjeneroni nje certifikate per te filluar nenshkrimin"
            />
          )}
        </div>
      )}
    </div>
  );
}
