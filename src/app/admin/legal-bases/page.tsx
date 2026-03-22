"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { DocumentEditor } from "@/components/ui/document-editor";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Scale,
  ToggleLeft,
  ToggleRight,
  Search,
} from "lucide-react";

interface LegalBasis {
  id: string;
  title: string;
  lawReference: string;
  description: string;
  suggestedTerms: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "", label: "Te gjitha" },
  { value: "employment", label: "Pune" },
  { value: "general", label: "Civile" },
  { value: "rental", label: "Qira" },
  { value: "commercial", label: "Tregtare" },
  { value: "data_protection", label: "Te Dhena" },
  { value: "digital", label: "Dixhitale" },
];

export default function AdminLegalBasesPage() {
  const [legalBases, setLegalBases] = useState<LegalBasis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formLawRef, setFormLawRef] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSuggestedTerms, setFormSuggestedTerms] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formSortOrder, setFormSortOrder] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/admin/legal-bases?${params}`);
      const json = await res.json();
      if (json.success) {
        setLegalBases(json.data.legalBases);
        setTotal(json.data.pagination.total);
        setTotalPages(json.data.pagination.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setFormTitle("");
    setFormLawRef("");
    setFormDescription("");
    setFormSuggestedTerms("");
    setFormCategory("general");
    setFormSortOrder(0);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(lb: LegalBasis) {
    setFormTitle(lb.title);
    setFormLawRef(lb.lawReference);
    setFormDescription(lb.description);
    setFormSuggestedTerms(lb.suggestedTerms);
    setFormCategory(lb.category);
    setFormSortOrder(lb.sortOrder);
    setEditingId(lb.id);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formTitle || !formLawRef || !formDescription || !formSuggestedTerms) return;
    setSaving(true);
    try {
      const body = {
        title: formTitle,
        lawReference: formLawRef,
        description: formDescription,
        suggestedTerms: formSuggestedTerms,
        category: formCategory,
        sortOrder: formSortOrder,
      };

      if (editingId) {
        await fetch(`/api/admin/legal-bases/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/admin/legal-bases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setShowModal(false);
      resetForm();
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await fetch(`/api/admin/legal-bases/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Jeni i sigurt qe doni te fshini kete baze ligjore?")) return;
    const res = await fetch(`/api/admin/legal-bases/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Gabim gjate fshirjes");
      return;
    }
    fetchData();
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bazat Ligjore"
        subtitle="Menaxho bazat ligjore per kontratat"
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Shto Baze Ligjore
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Kerko..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategoryFilter(cat.value); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat.value
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {legalBases.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Asnje baze ligjore"
          description="Shtoni bazen e pare ligjore per te filluar"
          action={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Shto Baze Ligjore
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {legalBases.map((lb) => (
            <Card key={lb.id} className={!lb.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{lb.title}</h3>
                      <Badge variant={lb.isActive ? "success" : "default"}>
                        {lb.isActive ? "Aktive" : "Joaktive"}
                      </Badge>
                      <Badge>{lb.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{lb.lawReference}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{lb.description}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(lb.id, lb.isActive)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={lb.isActive ? "Caktivizo" : "Aktivizo"}
                    >
                      {lb.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(lb)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edito"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lb.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                      title="Fshi"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === lb.id ? null : lb.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Shfaq termat"
                    >
                      {expandedId === lb.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedId === lb.id && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      Termat e Sugjeruara
                    </p>
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert text-sm"
                      dangerouslySetInnerHTML={{ __html: lb.suggestedTerms.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "") }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Faqja {page} nga {totalPages} ({total} gjithsej)
          </p>
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Para
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const maxVisible = 7;
              let start = Math.max(1, page - Math.floor(maxVisible / 2));
              const end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Pas
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edito Bazen Ligjore" : "Shto Baze te Re Ligjore"}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Titulli
                  </label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="p.sh. Kodi i Punes"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Referenca Ligjore
                  </label>
                  <Input
                    value={formLawRef}
                    onChange={(e) => setFormLawRef(e.target.value)}
                    placeholder="p.sh. Ligji Nr. 7961, dt. 12.07.1995"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Kategoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {CATEGORIES.filter((c) => c.value).map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Rendi (Sort Order)
                  </label>
                  <Input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pershkrimi
                </label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Pershkrimi i bazes ligjore..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Termat e Sugjeruara (HTML)
                </label>
                <DocumentEditor
                  content={formSuggestedTerms}
                  onChange={setFormSuggestedTerms}
                  className="min-h-[300px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Anulo
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !formTitle || !formLawRef || !formDescription || !formSuggestedTerms}
              >
                {saving ? "Duke ruajtur..." : editingId ? "Ruaj Ndryshimet" : "Krijo"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
