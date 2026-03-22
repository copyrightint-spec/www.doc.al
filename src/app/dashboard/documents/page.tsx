"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Upload, Eye, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { DOCUMENT_STATUS, SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";

interface Signature {
  id: string;
  status: string;
  signerName: string;
  signerEmail: string;
}

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileHash: string;
  fileUrl: string;
  fileSize: number;
  status: string;
  createdAt: string;
  signatures: Signature[];
  _count: { signatures: number };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const FILTER_TABS = [
  { value: "", label: "Te gjitha" },
  { value: "COMPLETED", label: "Perfunduara" },
  { value: "PENDING_SIGNATURE", label: "Ne Pritje" },
  { value: "DRAFT", label: "Draft" },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    if (data.success) {
      setDocuments(data.data.documents);
      setTotal(data.data.pagination.total);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(".pdf", ""));

    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchDocs();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gabim ne ngarkim");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dokumentat e Mia"
        subtitle={`${total} dokumente gjithsej`}
        actions={
          <label>
            <Button variant="primary" disabled={uploading} asChild>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {uploading ? "Duke ngarkuar..." : "Ngarko PDF"}
              </span>
            </Button>
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        }
      />

      {uploadError && (
        <Alert variant="destructive" title={uploadError} />
      )}

      {/* Filter Tabs + Search */}
      <div className="space-y-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kerko dokumenta..."
          className="w-full"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "primary" : "ghost"}
              size="sm"
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={cn(
                "flex-shrink-0 min-h-[44px]",
                statusFilter !== tab.value && "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="ml-4 flex gap-2">
                  <Skeleton className="h-8 w-16 rounded-xl" />
                </div>
              </div>
              <Skeleton className="mt-3 h-8 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = DOCUMENT_STATUS[doc.status] || DOCUMENT_STATUS.DRAFT;
            return (
              <Card key={doc.id} className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <h3 className="font-medium text-foreground text-base sm:text-sm">{doc.title}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
                      <span className="truncate max-w-[180px] sm:max-w-none">{doc.fileName}</span>
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                      <span>{doc._count.signatures} nenshkrime</span>
                    </div>

                    {doc.signatures.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {doc.signatures.map((sig) => {
                          const sigStatus = SIGNATURE_STATUS[sig.status] || SIGNATURE_STATUS.PENDING;
                          return (
                            <Badge key={sig.id} variant={sigStatus.variant}>
                              {sig.signerName} - {sigStatus.label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    {!doc.fileUrl && (
                      <div className="mt-2">
                        <Badge variant="default">
                          <Lock className="h-3 w-3" />
                          File fshihet per privatesine
                        </Badge>
                      </div>
                    )}
                  </div>

                  <Button variant="secondary" size="sm" asChild className="w-full sm:w-auto min-h-[44px] flex-shrink-0">
                    <Link href={`/dashboard/documents/${doc.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Shiko
                    </Link>
                  </Button>
                </div>

                <div className="mt-3 rounded-lg bg-muted px-3 py-2 overflow-hidden">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">SHA-256: </span>
                  <code className="font-mono text-xs text-muted-foreground break-all sm:break-normal">{doc.fileHash}</code>
                </div>
              </Card>
            );
          })}

          {documents.length === 0 && !loading && (
            <EmptyState
              icon={FileText}
              title="Nuk keni dokumente akoma"
              description="Ngarkoni nje PDF per te filluar"
            />
          )}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Faqja {page} nga {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="min-h-[44px] min-w-[44px]">Para</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)} className="min-h-[44px] min-w-[44px]">Pas</Button>
          </div>
        </div>
      )}
    </div>
  );
}
