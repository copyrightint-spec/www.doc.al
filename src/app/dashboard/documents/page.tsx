"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Upload, Send, Eye, Lock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { DOCUMENT_STATUS, SIGNATURE_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";

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
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Dokumentat"
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Kerko dokumenta..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
        >
          <option value="">Te gjitha statuset</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_SIGNATURE">Ne pritje</option>
          <option value="PARTIALLY_SIGNED">Pjeserisht</option>
          <option value="COMPLETED">Perfunduar</option>
          <option value="ARCHIVED">Arkivuar</option>
        </select>
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
              <Card key={doc.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-foreground">{doc.title}</h3>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{doc.fileName}</span>
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

                  <div className="ml-4 flex gap-2">
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Shiko
                      </Link>
                    </Button>
                    {doc.status === "DRAFT" && (
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/dashboard/documents/${doc.id}/send`}>
                          <Send className="h-3.5 w-3.5" />
                          Dergo per nenshkrim
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-muted px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">SHA-256: </span>
                  <code className="font-mono text-xs text-muted-foreground">{doc.fileHash}</code>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Faqja {page} nga {Math.ceil(total / 20)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Para</Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 20)}>Pas</Button>
          </div>
        </div>
      )}
    </div>
  );
}
