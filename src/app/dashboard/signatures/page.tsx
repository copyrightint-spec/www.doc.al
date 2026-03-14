"use client";

import { useState, useEffect } from "react";
import { PenTool, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui/stat-card";
import { SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";

interface Signature {
  id: string;
  status: string;
  signerName: string;
  signerEmail: string;
  signedAt: string | null;
  token: string;
  createdAt: string;
  document: { id: string; title: string; fileName: string; status: string };
  certificate: { id: string; serialNumber: string; subjectDN: string } | null;
}

export default function SignaturesPage() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/signatures?${params}`);
      const data = await res.json();
      if (data.success) setSignatures(data.data);
      setLoading(false);
    }
    load();
  }, [statusFilter]);

  const pending = signatures.filter((s) => s.status === "PENDING").length;
  const signed = signatures.filter((s) => s.status === "SIGNED").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Nenshkrimet e Mia"
        subtitle={`${signatures.length} gjithsej | ${pending} ne pritje | ${signed} te nenshkruara`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Gjithsej" value={signatures.length} icon={FileText} />
        <StatCard label="Ne Pritje" value={pending} icon={PenTool} iconColor="text-yellow-600" iconBg="bg-yellow-50 dark:bg-yellow-900/20" valueColor="text-yellow-600 dark:text-yellow-400" />
        <StatCard label="Nenshkruar" value={signed} icon={PenTool} iconColor="text-green-600" iconBg="bg-green-50 dark:bg-green-900/20" valueColor="text-green-600 dark:text-green-400" />
        <StatCard label="Refuzuar/Skaduar" value={signatures.filter((s) => ["REJECTED", "EXPIRED"].includes(s.status)).length} icon={PenTool} iconColor="text-red-600" iconBg="bg-red-50 dark:bg-red-900/20" valueColor="text-red-600 dark:text-red-400" />
      </div>

      {/* Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
      >
        <option value="">Te gjitha</option>
        <option value="PENDING">Ne pritje</option>
        <option value="SIGNED">Nenshkruar</option>
        <option value="REJECTED">Refuzuar</option>
        <option value="EXPIRED">Skaduar</option>
      </select>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3">
          {signatures.map((sig) => {
            const status = SIGNATURE_STATUS[sig.status] || SIGNATURE_STATUS.PENDING;
            return (
              <Card key={sig.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-foreground">{sig.document.title}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{sig.document.fileName}</span>
                      <span>Si: {sig.signerName} ({sig.signerEmail})</span>
                      {sig.signedAt && <span>Nenshkruar: {formatDate(sig.signedAt)}</span>}
                      <span>Krijuar: {formatDate(sig.createdAt)}</span>
                    </div>
                    {sig.certificate && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Certifikate: {sig.certificate.serialNumber} ({sig.certificate.subjectDN})
                      </div>
                    )}
                  </div>
                  {sig.status === "PENDING" && (
                    <Button size="sm" asChild>
                      <a href={`/sign/${sig.token}`}>Nenshkruaj</a>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {signatures.length === 0 && (
            <EmptyState
              icon={PenTool}
              title="Nuk keni nenshkrime akoma"
            />
          )}
        </div>
      )}
    </div>
  );
}
