"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { FileText, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { DOCUMENT_STATUS } from "@/lib/constants/status";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/cn";
import {
  FileText as FileTextIcon,
  FilePen,
  Clock,
  CheckCircle,
  Archive,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileHash: string;
  fileSize: number;
  status: string;
  createdAt: string;
  deletedAt: string | null;
  owner: { id: string; name: string; email: string };
  organization: { id: string; name: string } | null;
  _count: { signatures: number; timestampEntries: number; signingRequests: number };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/documents?${params}`);
    const data = await res.json();
    if (data.success) {
      setDocuments(data.data.documents);
      setTotal(data.data.pagination.total);
      setCounts(data.data.counts);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const totalDocs = Object.values(counts).reduce((a, b) => a + b, 0);

  if (loading && documents.length === 0) {
    return <PageSpinner />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <PageHeader title="Documents Management" subtitle={`${total} documents found`} />

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={totalDocs} icon={FileTextIcon} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Draft" value={counts.DRAFT || 0} icon={FilePen} iconColor="text-muted-foreground" iconBg="bg-muted" />
        <StatCard label="Pending Signature" value={counts.PENDING_SIGNATURE || 0} icon={Clock} iconColor="text-yellow-500" iconBg="bg-yellow-900/30" />
        <StatCard label="Completed" value={counts.COMPLETED || 0} icon={CheckCircle} iconColor="text-green-500" iconBg="bg-green-900/30" />
        <StatCard label="Archived" value={counts.ARCHIVED || 0} icon={Archive} iconColor="text-muted-foreground" iconBg="bg-muted" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by title, filename, or owner..."
          className="min-w-[200px] flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_SIGNATURE">Pending Signature</option>
          <option value="PARTIALLY_SIGNED">Partially Signed</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents found" />
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signatures</TableHead>
                <TableHead>File Size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => {
                const statusCfg = DOCUMENT_STATUS[doc.status];
                return (
                  <Fragment key={doc.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        doc.deletedAt && "opacity-60"
                      )}
                      onClick={() => setExpandedRow(expandedRow === doc.id ? null : doc.id)}
                    >
                      <TableCell>
                        <p className={cn("font-medium text-foreground", doc.deletedAt && "line-through")}>
                          {doc.title}
                        </p>
                        <p className={cn("text-xs text-muted-foreground", doc.deletedAt && "line-through")}>
                          {doc.fileName}
                        </p>
                        {doc.deletedAt && (
                          <Badge variant="destructive" className="mt-0.5 text-[10px]">Deleted</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-foreground">{doc.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.owner.email}</p>
                      </TableCell>
                      <TableCell>
                        {statusCfg && <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc._count.signatures}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(doc.createdAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", expandedRow === doc.id && "rotate-180")}
                        />
                      </TableCell>
                    </TableRow>
                    {expandedRow === doc.id && (
                      <tr className="border-b border-border bg-muted/80">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">File Hash</p>
                              <p className="mt-0.5 break-all font-mono text-xs text-foreground">{doc.fileHash}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Organization</p>
                              <p className="mt-0.5 text-sm text-foreground">{doc.organization?.name || "None"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Timestamp Entries</p>
                              <p className="mt-0.5 text-sm text-foreground">{doc._count.timestampEntries}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Signing Requests</p>
                              <p className="mt-0.5 text-sm text-foreground">{doc._count.signingRequests}</p>
                            </div>
                          </div>
                          {doc.deletedAt && (
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground">Deleted At</p>
                              <p className="mt-0.5 text-sm text-red-400">
                                {new Date(doc.deletedAt).toLocaleString("en-GB")}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 20)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
