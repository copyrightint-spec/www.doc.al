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
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
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
              Leshuar nga
            </span>
            <p className="mt-0.5 font-medium text-foreground">{cert.issuerCN}</p>
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

  if (loading) return <PageSpinner />;

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
