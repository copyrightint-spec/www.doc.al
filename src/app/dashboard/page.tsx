"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle,
  Zap,
  PenTool,
  Mail,
  LayoutTemplate,
  AlertTriangle,
  Info,
  ChevronRight,
} from "lucide-react";
import OnboardingBanner from "@/components/OnboardingBanner";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { DOCUMENT_STATUS, ACTION_CONFIG, DEFAULT_ACTION_CONFIG } from "@/lib/constants/status";
import { relativeTime, formatDate } from "@/lib/utils/date";

interface Stats {
  totalDocuments: number;
  pendingSignatures: number;
  completedDocuments: number;
  timestampsThisMonth: number;
}

interface UserInfo {
  name: string;
  email: string;
  kycStatus: string;
  role: string;
  image?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string> | null;
  createdAt: string;
}

interface RecentDoc {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { signatures: number };
  signatures: { status: string }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, statsRes, docsRes, auditRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/dashboard/stats"),
          fetch("/api/documents?limit=5"),
          fetch("/api/audit-log?limit=10"),
        ]);

        const sessionData = await sessionRes.json();
        if (sessionData?.user) {
          setUser({
            name: sessionData.user.name || "",
            email: sessionData.user.email || "",
            kycStatus: sessionData.user.kycStatus || "PENDING",
            role: sessionData.user.role || "USER",
            image: sessionData.user.image || undefined,
          });
          setHasCertificate(sessionData.user.hasCertificate ?? null);
        }

        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);

        const docsData = await docsRes.json();
        if (docsData.success) setRecentDocs(docsData.data?.documents || docsData.data || []);

        const auditData = await auditRes.json();
        if (auditData.success) setActivities(auditData.data?.logs || auditData.data || []);
      } catch {
        // silent
      }
      setLoading(false);
    }
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "";

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <OnboardingBanner />

      <PageHeader
        title={`Mire se vini, ${firstName}`}
        subtitle="Menaxhoni dokumentat, nenshkrimet dhe certifikatat tuaja."
      />

      {/* KYC Alert */}
      {user && user.kycStatus !== "VERIFIED" && (
        <Link href="/settings/kyc">
          <Alert
            variant="warning"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Verifikimi KYC nuk eshte perfunduar"
            description="Plotesoni verifikimin KYC per te pasur akses te plote ne platforme."
            className="cursor-pointer transition-colors hover:opacity-90"
          />
        </Link>
      )}

      {/* Certificate Info */}
      {hasCertificate === false && (
        <Alert
          variant="info"
          icon={<Info className="h-5 w-5" />}
          title="Certifikate dixhitale"
          description="Admini do t'ju gjeneroje certifikaten pasi te verifikoheni me sukses."
        />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { href: "/dashboard/contracts/self-sign", icon: PenTool, label: "Nenshkruaj PDF", desc: "Ngarko dhe nenshkruaj vete", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { href: "/dashboard/contracts", icon: Mail, label: "Dergo per Nenshkrim", desc: "Kerko nenshkrime nga te tjeret", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
          { href: "/templates", icon: LayoutTemplate, label: "Krijo nga Template", desc: "Shabllonet e gatshme", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="group flex items-center gap-4 p-5 transition-all hover:shadow-md">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.bg} transition-colors`}>
                <action.icon className={`h-5 w-5 ${action.color}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Dokumenta Totale" value={stats?.totalDocuments ?? 0} icon={FileText} />
        <StatCard label="Ne Pritje" value={stats?.pendingSignatures ?? 0} icon={Clock} iconColor="text-yellow-600" iconBg="bg-yellow-50 dark:bg-yellow-900/20" valueColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Te Perfunduara" value={stats?.completedDocuments ?? 0} icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50 dark:bg-green-900/20" valueColor="text-green-600 dark:text-green-400" />
        <StatCard label="Timestamps" value={stats?.timestampsThisMonth ?? 0} icon={Zap} iconColor="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-900/20" valueColor="text-blue-600 dark:text-blue-400" />
      </div>

      {/* Activity + Recent Docs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktiviteti i Fundit</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState title="Nuk ka aktivitet akoma" />
            ) : (
              <div className="relative">
                <div className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />
                <div className="space-y-5">
                  {activities.map((entry) => {
                    const config = ACTION_CONFIG[entry.action] || {
                      ...DEFAULT_ACTION_CONFIG,
                      label: entry.action.replace(/_/g, " ").toLowerCase(),
                    };
                    const detail = entry.metadata
                      ? (entry.metadata as Record<string, string>).title ||
                        (entry.metadata as Record<string, string>).documentTitle ||
                        (entry.metadata as Record<string, string>).fileName ||
                        ""
                      : "";

                    const ActionIcon = config.icon;

                    return (
                      <div key={entry.id} className="relative flex gap-3 pl-1">
                        <div className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                          <ActionIcon className={`h-3.5 w-3.5 ${config.color}`} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="text-sm text-foreground">{config.label}</p>
                          {detail && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                            {relativeTime(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dokumentat e Fundit</CardTitle>
            <Button variant="link" size="sm" asChild>
              <Link href="/dashboard/contracts">
                Shiko te gjitha
                <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <div className="divide-y divide-border">
            {recentDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nuk ka dokumente akoma"
                className="py-12"
              />
            ) : (
              recentDocs.map((doc) => {
                const status = DOCUMENT_STATUS[doc.status] || DOCUMENT_STATUS.DRAFT;
                const totalSigs = doc.signatures?.length || doc._count?.signatures || 0;
                const signedCount = doc.signatures?.filter((s) => s.status === "SIGNED").length || 0;

                return (
                  <Link
                    key={doc.id}
                    href={`/dashboard/documents/${doc.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(doc.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalSigs > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {signedCount}/{totalSigs}
                        </span>
                      )}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
