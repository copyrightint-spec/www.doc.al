"use client";

import { useState, useEffect } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface ContactRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  position: string | null;
  employees: string;
  industry: string;
  documentsPerMonth: string;
  needsCertificateAuthority: boolean;
  needsApiIntegration: boolean;
  needsWhiteLabel: boolean;
  needsCustomTemplates: boolean;
  currentSolution: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  NEW: { label: "NEW", variant: "info" },
  CONTACTED: { label: "CONTACTED", variant: "warning" },
  IN_PROGRESS: { label: "IN_PROGRESS", variant: "purple" },
  CLOSED: { label: "CLOSED", variant: "success" },
  REJECTED: { label: "REJECTED", variant: "destructive" },
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchContacts() {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/contacts?${params}`);
    const data = await res.json();
    if (data.success) setContacts(data.data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchContacts();
  }

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Organization Requests" subtitle={`${contacts.length} requests`} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["", "NEW", "CONTACTED", "IN_PROGRESS", "CLOSED", "REJECTED"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s || "All"}
          </Button>
        ))}
      </div>

      {/* Contact Requests */}
      {contacts.length === 0 ? (
        <EmptyState icon={Mail} title="Nuk ka kerkesa akoma" />
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => {
            const statusCfg = STATUS_BADGE[c.status];
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div
                  className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-muted/50"
                  onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                >
                  <div className="flex items-center gap-4">
                    {statusCfg && <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>}
                    <div>
                      <p className="font-medium text-foreground">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground">{c.contactName} - {c.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c.industry}</span>
                    <span>{c.employees} punonjes</span>
                    <span>{formatDate(c.createdAt)}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", expandedId === c.id && "rotate-180")}
                    />
                  </div>
                </div>

                {expandedId === c.id && (
                  <div className="border-t border-border px-6 py-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Kontakt</p>
                        <p className="mt-1 text-sm text-foreground">{c.contactName}</p>
                        {c.position && <p className="text-xs text-muted-foreground">{c.position}</p>}
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Detaje</p>
                        <p className="mt-1 text-sm text-foreground">Dok/muaj: {c.documentsPerMonth}</p>
                        {c.currentSolution && <p className="text-xs text-muted-foreground">Aktualisht: {c.currentSolution}</p>}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Nevoja</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.needsCertificateAuthority && <Badge variant="default">CA</Badge>}
                          {c.needsApiIntegration && <Badge variant="default">API</Badge>}
                          {c.needsWhiteLabel && <Badge variant="default">White-label</Badge>}
                          {c.needsCustomTemplates && <Badge variant="default">Templates</Badge>}
                        </div>
                      </div>
                    </div>
                    {c.message && (
                      <div className="mt-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mesazh</p>
                        <p className="mt-1 text-sm text-foreground">{c.message}</p>
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      {["NEW", "CONTACTED", "IN_PROGRESS", "CLOSED", "REJECTED"].map((s) => (
                        <Button
                          key={s}
                          variant={c.status === s ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => updateStatus(c.id, s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
