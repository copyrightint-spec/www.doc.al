"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  FileText,
  Upload,
  FileUp,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";

// -- Types --
interface SignerRole {
  id: string;
  name: string;
  color: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isPublic: boolean;
  signerRoles: SignerRole[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdfmeTemplate: any;
}

const CATEGORIES = [
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

const SIGNER_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777"];

// -- Suspense Wrapper --
export default function TemplateEditorPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    }>
      <TemplateEditorPage />
    </Suspense>
  );
}

// -- Main Component --
function TemplateEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const designerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const designerInstanceRef = useRef<any>(null);

  const [step, setStep] = useState<"setup" | "designer">(editId ? "designer" : "setup");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("kontrate");
  const [isPublic, setIsPublic] = useState(false);
  const [signerRoles, setSignerRoles] = useState<SignerRole[]>([
    { id: "1", name: "Pala e Pare", color: SIGNER_COLORS[0] },
    { id: "2", name: "Pala e Dyte", color: SIGNER_COLORS[1] },
  ]);

  const [basePdfFile, setBasePdfFile] = useState<ArrayBuffer | null>(null);
  const [basePdfName, setBasePdfName] = useState("");
  const [useBlankPdf, setUseBlankPdf] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [existingTemplate, setExistingTemplate] = useState<SavedTemplate | null>(null);

  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [orgName, setOrgName] = useState<string | undefined>();
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | undefined>();

  // Fetch user's organization info for branding in designer
  useEffect(() => {
    if (editId) return; // Will get org from template data instead
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.organizationName) {
          setOrgName(data.user.organizationName);
        }
      })
      .catch(() => {});
  }, [editId]);

  // Load existing template if editing
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const res = await fetch(`/api/templates/${editId}`);
        const data = await res.json();
        if (data.success) {
          const t = data.data;
          setName(t.name);
          setDescription(t.description || "");
          setCategory(t.category || "kontrate");
          setIsPublic(t.isPublic);
          setSignerRoles(t.signerRoles || [{ id: "1", name: "Pala e Pare", color: SIGNER_COLORS[0] }]);
          setExistingTemplate(t);
          // Set org info from template
          if (t.organization) {
            setOrgName(t.organization.name);
            setOrgLogoUrl(t.organization.logo || undefined);
          }
          if (t.pdfmeTemplate) {
            const parsed = typeof t.pdfmeTemplate === "string" ? JSON.parse(t.pdfmeTemplate) : t.pdfmeTemplate;
            if (parsed.schemas) {
              setPageCount(parsed.schemas.length);
            }
          }
        }
      } catch {
        setError("Nuk u ngarkua template");
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId]);

  // Initialize pdfme Designer
  const initDesigner = useCallback(async () => {
    if (!designerRef.current) return;

    const [{ Designer }, schemas, { BLANK_PDF }] = await Promise.all([
      import("@pdfme/ui"),
      import("@pdfme/schemas"),
      import("@pdfme/common"),
    ]);
    const { createBlankPdfWithFooter, createBlankPdfWithBranding } = await import("@/lib/pdfme-footer");

    const plugins = {
      text: schemas.text,
      image: schemas.image,
      checkbox: schemas.checkbox,
      date: schemas.date,
      dateTime: schemas.dateTime,
      select: schemas.select,
      line: schemas.line,
      rectangle: schemas.rectangle,
      ellipse: schemas.ellipse,
      svg: schemas.svg,
      qrcode: schemas.barcodes.qrcode,
      gs1datamatrix: schemas.barcodes.gs1datamatrix,
      table: schemas.table,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let basePdf: any;
    if (!useBlankPdf && basePdfFile) {
      basePdf = new Uint8Array(basePdfFile);
    } else if (orgName) {
      basePdf = createBlankPdfWithBranding(pageCount, undefined, orgName);
    } else {
      basePdf = createBlankPdfWithFooter(pageCount);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let template: any;

    if (existingTemplate?.pdfmeTemplate) {
      try {
        const parsed = typeof existingTemplate.pdfmeTemplate === "string"
          ? JSON.parse(existingTemplate.pdfmeTemplate)
          : existingTemplate.pdfmeTemplate;

        const schemasData = parsed.schemas || [[]];
        if (parsed.basePdf === "BLANK" || !parsed.basePdf) {
          basePdf = orgName
            ? createBlankPdfWithBranding(schemasData.length, undefined, orgName)
            : createBlankPdfWithFooter(schemasData.length);
        } else if (parsed.basePdfData) {
          const binaryStr = atob(parsed.basePdfData);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          basePdf = bytes;
        }

        template = { basePdf, schemas: schemasData };
      } catch {
        template = { basePdf, schemas: [[]] };
      }
    } else {
      const emptySchemas = Array.from({ length: pageCount }, () => []);
      template = { basePdf, schemas: emptySchemas };
    }

    if (designerInstanceRef.current) {
      designerInstanceRef.current.destroy();
    }

    designerRef.current.innerHTML = "";

    const designer = new Designer({
      domContainer: designerRef.current,
      template,
      plugins,
      options: {
        lang: "en",
        theme: {
          token: {
            colorPrimary: "#dc2626",
          },
        },
      },
    });

    designer.onChangeTemplate(() => {
      try {
        const t = designer.getTemplate();
        if (t.schemas) {
          const newCount = t.schemas.length;
          if (newCount !== pageCount) {
            setPageCount(newCount);
          }
        }
      } catch {
        // ignore
      }
    });

    designerInstanceRef.current = designer;
  }, [useBlankPdf, basePdfFile, existingTemplate, pageCount, orgName]);

  useEffect(() => {
    if (step === "designer") {
      const timer = setTimeout(() => {
        initDesigner();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, initDesigner]);

  useEffect(() => {
    return () => {
      if (designerInstanceRef.current) {
        designerInstanceRef.current.destroy();
      }
    };
  }, []);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Ju lutem zgjidhni nje skedar PDF");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Skedari duhet te jete me i vogel se 20MB");
      return;
    }
    setBasePdfName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setBasePdfFile(reader.result as ArrayBuffer);
      setUseBlankPdf(false);
      setError("");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleWordUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["doc", "docx"].includes(ext || "")) {
      setError("Ju lutem zgjidhni nje skedar Word (.doc/.docx)");
      return;
    }
    setError("");
    setBasePdfName(file.name);
    convertWordToPdf(file);
  };

  const convertWordToPdf = async (file: File) => {
    try {
      setError("Duke konvertuar Word ne PDF...");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/templates/convert-word", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setError("Konvertimi i Word deshtoi. Ju lutem ngarkoni direkt nje PDF.");
        return;
      }
      const pdfBuffer = await res.arrayBuffer();
      setBasePdfFile(pdfBuffer);
      setUseBlankPdf(false);
      setError("");
    } catch {
      setError("Konvertimi i Word deshtoi. Ju lutem ngarkoni direkt nje PDF.");
    }
  };

  const addPage = () => {
    if (!designerInstanceRef.current) {
      setPageCount((p) => p + 1);
      return;
    }
    try {
      const template = designerInstanceRef.current.getTemplate();
      const newSchemas = [...template.schemas, []];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let basePdf: any = template.basePdf;
      if (useBlankPdf && typeof basePdf === "object" && basePdf.width) {
        import("@/lib/pdfme-footer").then(({ updateFooterForPageCount }) => {
          basePdf = updateFooterForPageCount(basePdf, newSchemas.length);
          designerInstanceRef.current.updateTemplate({
            basePdf,
            schemas: newSchemas,
          });
        });
      } else {
        designerInstanceRef.current.updateTemplate({
          basePdf,
          schemas: newSchemas,
        });
      }
      setPageCount(newSchemas.length);
      setCurrentPage(newSchemas.length - 1);
    } catch {
      setError("Nuk mund te shtohej faqja");
    }
  };

  const removePage = () => {
    if (pageCount <= 1) return;
    if (!designerInstanceRef.current) {
      setPageCount((p) => Math.max(1, p - 1));
      return;
    }
    try {
      const template = designerInstanceRef.current.getTemplate();
      const newSchemas = template.schemas.slice(0, -1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let basePdf: any = template.basePdf;
      if (useBlankPdf && typeof basePdf === "object" && basePdf.width) {
        import("@/lib/pdfme-footer").then(({ updateFooterForPageCount }) => {
          basePdf = updateFooterForPageCount(basePdf, newSchemas.length);
          designerInstanceRef.current.updateTemplate({
            basePdf,
            schemas: newSchemas,
          });
        });
      } else {
        designerInstanceRef.current.updateTemplate({
          basePdf,
          schemas: newSchemas,
        });
      }
      setPageCount(newSchemas.length);
      if (currentPage >= newSchemas.length) {
        setCurrentPage(newSchemas.length - 1);
      }
    } catch {
      setError("Nuk mund te hiqej faqja");
    }
  };

  const addSignerRole = () => {
    const nextId = String(signerRoles.length + 1);
    setSignerRoles([
      ...signerRoles,
      { id: nextId, name: `Pala ${nextId}`, color: SIGNER_COLORS[signerRoles.length % SIGNER_COLORS.length] },
    ]);
  };

  const removeSignerRole = (id: string) => {
    if (signerRoles.length <= 1) return;
    setSignerRoles(signerRoles.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!designerInstanceRef.current) return;
    setSaving(true);
    setError("");

    try {
      const pdfmeTemplate = designerInstanceRef.current.getTemplate();
      const pdfmeSchemas = pdfmeTemplate.schemas || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields: any[] = [];
      pdfmeSchemas.forEach((pageSchemas: Record<string, unknown>[], pageIndex: number) => {
        if (Array.isArray(pageSchemas)) {
          pageSchemas.forEach((schema: Record<string, unknown>) => {
            fields.push({
              type: mapPdfmeTypeToOurs(schema.type as string),
              label: (schema.name as string) || "Field",
              required: (schema.required as boolean) ?? true,
              position: {
                page: pageIndex,
                x: Math.round(((schema.position as { x: number })?.x || 0) * 2.83),
                y: Math.round(((schema.position as { y: number })?.y || 0) * 2.83),
                width: Math.round(((schema.width as number) || 50) * 2.83),
                height: Math.round(((schema.height as number) || 20) * 2.83),
              },
              assignedTo: signerRoles[0]?.id || "1",
            });
          });
        }
      });

      if (fields.length === 0) {
        fields.push({
          type: "signature",
          label: "Nenshkrimi",
          required: true,
          position: { page: 0, x: 100, y: 650, width: 200, height: 70 },
          assignedTo: signerRoles[0]?.id || "1",
        });
      }

      const basePdfIsBlank = useBlankPdf || (typeof pdfmeTemplate.basePdf === "object" && pdfmeTemplate.basePdf?.width);

      const body = {
        name,
        description: description || undefined,
        category,
        fields,
        signerRoles,
        isPublic,
        pdfmeTemplate: JSON.stringify({
          schemas: pdfmeTemplate.schemas,
          basePdf: basePdfIsBlank ? "BLANK" : undefined,
          pageCount: pdfmeSchemas.length,
        }),
      };

      const url = editId ? `/api/templates/${editId}` : "/api/templates";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success || res.ok) {
        router.push("/templates");
      } else {
        setError(data.error || "Ndodhi nje gabim");
      }
    } catch {
      setError("Ndodhi nje gabim gjate ruajtjes");
    } finally {
      setSaving(false);
    }
  };

  function mapPdfmeTypeToOurs(pdfmeType: string): string {
    const map: Record<string, string> = {
      text: "text",
      image: "signature",
      checkbox: "checkbox",
      date: "date",
      dateTime: "date",
      select: "dropdown",
      line: "text",
      rectangle: "text",
      ellipse: "text",
      svg: "stamp",
      qrcode: "text",
      gs1datamatrix: "text",
      table: "text",
    };
    return map[pdfmeType] || "text";
  }

  // Loading state for edit mode
  if (loadingEdit) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  // -- Step 1: Setup --
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/templates">
                <ChevronLeft className="h-4 w-4" />
                Kthehu te Templates
              </Link>
            </Button>
            <h1 className="text-sm font-semibold text-foreground">
              {editId ? "Modifiko Template" : "Krijo Template te Ri"}
            </h1>
            <div className="w-24" />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-10">
          <PageHeader
            title={editId ? "Modifiko Template" : "Hapi 1: Konfigurimi"}
            subtitle="Vendosni emrin, kategorine, numrin e faqeve dhe rolet e nenshkruesve."
            className="mb-8"
          />

          <div className="space-y-6">
            {/* Name + Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Emri i Template *
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p.sh. Kontrate Punesimi"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Kategoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Pershkrimi
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pershkruani template per cfare perdoret..."
                rows={2}
              />
            </div>

            {/* Page Count */}
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Numri i Faqeve
              </label>
              <p className="mb-3 text-xs text-muted-foreground">
                Mund te shtoni faqe edhe me vone ne editor. Cdo faqe ka footer te detyrushem DOC.al.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  onClick={() => setPageCount(Math.max(1, pageCount - 1))}
                  disabled={pageCount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex h-10 w-16 items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-foreground">
                  {pageCount}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  type="button"
                  onClick={() => setPageCount(pageCount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {pageCount === 1 ? "faqe" : "faqe"} (pa limit)
                </span>
              </div>
            </div>

            {/* Signer Roles */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Rolet e Nenshkruesve
                </label>
                <Button variant="link" size="sm" type="button" onClick={addSignerRole}>
                  + Shto rol
                </Button>
              </div>
              <div className="space-y-2">
                {signerRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: role.color + "40", backgroundColor: role.color + "08" }}
                  >
                    <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                    <input
                      type="text"
                      value={role.name}
                      onChange={(e) =>
                        setSignerRoles(signerRoles.map((r) => (r.id === role.id ? { ...r, name: e.target.value } : r)))
                      }
                      className="flex-1 border-none bg-transparent text-sm font-medium focus:outline-none text-foreground"
                    />
                    {signerRoles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSignerRole(role.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Base - PDF / Word / Blank */}
            <div>
              <label className="mb-3 block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Dokumenti Baze
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* Blank A4 */}
                <button
                  type="button"
                  onClick={() => { setUseBlankPdf(true); setBasePdfFile(null); setBasePdfName(""); }}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    useBlankPdf
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${useBlankPdf ? "bg-primary/10" : "bg-muted"}`}>
                    <FileText className={`h-5 w-5 ${useBlankPdf ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Faqe Bosh (A4)</p>
                    <p className="text-xs text-muted-foreground">Fillo nga zero</p>
                  </div>
                </button>

                {/* Upload PDF */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    !useBlankPdf && basePdfFile
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${!useBlankPdf && basePdfFile ? "bg-primary/10" : "bg-muted"}`}>
                    <Upload className={`h-5 w-5 ${!useBlankPdf && basePdfFile ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {basePdfName && !basePdfName.endsWith(".docx") ? basePdfName : "Ngarko PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {basePdfFile && !basePdfName.endsWith(".docx") ? "PDF i ngarkuar" : "Vendos fushat mbi PDF"}
                    </p>
                  </div>
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                </label>

                {/* Upload Word */}
                <label
                  className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 text-left transition-all hover:border-slate-400 dark:hover:border-slate-600"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                    <FileUp className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ngarko Word</p>
                    <p className="text-xs text-muted-foreground">.doc / .docx</p>
                  </div>
                  <input type="file" accept=".doc,.docx" className="hidden" onChange={handleWordUpload} />
                </label>
              </div>
            </div>

            {/* DOC.al Footer info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Footer i Detyrueshem DOC.al
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Cdo faqe e dokumentit ka automatikisht: logon e organizates (siper majtas), logon DOC.al (siper djathtas),
                      QR kod per verifikim, DataMatrix me timestamp, dhe numrin e faqes (poshte). Keto fusha nuk mund te modifikohen.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Logo Organizates", "Logo DOC.al", "QR Verifikim", "DataMatrix", "Nr. Faqes", "Timestamp"].map((tag) => (
                        <Badge key={tag} variant="destructive">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Public toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative h-6 w-11 rounded-full transition-colors ${isPublic ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
                onClick={() => setIsPublic(!isPublic)}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-foreground">Template publik (i dukshem per te gjithe)</span>
            </label>

            {/* Error */}
            {error && (
              <Alert variant="destructive" title={error} />
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button variant="secondary" asChild>
                <Link href="/dashboard/templates">Anulo</Link>
              </Button>
              <Button
                onClick={() => {
                  if (!name.trim()) { setError("Emri eshte i detyrueshem"); return; }
                  setError("");
                  setStep("designer");
                }}
              >
                Hap Editorin Vizual
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -- Step 2: Visual Designer --
  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("setup")}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Konfigurimi
          </Button>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-sm font-semibold text-foreground">{name}</h2>
          <Badge>
            {CATEGORIES.find((c) => c.value === category)?.label || category}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Page controls */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={removePage}
              disabled={pageCount <= 1}
              title="Hiq faqen e fundit"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[3rem] text-center text-[11px] font-medium text-foreground">
              {pageCount} {pageCount === 1 ? "faqe" : "faqe"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={addPage}
              title="Shto faqe te re"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Signer roles legend */}
          <div className="hidden sm:flex items-center gap-2">
            {signerRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[11px] text-muted-foreground">{r.name}</span>
              </div>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Footer badge */}
          <Badge variant="destructive" className="hidden md:flex">
            <Shield className="h-3 w-3" strokeWidth={2} />
            Branding DOC.al
          </Badge>

          {error && (
            <span className="text-xs text-red-500 mr-2">{error}</span>
          )}

          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/templates">Anulo</Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {saving ? "Duke ruajtur..." : "Ruaj Template"}
          </Button>
        </div>
      </div>

      {/* Designer container */}
      <div ref={designerRef} className="flex-1" />
    </div>
  );
}
