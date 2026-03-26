"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  Key,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

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
  isCA: boolean;
  pathLenConstraint: number | null;
}

interface PublicCertificate {
  serialNumber: string;
  subjectCN: string;
  type: "PERSONAL" | "ORGANIZATION" | "TSA";
  issuedDate: string;
  expiryDate: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  revokedAt: string | null;
  revokeReason: string | null;
}

interface CertStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
}

interface PageData {
  rootCA: CACertInfo | null;
  issuingCA: CACertInfo | null;
  stats: CertStats;
  certificates: PublicCertificate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sq-AL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("sq-AL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  PERSONAL: "Personal",
  ORGANIZATION: "Organizate",
  TSA: "TSA",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Aktive",
    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  REVOKED: {
    label: "Revokuar",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  EXPIRED: {
    label: "Skaduar",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
};

export default function CertificatesPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/certificates/public?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/api/logo"
                unoptimized
                alt="doc.al"
                width={44}
                height={44}
                className="h-11 w-11"
                priority
              />
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                doc<span className="text-blue-600">.al</span>
              </span>
            </Link>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Certificate Transparency Log
            </p>
          </div>
          <PublicNav />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Transparenca e Certifikatave
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Log publik i te gjitha certifikatave te leshuara nga doc.al Certificate Authority.
            Cdo certifikate eshte e verifikueshme permes OCSP.
          </p>
        </div>

        {/* Stats */}
        {loading && !data && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div>
                    <Skeleton className="h-7 w-12 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {data && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                  <Shield className="h-5 w-5 text-slate-600 dark:text-slate-300" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.total}</p>
                  <p className="text-xs text-slate-500">Gjithsej</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.active}</p>
                  <p className="text-xs text-slate-500">Aktive</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                  <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.revoked}</p>
                  <p className="text-xs text-slate-500">Revokuara</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                  <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.stats.expired}</p>
                  <p className="text-xs text-slate-500">Skaduar</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CA Certificates - Skeleton */}
        {loading && !data && (
          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
                <Skeleton className="mt-4 h-10 w-40 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* CA Certificates */}
        {data && (data.rootCA || data.issuingCA) && (
          <div className="mb-8 grid gap-4 lg:grid-cols-2">
            {/* Root CA */}
            {data.rootCA && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Root CA</h3>
                    <p className="text-xs text-slate-500">{data.rootCA.commonName}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Organizata</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.rootCA.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nenshkruar nga</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.rootCA.issuerCN} — {data.rootCA.issuerOrganization || data.rootCA.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vlefshme nga</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatDate(data.rootCA.validFrom)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vlefshme deri</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatDate(data.rootCA.validTo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Celesi</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.rootCA.keySize} bit RSA</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Gjurma SHA-256</span>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">{data.rootCA.fingerprintSHA256}</p>
                  </div>
                </div>
                <a
                  href="/api/ca/root.crt"
                  download
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Shkarko root.crt
                </a>
              </div>
            )}

            {/* Issuing CA */}
            {data.issuingCA && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issuing CA</h3>
                    <p className="text-xs text-slate-500">{data.issuingCA.commonName}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Organizata</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.issuingCA.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nenshkruar nga</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.issuingCA.issuerCN} — {data.issuingCA.issuerOrganization || data.issuingCA.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vlefshme nga</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatDate(data.issuingCA.validFrom)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vlefshme deri</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatDate(data.issuingCA.validTo)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Celesi</span>
                    <span className="font-medium text-slate-900 dark:text-white">{data.issuingCA.keySize} bit RSA</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Gjurma SHA-256</span>
                    <p className="mt-1 break-all font-mono text-[11px] text-slate-700 dark:text-slate-300">{data.issuingCA.fingerprintSHA256}</p>
                  </div>
                </div>
                <a
                  href="/api/ca/issuing.crt"
                  download
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Shkarko issuing.crt
                </a>
              </div>
            )}
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Kerko me numer serial..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
            >
              Kerko
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Te gjitha statuset</option>
            <option value="active">Aktive</option>
            <option value="revoked">Revokuara</option>
            <option value="expired">Skaduar</option>
          </select>
        </div>

        {/* Certificates Table */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Numri Serial</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Subjekti</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Tipi</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Leshuar</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Skadon</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">Statusi</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">OCSP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading && !data ? (
                  <>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`skel-${i}`}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))}
                  </>
                ) : data && data.certificates.length > 0 ? (
                  data.certificates.map((cert) => {
                    const statusCfg = STATUS_CONFIG[cert.status];
                    return (
                      <tr
                        key={cert.serialNumber}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/30"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                            {cert.serialNumber.length > 20
                              ? cert.serialNumber.slice(0, 10) + "..." + cert.serialNumber.slice(-8)
                              : cert.serialNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {cert.subjectCN}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            cert.type === "PERSONAL"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : cert.type === "ORGANIZATION"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                          )}>
                            {TYPE_LABELS[cert.type] || cert.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {formatDateShort(cert.issuedDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                          {formatDateShort(cert.expiryDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            statusCfg.className
                          )}>
                            {statusCfg.label}
                          </span>
                          {cert.revokeReason && (
                            <p className="mt-0.5 text-[10px] text-red-500">{cert.revokeReason}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/api/ocsp?serial=${cert.serialNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Kontrollo
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Nuk u gjeten certifikata
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Faqja {data.pagination.page} nga {data.pagination.totalPages} ({data.pagination.total} gjithsej)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
                Para
              </button>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page === data.pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Pas
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
