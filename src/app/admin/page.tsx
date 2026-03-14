"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, FileSignature, Mail, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import {
  Users as UsersIcon,
  Building2,
  FileText,
  PenTool,
  Clock,
  Shield,
  AlertTriangle,
  Bitcoin,
} from "lucide-react";
import { ROLE_BADGE, KYC_STATUS } from "@/lib/constants/status";
import { formatDateTime } from "@/lib/utils/date";

interface Stats {
  totalUsers: number;
  totalDocuments: number;
  totalSignatures: number;
  totalTimestamps: number;
  totalOrganizations: number;
  totalCertificates: number;
  pendingKyc: number;
  confirmedBtc: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  kycStatus: string;
  createdAt: string;
  organization: { name: string } | null;
  _count: { documents: number; signatures: number };
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

const QUICK_LINKS = [
  { href: "/admin/users", label: "Perdoruesit", desc: "Menaxho perdoruesit", icon: Users },
  { href: "/admin/contracts", label: "Kontrata", desc: "Te gjitha kontratat", icon: FileSignature },
  { href: "/admin/contacts", label: "Kontakte", desc: "Kerkesa kontakti", icon: Mail },
  { href: "/dashboard/audit-log", label: "Audit Log", desc: "Historiku i veprimeve", icon: ClipboardList },
];

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data.stats);
          setRecentUsers(data.data.recentUsers);
          setAuditLogs(data.data.recentAuditLogs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <PageSpinner />;
  }

  const statCards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers, icon: UsersIcon, iconColor: "text-blue-500", iconBg: "bg-blue-900/30" },
        { label: "Organizations", value: stats.totalOrganizations, icon: Building2, iconColor: "text-purple-500", iconBg: "bg-purple-900/30" },
        { label: "Documents", value: stats.totalDocuments, icon: FileText, iconColor: "text-green-500", iconBg: "bg-green-900/30" },
        { label: "Signatures", value: stats.totalSignatures, icon: PenTool, iconColor: "text-amber-500", iconBg: "bg-amber-900/30" },
        { label: "Timestamps", value: stats.totalTimestamps, icon: Clock, iconColor: "text-cyan-500", iconBg: "bg-cyan-900/30" },
        { label: "Certificates", value: stats.totalCertificates, icon: Shield, iconColor: "text-pink-500", iconBg: "bg-pink-900/30" },
        { label: "Pending KYC", value: stats.pendingKyc, icon: AlertTriangle, iconColor: "text-yellow-500", iconBg: "bg-yellow-900/30" },
        { label: "BTC Confirmed", value: stats.confirmedBtc, icon: Bitcoin, iconColor: "text-orange-500", iconBg: "bg-orange-900/30" },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Super Admin Panel" subtitle="System overview and management" />

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-blue-500/50 hover:bg-muted"
          >
            <link.icon className="h-6 w-6 text-blue-500" strokeWidth={1.5} />
            <p className="mt-3 font-semibold text-foreground">{link.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            iconColor={s.iconColor}
            iconBg={s.iconBg}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentUsers.map((u) => {
                const roleCfg = ROLE_BADGE[u.role];
                const kycCfg = KYC_STATUS[u.kycStatus];
                return (
                  <div key={u.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.organization && (
                        <p className="text-xs text-muted-foreground">{u.organization.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {roleCfg && <Badge variant={roleCfg.variant}>{roleCfg.label}</Badge>}
                      {kycCfg && <Badge variant={kycCfg.variant}>{kycCfg.label}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto p-0">
            <div className="divide-y divide-border">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="font-mono">
                      {log.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{log.user?.name || "System"}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>{log.entityType}</span>
                    {log.ipAddress && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <span className="font-mono">{log.ipAddress}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
