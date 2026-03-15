"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { KYC_STATUS } from "@/lib/constants/status";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Award,
  CreditCard,
  Lock,
} from "lucide-react";

type KycTab = "ALL" | "PENDING" | "VERIFIED" | "REJECTED";

interface KycUser {
  id: string;
  email: string;
  name: string;
  kycStatus: string;
  kycDocumentUrl: string | null;
  kycMetadata: Record<string, string> | null;
  kycVerifiedAt: string | null;
  createdAt: string;
}

const METADATA_LABELS: Record<string, string> = {
  fullName: "Emri i plote",
  dateOfBirth: "Data e lindjes",
  idNumber: "Numri Personal (ID)",
  nationality: "Kombesia",
  address: "Adresa",
  city: "Qyteti",
  phone: "Telefoni",
  documentType: "Lloji i dokumentit",
  submittedAt: "Dorezuar me",
};

// Keys that are document URLs — should be shown as previews, not text
const DOCUMENT_URL_KEYS = ["frontDocumentUrl", "backDocumentUrl", "selfieUrl"];
const DOCUMENT_URL_LABELS: Record<string, string> = {
  frontDocumentUrl: "Foto e perparme",
  backDocumentUrl: "Foto e pasme",
  selfieUrl: "Selfie me dokumentin",
};

function S3Image({ s3Key, alt, className }: { s3Key: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const src = `/api/files/${s3Key}`;

  if (error) return <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-white"><span className="text-sm text-muted-foreground">Nuk u ngarkua</span></div>;

  return (
    <>
      {!loaded && <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-muted/30"><Spinner className="h-5 w-5" /></div>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded && "hidden")}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

export default function AdminKycPage() {
  const [users, setUsers] = useState<KycUser[]>([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<KycTab>("PENDING");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0 });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStats = useCallback(async () => {
    const [allRes, pendingRes, verifiedRes, rejectedRes] = await Promise.all([
      fetch("/api/admin/users?limit=1"),
      fetch("/api/admin/users?kycStatus=PENDING&limit=1"),
      fetch("/api/admin/users?kycStatus=VERIFIED&limit=1"),
      fetch("/api/admin/users?kycStatus=REJECTED&limit=1"),
    ]);
    const [allData, pendingData, verifiedData, rejectedData] = await Promise.all([
      allRes.json(),
      pendingRes.json(),
      verifiedRes.json(),
      rejectedRes.json(),
    ]);
    setStats({
      total: allData.success ? allData.data.pagination.total : 0,
      pending: pendingData.success ? pendingData.data.pagination.total : 0,
      verified: verifiedData.success ? verifiedData.data.pagination.total : 0,
      rejected: rejectedData.success ? rejectedData.data.pagination.total : 0,
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (activeTab !== "ALL") params.set("kycStatus", activeTab);

    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data.users);
      setTotal(data.data.pagination.total);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updateKycStatus(userId: string, kycStatus: "VERIFIED" | "REJECTED") {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kycStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          kycStatus === "VERIFIED"
            ? "KYC u verifikua me sukses"
            : "KYC u refuzua",
          "success"
        );
        fetchUsers();
        fetchStats();
      } else {
        showToast(data.error || "Gabim gjate perditesimit", "error");
      }
    } catch {
      showToast("Gabim gjate perditesimit", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function verifyAndGenerateCertificate(userId: string) {
    setActionLoading(userId);
    try {
      const verifyRes = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kycStatus: "VERIFIED" }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        showToast("Gabim gjate verifikimit te KYC", "error");
        setActionLoading(null);
        return;
      }

      const certRes = await fetch("/api/admin/users/generate-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const certData = await certRes.json();
      if (certData.success) {
        showToast(
          `KYC u verifikua dhe certifikata u gjenerua per ${certData.data.userName}`,
          "success"
        );
      } else {
        showToast(certData.error || "KYC u verifikua por certifikata deshtoi", "error");
      }
      fetchUsers();
      fetchStats();
    } catch {
      showToast("Gabim gjate procesit", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const tabs: { key: KycTab; label: string; count: number }[] = [
    { key: "ALL", label: "Te gjitha", count: stats.total },
    { key: "PENDING", label: "Ne Pritje", count: stats.pending },
    { key: "VERIFIED", label: "Verifikuar", count: stats.verified },
    { key: "REJECTED", label: "Refuzuar", count: stats.rejected },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Toast notification */}
      {toast && (
        <Alert
          variant={toast.type === "success" ? "success" : "destructive"}
          title={toast.message}
          className="fixed right-6 top-6 z-50 max-w-md shadow-lg"
        />
      )}

      <PageHeader
        title="Verifikimi KYC"
        subtitle={`${stats.pending} kerkesa ne pritje nga ${stats.total} totale`}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Totale"
          value={stats.total}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Ne Pritje"
          value={stats.pending}
          icon={Clock}
          iconColor="text-yellow-500"
          iconBg="bg-yellow-500/10"
          valueColor="text-yellow-500"
        />
        <StatCard
          label="Verifikuar"
          value={stats.verified}
          icon={CheckCircle}
          iconColor="text-green-500"
          iconBg="bg-green-500/10"
          valueColor="text-green-500"
        />
        <StatCard
          label="Refuzuar"
          value={stats.rejected}
          icon={XCircle}
          iconColor="text-red-500"
          iconBg="bg-red-500/10"
          valueColor="text-red-500"
        />
      </div>

      {/* Data retention notice */}
      <Alert
        variant="info"
        title="Politika e ruajtjes se te dhenave KYC"
        description="Per arsye sigurie, te dhenat e KYC (dokumentet, fotografite, te dhenat personale) ruhen ne sistem deri sa perdoruesi te perfundoje perdorimin e platformes. Te dhenat nuk mund te fshihen nderkohe qe llogaria eshte aktive."
        icon={<Lock className="h-4 w-4" />}
      />

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                activeTab === tab.key
                  ? "bg-foreground/10 text-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main content */}
      {loading ? (
        <PageSpinner />
      ) : users.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nuk ka kerkesa KYC"
          description={
            activeTab === "ALL"
              ? "Nuk ka asnje kerkese KYC te regjistruar."
              : `Nuk ka kerkesa me statusin "${tabs.find((t) => t.key === activeTab)?.label}".`
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {total} rezultate
          </p>

          {users.map((user) => {
            const kycCfg = KYC_STATUS[user.kycStatus];
            const isExpanded = expandedUser === user.id;
            const metadata = user.kycMetadata as Record<string, string> | null;

            return (
              <Card key={user.id} className="overflow-hidden rounded-2xl">
                {/* Collapsed row */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <CreditCard className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                  {kycCfg && <Badge variant={kycCfg.variant}>{kycCfg.label}</Badge>}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <CardContent className="border-t border-border px-5 pb-5 pt-5">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                      {/* KYC Metadata */}
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Te dhenat e identifikimit
                        </h3>
                        {metadata ? (
                          <div className="space-y-2">
                            {Object.entries(metadata)
                              .filter(([key]) => !DOCUMENT_URL_KEYS.includes(key))
                              .map(([key, value]) => (
                                <div key={key} className="flex items-start justify-between gap-2 text-sm">
                                  <span className="text-muted-foreground">
                                    {METADATA_LABELS[key] || key}
                                  </span>
                                  <span className="text-right font-medium text-foreground">
                                    {key === "submittedAt" && value
                                      ? formatDateTime(value)
                                      : value || "\u2014"}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nuk ka te dhena te dorezuara.
                          </p>
                        )}

                        {/* User details */}
                        <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">User ID</span>
                            <span className="font-mono text-xs text-foreground">
                              {user.id.slice(0, 16)}...
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">Regjistruar me</span>
                            <span className="text-foreground">{formatDateTime(user.createdAt)}</span>
                          </div>
                          {user.kycVerifiedAt && (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-muted-foreground">Verifikuar me</span>
                              <span className="text-foreground">
                                {formatDateTime(user.kycVerifiedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Document Previews */}
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Dokumentet e ngarkuara
                        </h3>
                        {metadata ? (
                          <div className="space-y-3">
                            {DOCUMENT_URL_KEYS.map((key) => {
                              const s3Key = metadata[key];
                              if (!s3Key) return null;
                              const label = DOCUMENT_URL_LABELS[key] || key;
                              const isImage = /\.(jpg|jpeg|png|svg|webp)$/i.test(s3Key);
                              return (
                                <div key={key} className="rounded-xl border border-border bg-muted/30 p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {label}
                                  </p>
                                  {isImage ? (
                                    <S3Image
                                      s3Key={s3Key}
                                      alt={label}
                                      className="max-h-48 w-full rounded-lg border border-border object-contain bg-white"
                                    />
                                  ) : (
                                    <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-white">
                                      <span className="text-sm text-muted-foreground">PDF dokument</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {!metadata.frontDocumentUrl && !user.kycDocumentUrl && (
                              <p className="text-sm text-muted-foreground">
                                Nuk ka dokument te ngarkuar.
                              </p>
                            )}
                            {/* Fallback: if no document URLs in metadata but kycDocumentUrl exists */}
                            {!metadata.frontDocumentUrl && user.kycDocumentUrl && (
                              <div className="rounded-xl border border-border bg-muted/30 p-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  Dokumenti kryesor
                                </p>
                                <a
                                  href={user.kycDocumentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-600"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Shiko dokumentin
                                </a>
                              </div>
                            )}
                          </div>
                        ) : user.kycDocumentUrl ? (
                          <a
                            href={user.kycDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Shiko dokumentin
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nuk ka dokument te ngarkuar.
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-3">
                        <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          Veprimet
                        </h3>

                        {user.kycStatus === "PENDING" ? (
                          <div className="space-y-2">
                            <Button
                              variant="primary"
                              className="w-full rounded-xl"
                              onClick={() => updateKycStatus(user.id, "VERIFIED")}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Spinner size="sm" />
                                  Duke procesuar...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <ShieldCheck className="h-4 w-4" />
                                  Verifiko
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              className="w-full rounded-xl"
                              onClick={() => updateKycStatus(user.id, "REJECTED")}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Spinner size="sm" />
                                  Duke procesuar...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Refuzo
                                </span>
                              )}
                            </Button>
                            <Button
                              variant="secondary"
                              className="w-full rounded-xl"
                              onClick={() => verifyAndGenerateCertificate(user.id)}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <Spinner size="sm" />
                                  Duke procesuar...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <Award className="h-4 w-4" />
                                  Verifiko + Gjenero Certifikate
                                </span>
                              )}
                            </Button>
                          </div>
                        ) : user.kycStatus === "VERIFIED" ? (
                          <Alert
                            variant="success"
                            title="KYC i verifikuar"
                            description="Perdoruesi eshte verifikuar me sukses."
                          />
                        ) : user.kycStatus === "REJECTED" ? (
                          <Alert
                            variant="destructive"
                            title="KYC i refuzuar"
                            description="Kerkesa e perdoruesit eshte refuzuar."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nuk ka veprime te disponueshme.
                          </p>
                        )}
                      </div>
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
