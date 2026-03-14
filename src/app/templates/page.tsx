"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Trash2,
  FileText,
  Users,
  BarChart3,
  LayoutTemplate,
  Package,
  MessageSquare,
  Shield,
  Briefcase,
  Gavel,
  Scale,
  CreditCard,
  UserCircle,
  File,
  PenTool,
  AlignLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  Stamp,
  Type,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/* -- Types -- */

interface TemplateField {
  type: string;
  label: string;
  required: boolean;
  position: { page: number; x: number; y: number; width: number; height: number };
  assignedTo?: string;
  options?: string[];
}

interface SignerRole {
  id: string;
  name: string;
  color: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  fields: TemplateField[];
  signerRoles: SignerRole[] | null;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  user: { name: string };
}

/* -- Constants -- */

const CATEGORIES = [
  { value: "", label: "Te gjitha" },
  { value: "kontrate", label: "Kontrata" },
  { value: "marreveshje", label: "Marreveshje" },
  { value: "autorizim", label: "Autorizime" },
  { value: "prokure", label: "Prokura" },
  { value: "vendim", label: "Vendime" },
  { value: "akt", label: "Akte Noteriale" },
  { value: "bankare", label: "Bankare" },
  { value: "punesim", label: "Punesim" },
  { value: "tjeter", label: "Te Tjera" },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  kontrate: FileText,
  marreveshje: MessageSquare,
  autorizim: Shield,
  prokure: Briefcase,
  vendim: Gavel,
  akt: Scale,
  bankare: CreditCard,
  punesim: UserCircle,
  tjeter: File,
};

const FIELD_TYPES = [
  { value: "signature", label: "Nenshkrim", icon: PenTool, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "stamp", label: "Vule", icon: Stamp, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "text", label: "Tekst", icon: AlignLeft, color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "date", label: "Date", icon: Calendar, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "checkbox", label: "Checkbox", icon: CheckCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  { value: "initials", label: "Inicialet", icon: Type, color: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300" },
];

const SIGNER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777"];

const HEADER_COLORS = [
  "from-red-500 to-red-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-violet-500 to-violet-600",
  "from-pink-500 to-pink-600",
  "from-cyan-500 to-cyan-600",
  "from-indigo-500 to-indigo-600",
];

function getHeaderColor(index: number) {
  return HEADER_COLORS[index % HEADER_COLORS.length];
}

function getCatIcon(category?: string | null): React.ElementType {
  return CATEGORY_ICONS[category || "tjeter"] || File;
}

/* -- Document preview mockup on card -- */

function DocPreview({ headerColor, signerCount, category }: { headerColor: string; signerCount: number; category?: string | null }) {
  const CatIcon = getCatIcon(category);
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-slate-100 dark:bg-slate-800">
      <div className={`h-10 w-full bg-gradient-to-r ${headerColor}`} />
      <div className="space-y-2 px-5 pt-4">
        <div className="h-2 w-3/4 rounded bg-slate-300/70 dark:bg-slate-600/60" />
        <div className="h-2 w-full rounded bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-2 w-5/6 rounded bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="h-2 w-2/3 rounded bg-slate-200/80 dark:bg-slate-700/50" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: signerCount }).map((_, i) => (
            <div key={i} className="h-5 w-14 rounded bg-slate-300/50 dark:bg-slate-600/40" />
          ))}
        </div>
      </div>
      <div className="absolute right-3 top-12 rounded-xl bg-white/80 p-2 shadow-sm dark:bg-slate-900/80">
        <CatIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
    </div>
  );
}

/* -- Detail Modal -- */

function DetailModal({
  template,
  headerColor,
  onClose,
  onUse,
}: {
  template: Template;
  headerColor: string;
  onClose: () => void;
  onUse: () => void;
}) {
  const name = template.name;
  const description = template.description;
  const category = template.category;
  const signers = (template.signerRoles || []).map((r) => ({ name: r.name, color: r.color }));
  const fields = aggregateFields(template.fields);
  const catLabel = CATEGORIES.find((c) => c.value === category)?.label || category || "Te tjera";
  const CatIcon = getCatIcon(category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <Card
        className="relative w-full max-w-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 bg-white/80 shadow hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Colored header */}
        <div className={`h-24 bg-gradient-to-r ${headerColor}`} />

        <div className="px-6 pb-6">
          {/* Name + badge */}
          <div className="-mt-6 flex items-end gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-lg">
              <CatIcon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
              <Badge className="mt-1">{catLabel}</Badge>
            </div>
          </div>

          {description && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}

          {/* Signers */}
          <div className="mt-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rolet e Nenshkruesve</h3>
            <div className="flex flex-wrap gap-2">
              {signers.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium" style={{ backgroundColor: s.color + "15", color: s.color }}>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="mt-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fushat e Dokumentit</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {fields.map((f, i) => {
                const ft = FIELD_TYPES.find((t) => t.value === f.type);
                const Icon = ft?.icon || File;
                return (
                  <div key={i} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium ${ft?.color || "bg-slate-100 text-slate-600"}`}>
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span>{f.count}x {ft?.label || f.type}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simplified visual preview */}
          <div className="mt-6">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paraqitja Vizuale</h3>
            <div className="rounded-xl border border-border bg-muted p-4">
              <div className="space-y-2">
                <div className="h-2 w-1/2 rounded bg-slate-300 dark:bg-slate-600" />
                <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-1.5 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-1.5 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-4 flex flex-wrap gap-3">
                  {signers.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-8 w-20 rounded-xl border-2 border-dashed" style={{ borderColor: s.color + "80" }} />
                      <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action */}
          <Button onClick={onUse} className="mt-6 w-full">
            Perdor Template
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* Helper to aggregate TemplateField[] into { type, count }[] */
function aggregateFields(fields: TemplateField[]): { type: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const f of fields) {
    map[f.type] = (map[f.type] || 0) + 1;
  }
  return Object.entries(map).map(([type, count]) => ({ type, count }));
}

/* -- Main Page -- */

export default function TemplatesPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"ready" | "mine">("ready");

  const [categoryFilter, setCategoryFilter] = useState("");
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [detailHeaderColor, setDetailHeaderColor] = useState(HEADER_COLORS[0]);
  const [publicTemplates, setPublicTemplates] = useState<Template[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("kontrate");
  const [isPublic, setIsPublic] = useState(false);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [signerRoles, setSignerRoles] = useState<SignerRole[]>([
    { id: "1", name: "Pala e Pare", color: SIGNER_COLORS[0] },
    { id: "2", name: "Pala e Dyte", color: SIGNER_COLORS[1] },
  ]);
  const [creating, setCreating] = useState(false);

  const fetchPublicTemplates = useCallback(async () => {
    setLoadingPublic(true);
    try {
      const res = await fetch("/api/templates?public=true");
      const data = await res.json();
      if (data.success) setPublicTemplates(data.data);
    } catch {
      /* ignore */
    }
    setLoadingPublic(false);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "ready") fetchPublicTemplates();
    if (activeTab === "mine") fetchTemplates();
  }, [activeTab, fetchPublicTemplates, fetchTemplates]);

  function addField(type: string) {
    const ft = FIELD_TYPES.find((f) => f.value === type);
    setFields([
      ...fields,
      {
        type,
        label: ft?.label || type,
        required: true,
        position: { page: 0, x: 50 + fields.length * 20, y: 600, width: type === "signature" ? 250 : type === "stamp" ? 100 : 200, height: type === "signature" ? 80 : 30 },
        assignedTo: signerRoles[0]?.id || "",
      },
    ]);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField(index: number, updates: Partial<TemplateField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function addSignerRole() {
    const nextColor = SIGNER_COLORS[signerRoles.length % SIGNER_COLORS.length];
    setSignerRoles([
      ...signerRoles,
      { id: String(Date.now()), name: `Nenshkrues ${signerRoles.length + 1}`, color: nextColor },
    ]);
  }

  function removeSignerRole(id: string) {
    if (signerRoles.length <= 1) return;
    setSignerRoles(signerRoles.filter((r) => r.id !== id));
    setFields(fields.map((f) => (f.assignedTo === id ? { ...f, assignedTo: signerRoles[0]?.id } : f)));
  }

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("kontrate");
    setIsPublic(false);
    setFields([]);
    setSignerRoles([
      { id: "1", name: "Pala e Pare", color: SIGNER_COLORS[0] },
      { id: "2", name: "Pala e Dyte", color: SIGNER_COLORS[1] },
    ]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (fields.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, fields, signerRoles, isPublic }),
      });
      if (res.ok) {
        setShowCreate(false);
        resetForm();
        fetchTemplates();
      }
    } catch {
      /* ignore */
    }
    setCreating(false);
  }

  function handleUseTemplate(id: string) {
    router.push(`/dashboard/contracts/from-template/${id}`);
  }

  const filteredFeatured = categoryFilter
    ? publicTemplates.filter((t) => t.category === categoryFilter)
    : publicTemplates;

  const filteredMine = templates;

  /* -- RENDER -- */

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-card border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-50 via-transparent to-transparent opacity-60 dark:from-red-950/30 dark:opacity-40" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Zgjidhni nje Template
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
              Perdorni shabllone te gatshme per dokumentet tuaja ligjore, ose krijoni template tuajin.
              Secili template permban fushat, rolet e nenshkruesve, dhe pozicionimin e elementeve.
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button
                onClick={() => setActiveTab("ready")}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "ready"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4" strokeWidth={2} />
                  Shabllonet Gati
                </span>
              </button>
              <button
                onClick={() => setActiveTab("mine")}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
                  activeTab === "mine"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" strokeWidth={2} />
                  Te Miat
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Ready Templates Tab */}
        {activeTab === "ready" && (
          <>
            {/* Category pill filters */}
            <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategoryFilter(c.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    categoryFilter === c.value
                      ? "bg-primary text-white shadow-sm"
                      : "bg-card text-muted-foreground hover:bg-muted border border-border"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {loadingPublic ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredFeatured.map((t, idx) => {
                    const catLabel = CATEGORIES.find((c) => c.value === t.category)?.label || t.category;
                    const signers = (t.signerRoles || []).map((r) => ({ name: r.name, color: r.color }));
                    const fieldCount = Array.isArray(t.fields) ? t.fields.length : 0;
                    const hColor = getHeaderColor(idx);
                    return (
                      <Card
                        key={t.id}
                        className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/30"
                      >
                        <DocPreview headerColor={hColor} signerCount={signers.length} category={t.category} />

                        <div className="p-5">
                          <Badge>{catLabel}</Badge>

                          <h3 className="mt-2 text-base font-bold text-foreground">{t.name}</h3>
                          <p className="mt-1 text-sm leading-snug text-muted-foreground line-clamp-2">
                            {t.description}
                          </p>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center -space-x-1.5">
                              {signers.map((s, i) => (
                                <div
                                  key={i}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white"
                                  style={{ backgroundColor: s.color }}
                                  title={s.name}
                                >
                                  {s.name[0]}
                                </div>
                              ))}
                              <span className="pl-2.5 text-xs text-muted-foreground">
                                {signers.length} nenshkrues
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">{fieldCount} fusha</span>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button
                              onClick={() => handleUseTemplate(t.id)}
                              className="flex-1"
                              size="sm"
                            >
                              Perdor Kete Template
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => { setDetailTemplate(t); setDetailHeaderColor(hColor); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {filteredFeatured.length === 0 && (
                  <EmptyState
                    icon={LayoutTemplate}
                    title="Nuk u gjet asnje template ne kete kategori"
                    className="rounded-2xl border-2 border-dashed border-border py-16"
                  />
                )}
              </>
            )}
          </>
        )}

        {/* My Templates Tab */}
        {activeTab === "mine" && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Template-t e Mia</h2>
                <p className="text-sm text-muted-foreground">{templates.length} template gjithsej</p>
              </div>
              <Button asChild>
                <Link href="/templates/editor">
                  <Plus className="h-4 w-4" />
                  Krijo Template
                </Link>
              </Button>
            </div>

            {/* Create Template Form */}
            {showCreate && (
              <form onSubmit={handleCreate} className="mb-8">
                <Card className="overflow-hidden">
                  <div className="border-b border-border bg-muted px-6 py-4">
                    <h2 className="text-lg font-semibold text-foreground">Krijo Template te Ri</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Konfiguro fushat e nenshkrimit dhe cakto rolet per secilin nenshkrues</p>
                  </div>

                  <CardContent className="space-y-6 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Emri i Template</label>
                        <Input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="p.sh. Kontrate Punesimi"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Kategoria</label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
                        >
                          {CATEGORIES.filter((c) => c.value).map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Pershkrimi</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Pershkruani template per cfare perdoret..."
                        rows={2}
                      />
                    </div>

                    {/* Signer Roles */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Rolet e Nenshkruesve</label>
                        <Button variant="link" size="sm" type="button" onClick={addSignerRole}>
                          + Shto rol
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {signerRoles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center gap-2 rounded-xl border px-3 py-2"
                            style={{ borderColor: role.color + "40", backgroundColor: role.color + "08" }}
                          >
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
                            <input
                              type="text"
                              value={role.name}
                              onChange={(e) =>
                                setSignerRoles(signerRoles.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)))
                              }
                              className="w-32 border-none bg-transparent text-sm font-medium focus:outline-none text-foreground"
                            />
                            {signerRoles.length > 1 && (
                              <button type="button" onClick={() => removeSignerRole(role.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fields */}
                    <div>
                      <label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Fushat e Dokumentit ({fields.length})
                      </label>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {FIELD_TYPES.map((ft) => {
                          const Icon = ft.icon;
                          return (
                            <button
                              key={ft.value}
                              type="button"
                              onClick={() => addField(ft.value)}
                              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:opacity-80 ${ft.color}`}
                            >
                              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {ft.label}
                            </button>
                          );
                        })}
                      </div>

                      {fields.length > 0 ? (
                        <div className="space-y-2">
                          {fields.map((field, i) => {
                            const ft = FIELD_TYPES.find((t) => t.value === field.type);
                            const assignedRole = signerRoles.find((r) => r.id === field.assignedTo);
                            const Icon = ft?.icon || File;
                            return (
                              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-muted p-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${ft?.color || "bg-slate-100"}`}>
                                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(i, { label: e.target.value })}
                                    className="w-36 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground"
                                  />
                                  <select
                                    value={field.assignedTo || ""}
                                    onChange={(e) => updateField(i, { assignedTo: e.target.value })}
                                    className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground"
                                  >
                                    {signerRoles.map((r) => (
                                      <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                  </select>
                                  {assignedRole && (
                                    <div className="flex items-center gap-1">
                                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: assignedRole.color }} />
                                      <span className="text-[10px] font-medium" style={{ color: assignedRole.color }}>{assignedRole.name}</span>
                                    </div>
                                  )}
                                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(e) => updateField(i, { required: e.target.checked })}
                                      className="h-3 w-3 rounded accent-primary"
                                    />
                                    Detyrues
                                  </label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  type="button"
                                  onClick={() => removeField(i)}
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          icon={Plus}
                          title="Shtoni fusha duke klikuar butonat me lart"
                          className="rounded-xl border-2 border-dashed border-border py-8"
                        />
                      )}
                    </div>

                    {/* Public toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
                        onClick={() => setIsPublic(!isPublic)}
                      >
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-sm text-foreground">Template publik (te dukshem per te gjithe)</span>
                    </label>
                  </CardContent>

                  <div className="flex items-center justify-end gap-3 border-t border-border bg-muted px-6 py-4">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => { setShowCreate(false); resetForm(); }}
                    >
                      Anulo
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating || !name || fields.length === 0}
                    >
                      {creating ? "Duke krijuar..." : "Krijo Template"}
                    </Button>
                  </div>
                </Card>
              </form>
            )}

            {/* My templates grid */}
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredMine.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMine.map((t) => {
                  const CatIcon = getCatIcon(t.category);
                  const signerCount = Array.isArray(t.signerRoles) ? t.signerRoles.length : 0;
                  const fieldCount = Array.isArray(t.fields) ? t.fields.length : 0;
                  return (
                    <Card
                      key={t.id}
                      className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/30"
                    >
                      {/* Mini preview */}
                      <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow-sm">
                            <CatIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            {t.isPublic && <Badge variant="success">Publik</Badge>}
                            {t.category && (
                              <Badge>{CATEGORIES.find((c) => c.value === t.category)?.label}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-foreground">{t.name}</h3>
                        {t.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.description}</p>}

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {fieldCount} fusha
                          </span>
                          {signerCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {signerCount} pale
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            {t.usageCount}x
                          </span>
                        </div>

                        {/* Signer roles */}
                        {Array.isArray(t.signerRoles) && t.signerRoles.length > 0 && (
                          <div className="mt-3 flex -space-x-1">
                            {(t.signerRoles as SignerRole[]).map((role) => (
                              <div
                                key={role.id}
                                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[9px] font-bold text-white"
                                style={{ backgroundColor: role.color }}
                                title={role.name}
                              >
                                {role.name[0]}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex gap-2">
                          <Button size="sm" className="flex-1" asChild>
                            <Link href={`/dashboard/contracts/from-template/${t.id}`}>
                              Perdor
                            </Link>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/templates/${t.id}/generate-pdf`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ fieldValues: {} }),
                                });
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${t.name.replace(/[^a-zA-Z0-9-_]/g, "_")}_draft.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }
                              } catch { /* silent */ }
                            }}
                            title="Shkarko PDF Draft"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setDetailTemplate(t); setDetailHeaderColor(HEADER_COLORS[0]); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : !showCreate ? (
              <EmptyState
                icon={LayoutTemplate}
                title="Nuk keni template akoma."
                className="rounded-2xl border-2 border-dashed border-border py-16"
                action={
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" />
                    Krijoni nje te ri
                  </Button>
                }
              />
            ) : null}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {detailTemplate && (
        <DetailModal
          template={detailTemplate}
          headerColor={detailHeaderColor}
          onClose={() => setDetailTemplate(null)}
          onUse={() => {
            const id = detailTemplate.id;
            setDetailTemplate(null);
            handleUseTemplate(id);
          }}
        />
      )}
    </div>
  );
}
