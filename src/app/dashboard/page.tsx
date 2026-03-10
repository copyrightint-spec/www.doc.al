"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalDocuments: number;
  pendingSignatures: number;
  completedDocuments: number;
  timestampsThisMonth: number;
}

interface RecentDoc {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { signatures: number };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    async function load() {
      const [statsRes, docsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/documents?limit=5"),
      ]);
      const statsData = await statsRes.json();
      const docsData = await docsRes.json();
      if (statsData.success) setStats(statsData.data);
      if (docsData.success) setRecentDocs(docsData.data.documents);
    }
    load();
  }, []);

  const statusColors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-700",
    PENDING_SIGNATURE: "bg-yellow-100 text-yellow-800",
    PARTIALLY_SIGNED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    ARCHIVED: "bg-zinc-200 text-zinc-600",
  };

  const statCards = [
    { label: "Dokumenta Totale", value: stats?.totalDocuments ?? 0, color: "text-zinc-900" },
    { label: "Ne Pritje", value: stats?.pendingSignatures ?? 0, color: "text-yellow-600" },
    { label: "Te Perfunduara", value: stats?.completedDocuments ?? 0, color: "text-green-600" },
    { label: "Timestamps Kete Muaj", value: stats?.timestampsThisMonth ?? 0, color: "text-blue-600" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/documents"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            + Ngarko Dokument
          </Link>
          <Link
            href="/api/timestamp"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700"
          >
            + Krijo Timestamp
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color} dark:text-zinc-50`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Documents */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Dokumentat e Fundit</h2>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {recentDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{doc.title}</p>
                <p className="text-xs text-zinc-500">{new Date(doc.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[doc.status] || ""}`}>
                  {doc.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-zinc-400">{doc._count.signatures} nenshkrime</span>
              </div>
            </div>
          ))}
          {recentDocs.length === 0 && (
            <p className="px-6 py-12 text-center text-zinc-400">Nuk ka dokumente akoma</p>
          )}
        </div>
      </div>
    </div>
  );
}
