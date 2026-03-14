"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, FileSignature } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface Signer {
  id: string;
  signerName: string;
  signerEmail: string;
  status: string;
  signedAt: string | null;
  order: number;
  viewedAt: string | null;
  verificationSentAt: string | null;
}

interface Contract {
  id: string;
  status: string;
  recipientEmails: string[];
  message: string | null;
  companyName: string | null;
  brandColor: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  document: {
    id: string;
    title: string;
    fileName: string;
    fileSize: number;
    status: string;
    owner: { id: string; name: string; email: string };
    signatures: Signer[];
  };
  template: { id: string; name: string; category: string | null } | null;
  requester: { id: string; name: string; email: string; organization: { name: string } | null };
}

const CONTRACT_STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" }> = {
  PENDING: { label: "Ne pritje", variant: "warning" },
  IN_PROGRESS: { label: "Ne progres", variant: "info" },
  COMPLETED: { label: "Perfunduar", variant: "success" },
  CANCELLED: { label: "Anulluar", variant: "destructive" },
  EXPIRED: { label: "Skaduar", variant: "default" },
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  "": "Te gjitha",
  PENDING: "Ne pritje",
  IN_PROGRESS: "Ne progres",
  COMPLETED: "Perfunduar",
  CANCELLED: "Anulluar",
  EXPIRED: "Skaduar",
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: "30" });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/contracts?${params}`);
    const data = await res.json();
    if (data.success) {
      setContracts(data.data.contracts);
      setTotal(data.data.pagination.total);
    }
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Admin: Kontrata" subtitle={`${total} kontrata gjithsej ne sistem`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Kerko per titull, emer, email, kompani..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5">
          {["", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "primary" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {STATUS_FILTER_LABELS[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Contracts List */}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => {
            const isExpanded = expandedId === c.id;
            const signedCount = c.document.signatures.filter((s) => s.status === "SIGNED").length;
            const totalSigners = c.document.signatures.length;
            const statusCfg = CONTRACT_STATUS_BADGE[c.status];

            return (
              <Card key={c.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-medium text-foreground">{c.document.title}</h3>
                      {statusCfg && <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>}
                      {c.companyName && (
                        <Badge variant="purple">API: {c.companyName}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                      <span>
                        Gjeneruar nga: <strong>{c.requester.name}</strong> ({c.requester.email})
                        {c.requester.organization && ` - ${c.requester.organization.name}`}
                      </span>
                      <span>Per: <strong>{c.document.signatures.map((s) => s.signerName).join(", ")}</strong></span>
                      <span>{formatDateTime(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{signedCount}/{totalSigners}</span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="border-t border-border p-4">
                    {c.message && (
                      <div className="mb-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        <strong>Mesazh:</strong> {c.message}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Nenshkruesi</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Pare</TableHead>
                            <TableHead>OTP Derguar</TableHead>
                            <TableHead>Nenshkruar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {c.document.signatures.map((sig, i) => {
                            const sigCfg = SIGNATURE_STATUS[sig.status];
                            return (
                              <TableRow key={sig.id}>
                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="font-medium text-foreground">{sig.signerName}</TableCell>
                                <TableCell className="text-muted-foreground">{sig.signerEmail}</TableCell>
                                <TableCell>
                                  {sigCfg && <Badge variant={sigCfg.variant}>{sigCfg.label}</Badge>}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{sig.viewedAt ? formatDateTime(sig.viewedAt) : "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{sig.verificationSentAt ? formatDateTime(sig.verificationSentAt) : "-"}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{sig.signedAt ? formatDateTime(sig.signedAt) : "-"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Pronar dokumenti:</span>
                        <p className="font-medium text-foreground">{c.document.owner.name} ({c.document.owner.email})</p>
                      </div>
                      {c.template && (
                        <div>
                          <span className="text-muted-foreground">Template:</span>
                          <p className="font-medium text-foreground">{c.template.name}</p>
                        </div>
                      )}
                      {c.expiresAt && (
                        <div>
                          <span className="text-muted-foreground">Skadon:</span>
                          <p className="font-medium text-foreground">{formatDateTime(c.expiresAt)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {contracts.length === 0 && (
            <EmptyState icon={FileSignature} title="Nuk ka kontrata" />
          )}
        </div>
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Faqja {page} nga {Math.ceil(total / 30)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Para</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 30)}>Pas</Button>
          </div>
        </div>
      )}
    </div>
  );
}
