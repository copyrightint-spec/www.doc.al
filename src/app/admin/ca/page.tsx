"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Download,
  RefreshCw,
  ExternalLink,
  Lock,
  Key,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatDateTimeFull } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface CACertInfo {
  commonName: string;
  organization: string;
  country: string;
  locality: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprintSHA256: string;
  keySize: number;
  issuerCN: string;
  issuerOrganization: string;
  issuerCountry: string;
  isCA: boolean;
  pathLenConstraint: number | null;
}

interface CAStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  expiredCertificates: number;
}

interface CAData {
  rootCA: CACertInfo;
  issuingCA: CACertInfo;
  stats: CAStats;
  ocspUrl: string;
  crlUrl: string;
}

function daysUntil(d: string) {
  const now = new Date();
  const target = new Date(d);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function validityColor(validTo: string) {
  const days = daysUntil(validTo);
  if (days < 0) return "text-red-500";
  if (days <= 90) return "text-yellow-500";
  return "text-green-500";
}

function validityBadge(validTo: string): { label: string; variant: "success" | "warning" | "destructive" } {
  const days = daysUntil(validTo);
  if (days < 0) return { label: "Skaduar", variant: "destructive" };
  if (days <= 90) return { label: `Skadon per ${days} dite`, variant: "warning" };
  return { label: "Aktive", variant: "success" };
}

function CertificateCard({ cert, title, icon: Icon }: { cert: CACertInfo; title: string; icon: typeof Shield }) {
  const validity = validityBadge(cert.validTo);
  const days = daysUntil(cert.validTo);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900/30">
          <Icon className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{cert.commonName}</p>
        </div>
        <Badge variant={validity.variant}>{validity.label}</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Common Name (CN)
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.commonName}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Organizata
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.organization}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Vendi / Qyteti
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.country} / {cert.locality}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Nenshkruar nga
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.issuerCN}{cert.issuerOrganization ? ` — ${cert.issuerOrganization}` : ""}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Vlefshme nga
            </span>
            <p className="mt-0.5 font-medium text-foreground">{formatDate(cert.validFrom)}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Vlefshme deri
            </span>
            <p className={cn("mt-0.5 font-medium", validityColor(cert.validTo))}>
              {formatDate(cert.validTo)}
              {days >= 0 && <span className="ml-1">({days} dite)</span>}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Numri Serial
            </span>
            <p className="mt-0.5 break-all font-mono font-medium text-foreground">{cert.serialNumber}</p>
          </div>
          <div className="sm:col-span-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Gjurma SHA-256
            </span>
            <p className="mt-0.5 break-all font-mono text-[11px] font-medium text-foreground">{cert.fingerprintSHA256}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Madhesia e Celesit
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.keySize} bit RSA</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Eshte CA
            </span>
            <p className="mt-0.5 font-medium text-foreground">
              {cert.isCA ? "Po" : "Jo"}
              {cert.pathLenConstraint !== null && ` (pathLen: ${cert.pathLenConstraint})`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCAPage() {
  const [data, setData] = useState<CAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ocspStatus, setOcspStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [crlStatus, setCrlStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [regenResult, setRegenResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: string; title: string; warning: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  async function handleRegenerate(type: string) {
    setConfirmDialog(null);
    setRegenerating(type);
    setRegenResult(null);
    try {
      const res = await fetch("/api/admin/ca/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, totpCode }),
      });
      setTotpCode("");
      const json = await res.json();
      if (res.ok && json.success) {
        setRegenResult({ type, success: true, message: json.message });
        fetchData();
      } else {
        setRegenResult({ type, success: false, message: json.error || "Gabim i panjohur" });
      }
    } catch {
      setRegenResult({ type, success: false, message: "Gabim ne komunikim me serverin" });
    } finally {
      setRegenerating(null);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ca");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function checkOCSP() {
    setOcspStatus("checking");
    try {
      const res = await fetch("/api/ocsp", { method: "GET" });
      setOcspStatus(res.ok ? "ok" : "error");
    } catch {
      setOcspStatus("error");
    }
  }

  async function checkCRL() {
    setCrlStatus("checking");
    try {
      const res = await fetch("/api/crl", { method: "GET" });
      setCrlStatus(res.ok ? "ok" : "error");
    } catch {
      setCrlStatus("error");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <div className="space-y-1">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        {/* CA card skeletons */}
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <PageHeader title="Autoriteti i Certifikatave" subtitle="Gabim gjate ngarkimit te te dhenave" />
        <Card>
          <CardContent className="flex items-center gap-3 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <span>Nuk u arrit te ngarkohen te dhenat e CA. Kontrolloni konfigurimin.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Autoriteti i Certifikatave"
        subtitle="Menaxhimi i Root CA, Issuing CA, dhe certifikatave"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Gjithsej" value={data.stats.totalCertificates} icon={Shield} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Aktive" value={data.stats.activeCertificates} icon={ShieldCheck} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Revokuara" value={data.stats.revokedCertificates} icon={ShieldX} iconColor="text-red-500" iconBg="bg-red-900/30" />
        <StatCard label="Skaduar" value={data.stats.expiredCertificates} icon={ShieldAlert} iconColor="text-yellow-500" iconBg="bg-yellow-900/30" />
      </div>

      {/* Root CA */}
      <CertificateCard cert={data.rootCA} title="Root CA" icon={Lock} />

      {/* Issuing CA */}
      <CertificateCard cert={data.issuingCA} title="Issuing CA (Ndermjetese)" icon={Key} />

      {/* Regeneration Actions (SUPER_ADMIN only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Rigjenerimi i Certifikatave (SUPER_ADMIN)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {regenResult && (
            <div className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              regenResult.success
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            )}>
              {regenResult.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button
              variant="destructive"
              onClick={() => setConfirmDialog({
                type: "root",
                title: "Rigjenero Root CA",
                warning: "KUJDES: Rigjenerimi i Root CA do te invalidoje te gjitha certifikatat ekzistuese. Kjo veprim eshte i pakthyeshem dhe duhet bere vetem ne raste emergjence. Nese keni ROOT_CA_CERT/ROOT_CA_KEY ne env, ato do te perdoren ne vend te gjenerimit te ri.",
              })}
              disabled={regenerating !== null}
              className="gap-2"
            >
              {regenerating === "root" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Rigjenero Root CA
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmDialog({
                type: "issuing",
                title: "Rigjenero Issuing CA",
                warning: "KUJDES: Rigjenerimi i Issuing CA do te kerkoje rigjenerimin e te gjitha certifikatave te perdoruesve. Certifikatat ekzistuese nuk do te jene me te vlefshme.",
              })}
              disabled={regenerating !== null}
              className="gap-2"
            >
              {regenerating === "issuing" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              Rigjenero Issuing CA
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmDialog({
                type: "user-certificates",
                title: "Rigjenero Certifikatat e Perdoruesve",
                warning: "Kjo do te revokoje te gjitha certifikatat aktive te perdoruesve dhe do te gjeneroje te reja me Issuing CA aktuale. Perdoruesit do te duhet te shkarkojne certifikatat e reja.",
              })}
              disabled={regenerating !== null}
              className="gap-2"
            >
              {regenerating === "user-certificates" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Rigjenero Certifikatat e Perdoruesve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{confirmDialog.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{confirmDialog.warning}</p>
            <div className="mb-6">
              <label className="text-sm font-medium text-foreground">Kodi 2FA (i detyrueshem)</label>
              <Input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="mt-1 text-center text-lg tracking-widest font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => { setConfirmDialog(null); setTotpCode(""); }}>
                Anulo
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRegenerate(confirmDialog.type)}
                disabled={regenerating !== null || totpCode.length !== 6}
              >
                {regenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Po, Vazhdo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Download & Services */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Downloads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />
              Shkarko Certifikatat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/api/ca/root.crt"
              download
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-medium text-foreground">root.crt</p>
                <p className="text-xs text-muted-foreground">Certifikata Root CA (PEM)</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="/api/ca/issuing.crt"
              download
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-medium text-foreground">issuing.crt</p>
                <p className="text-xs text-muted-foreground">Certifikata Issuing CA (PEM)</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="/api/ca/chain.pem"
              download
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <div>
                <p className="font-medium text-foreground">chain.pem</p>
                <p className="text-xs text-muted-foreground">Zinxhiri i plote: Issuing CA + Root CA (PEM)</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>

        {/* OCSP & CRL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Sherbimet e Verifikimit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* OCSP */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm text-foreground">OCSP Responder</p>
                  <p className="text-xs text-muted-foreground font-mono">/api/ocsp</p>
                </div>
                <div className="flex items-center gap-2">
                  {ocspStatus === "ok" && <Badge variant="success">Online</Badge>}
                  {ocspStatus === "error" && <Badge variant="destructive">Gabim</Badge>}
                  {ocspStatus === "checking" && <Badge variant="default">Duke kontrolluar...</Badge>}
                  <Button variant="ghost" size="sm" onClick={checkOCSP} disabled={ocspStatus === "checking"}>
                    <RefreshCw className={cn("h-3 w-3", ocspStatus === "checking" && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <a
                href="/api/ocsp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                Hap ne dritare te re
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* CRL */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm text-foreground">CRL (Certificate Revocation List)</p>
                  <p className="text-xs text-muted-foreground font-mono">/api/crl</p>
                </div>
                <div className="flex items-center gap-2">
                  {crlStatus === "ok" && <Badge variant="success">Online</Badge>}
                  {crlStatus === "error" && <Badge variant="destructive">Gabim</Badge>}
                  {crlStatus === "checking" && <Badge variant="default">Duke kontrolluar...</Badge>}
                  <Button variant="ghost" size="sm" onClick={checkCRL} disabled={crlStatus === "checking"}>
                    <RefreshCw className={cn("h-3 w-3", crlStatus === "checking" && "animate-spin")} />
                  </Button>
                </div>
              </div>
              <a
                href="/api/crl"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                Shkarko CRL
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
