"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { StepParties, type PartyData } from "./_components/step-parties";
import { StepLegalBasis } from "./_components/step-legal-basis";
import { StepTerms } from "./_components/step-terms";
import { StepReview } from "./_components/step-review";
import { parseHtmlToBlocks, renderBlocksToPdf } from "@/lib/html-to-pdf";
import { loadBrandingAssets } from "@/lib/pdf-branding";

interface LegalBasisInfo {
  id: string;
  title: string;
  lawReference: string;
  description: string;
  suggestedTerms: string;
  category: string;
}

const STEPS = [
  { id: "parties", label: "Palet", number: 1 },
  { id: "legal-basis", label: "Baza Ligjore", number: 2 },
  { id: "terms", label: "Termat", number: 3 },
  { id: "review", label: "Rishikimi", number: 4 },
];

export default function ContractBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [parties, setParties] = useState<PartyData[]>([]);
  const [selectedLegalBasisIds, setSelectedLegalBasisIds] = useState<string[]>([]);
  const [termsHtml, setTermsHtml] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    organizationId?: string | null;
  } | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ name: string; logo: string | null; address?: string; phone?: string; email?: string } | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null); // base64 data URL
  const [hasLogo, setHasLogo] = useState<boolean | null>(null); // null = not asked, true/false = answered

  // Store loaded legal bases for building terms
  const allLegalBasesRef = useRef<LegalBasisInfo[]>([]);
  const termsGeneratedRef = useRef(false);

  // Fetch current user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (json.success) {
          setCurrentUser({
            id: json.data.id,
            name: json.data.name,
            email: json.data.email,
            phone: json.data.phone || "",
            organizationId: json.data.organizationId,
          });
          if (json.data.organization) {
            setOrgInfo({
              name: json.data.organization.name,
              logo: json.data.organization.logo,
            });
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchProfile();
  }, []);

  function handleLegalBasesLoaded(bases: LegalBasisInfo[]) {
    allLegalBasesRef.current = bases;
  }

  // Build initial terms HTML from parties + selected legal bases
  const generateTermsHtml = useCallback(() => {
    const parts: string[] = [];

    // NOTE: Title is rendered in the PDF header, not in the content body

    // ═══ PALET KONTRAKTUESE — standalone header section (not a numbered article) ═══
    if (parties.length > 0) {
      parts.push(`<h2 style="text-align: center">PALET KONTRAKTUESE</h2>`);
      parts.push(`<p></p>`); // spacing
      for (const p of parties) {
        parts.push(
          `<p><strong>Pala ${p.partyNumber}${p.role ? ` — ${p.role}` : ""}:</strong></p>` +
          `<p style="padding-left: 1rem">Emri i plote: ${p.fullName || "[Emri]"}</p>` +
          `<p style="padding-left: 1rem">Nr. Identifikimi: ${p.idNumber || "[Nr. ID]"}</p>` +
          `<p style="padding-left: 1rem">Adresa: ${p.address || "[Adresa]"}</p>` +
          `<p style="padding-left: 1rem">Telefoni: ${p.phone || "[Tel]"}</p>` +
          `<p style="padding-left: 1rem">Email: ${p.email || "[Email]"}</p>` +
          `<p></p>`, // spacing between parties
        );
      }
    }

    // ═══ BAZA LIGJORE — standalone header section (not a numbered article) ═══
    const selectedBases = allLegalBasesRef.current.filter((lb) =>
      selectedLegalBasisIds.includes(lb.id),
    );

    if (selectedBases.length > 0) {
      parts.push(`<hr>`);
      parts.push(`<h2 style="text-align: center">BAZA LIGJORE</h2>`);
      parts.push(`<p></p>`); // spacing
      parts.push(`<p>Kjo marreveshje mbeshtet ne dispozitat e akteve te meposhtme normative:</p>`);
      parts.push(`<p></p>`);
      for (const lb of selectedBases) {
        parts.push(`<p style="padding-left: 1rem">\u2022 <strong>${lb.title}</strong> — ${lb.lawReference}</p>`);
      }
      parts.push(`<p></p>`); // spacing
    }

    // ═══ KUSHTET E MARREVESHJES — separator before articles ═══
    parts.push(`<hr>`);
    parts.push(`<h2 style="text-align: center">KUSHTET E MARREVESHJES</h2>`);
    parts.push(`<p></p>`); // spacing

    // ═══ Suggested terms from legal bases as NENI 1, 2, 3... ═══
    let neniCounter = 1;
    if (selectedBases.length > 0) {
      for (const lb of selectedBases) {
        if (lb.suggestedTerms) {
          // Wrap each legal basis's suggested terms as a NENI
          parts.push(`<h3 style="text-align: center">NENI ${neniCounter}</h3>`);
          parts.push(`<p style="text-align: center"><strong>${lb.title}</strong></p>`);
          parts.push(`<p></p>`); // spacing

          // Rewrite inner "Neni X - Title" headings to "NENI_N.X - Title" format
          let subIdx = 1;
          const rewritten = lb.suggestedTerms
            .replace(/<h3>Neni\s*(\d+)\s*-\s*/gi, () => {
              const result = `<h3>${neniCounter}.${subIdx} - `;
              subIdx++;
              return result;
            })
            // Also rewrite "Neni -" (without number) to numbered format
            .replace(/<h3>Neni\s*-\s*/gi, () => {
              const result = `<h3>${neniCounter}.${subIdx} - `;
              subIdx++;
              return result;
            });
          parts.push(rewritten);
          parts.push(`<p></p>`); // spacing between articles
          parts.push(`<p></p>`);
          neniCounter++;
        }
      }
    }

    // NOTE: KUSHTET E NENSHKRIMIT ELEKTRONIK is NOT included in editable HTML.
    // It is rendered directly in the PDF by renderBlocksToPdf() — non-editable, non-removable.

    return parts.join("\n");
  }, [title, parties, selectedLegalBasisIds]);

  // When moving from legal basis (step 1) to terms (step 2), generate initial content
  function handleNext() {
    if (step === 1 && !termsGeneratedRef.current) {
      setTermsHtml(generateTermsHtml());
      termsGeneratedRef.current = true;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  // Validation for each step
  function canProceed(): boolean {
    switch (step) {
      case 0: // Parties
        return (
          title.trim().length > 0 &&
          parties.length >= 2 &&
          parties.every(
            (p) => p.fullName.trim() && p.email.trim() && p.role.trim(),
          )
        );
      case 1: // Legal basis (optional but recommended)
        return true;
      case 2: // Terms
        return termsHtml.trim().length > 0;
      default:
        return true;
    }
  }

  // ─── Actions ───

  async function handleDownloadDraft() {
    const doc = new jsPDF({ format: "a4", unit: "mm" });
    const assets = await loadBrandingAssets({
      organizationName: orgInfo?.name,
      organizationLogoUrl: customLogo || orgInfo?.logo || undefined,
    });

    const blocks = parseHtmlToBlocks(termsHtml);
    renderBlocksToPdf({
      doc,
      blocks,
      assets,
      orgName: orgInfo?.name || currentUser?.name || parties[0]?.fullName,
      title: title || "Kontrate",
      creator: {
        name: currentUser?.name || orgInfo?.name || parties[0]?.fullName || "",
        email: currentUser?.email || parties[0]?.email || "",
        phone: currentUser?.phone || orgInfo?.phone || parties[0]?.phone || "",
        address: orgInfo?.address || parties[0]?.address || "",
      },
      signers: parties.map((p) => ({ name: p.fullName, role: p.role })),
      isDraft: true,
    });

    doc.save(`${title || "kontrate"}-draft.pdf`);
  }

  async function handleSaveTemplate() {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          description: `Kontrate e krijuar me Contract Builder`,
          category: "contract",
          fields: parties.map((p) => ({
            type: "text",
            label: `Pala ${p.partyNumber} - ${p.role}`,
            required: true,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Shablloni u ruajt me sukses!");
      } else {
        alert(json.error || "Gabim gjate ruajtjes");
      }
    } catch {
      alert("Gabim gjate ruajtjes se shablonit");
    }
  }

  async function handleSendForSigning() {
    try {
      // 1. Save contract draft
      const saveRes = await fetch("/api/contracts/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          parties: parties.map((p) => ({
            partyNumber: p.partyNumber,
            role: p.role,
            fullName: p.fullName,
            idNumber: p.idNumber,
            address: p.address,
            phone: p.phone,
            email: p.email,
            userId: p.userId,
          })),
          legalBasisIds: selectedLegalBasisIds,
          termsHtml,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        alert(saveJson.error || "Gabim gjate ruajtjes se kontrates");
        return;
      }

      const contractId = saveJson.data.id;

      // 2. Send for signing
      const sendRes = await fetch(`/api/contracts/builder/${contractId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const sendJson = await sendRes.json();

      if (sendJson.success) {
        router.push(`/dashboard/contracts/${sendJson.data.signingRequestId || contractId}`);
      } else {
        alert(sendJson.error || "Gabim gjate dergimit");
      }
    } catch {
      alert("Gabim gjate procesit te dergimit");
    }
  }

  // Detect if the current user is one of the parties (self-signing)
  const isSelfSign = currentUser
    ? parties.some(
        (p) =>
          p.email.toLowerCase() === currentUser.email.toLowerCase() ||
          p.userId === currentUser.id,
      )
    : false;

  const selectedLegalBasesInfo = allLegalBasesRef.current
    .filter((lb) => selectedLegalBasisIds.includes(lb.id))
    .map(({ id, title, lawReference, category }) => ({
      id,
      title,
      lawReference,
      category,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contracts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kthehu
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Krijo Kontrate te Re</h1>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => i <= step && setStep(i)}
              disabled={i > step}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                i === step
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : i < step
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }`}
            >
              {i < step ? (
                <Check className="h-3 w-3" />
              ) : (
                <span>{s.number}</span>
              )}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < step ? "bg-green-300" : "bg-slate-200 dark:bg-slate-700"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Title + Logo input (shown on step 0) */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Titulli i Kontrates
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p.sh. Kontrate Pune, Kontrate Qiraje, Marreveshje Bashkepunimi..."
              className="mt-1"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Logo e Kompanise / Individit
            </label>
            {hasLogo === null ? (
              <div className="mt-2 flex items-center gap-3">
                <p className="text-sm text-muted-foreground">A keni logo zyrtare?</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHasLogo(true)}
                >
                  Po, vendos logon
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHasLogo(false)}
                >
                  Jo
                </Button>
              </div>
            ) : hasLogo === false ? (
              <div className="mt-2 flex items-center gap-3">
                <p className="text-xs text-muted-foreground">Logo nuk do te shfaqet ne dokument.</p>
                <Button variant="ghost" size="sm" onClick={() => setHasLogo(null)} className="text-xs">
                  Ndrysho
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-4">
                {customLogo ? (
                  <img src={customLogo} alt="Logo" className="h-16 w-16 rounded border object-contain bg-white" />
                ) : (
                  <div className="h-16 w-16 rounded border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
                    <span className="text-[10px] text-muted-foreground text-center">Vendos logo</span>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setCustomLogo(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                    <span className="text-xs text-blue-600 hover:underline">
                      {customLogo ? "Ndrysho logon" : "Ngarko logon (PNG, JPG, SVG)"}
                    </span>
                  </label>
                  {customLogo && (
                    <button onClick={() => setCustomLogo(null)} className="text-xs text-red-500 hover:underline text-left">
                      Hiq logon
                    </button>
                  )}
                  <button onClick={() => setHasLogo(null)} className="text-xs text-muted-foreground hover:underline text-left">
                    Ndrysho pergjigjen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <StepParties
          parties={parties}
          onChange={setParties}
          currentUser={currentUser}
        />
      )}
      {step === 1 && (
        <StepLegalBasis
          selectedIds={selectedLegalBasisIds}
          onChange={setSelectedLegalBasisIds}
          onLegalBasesLoaded={handleLegalBasesLoaded}
        />
      )}
      {step === 2 && (
        <StepTerms termsHtml={termsHtml} onChange={setTermsHtml} />
      )}
      {step === 3 && (
        <StepReview
          title={title}
          parties={parties}
          selectedLegalBases={selectedLegalBasesInfo}
          termsHtml={termsHtml}
          onTermsChange={setTermsHtml}
          orgName={orgInfo?.name}
          orgLogo={customLogo || orgInfo?.logo || undefined}
          hasLogo={hasLogo}
          isSelfSign={isSelfSign}
          creatorInfo={{
            name: currentUser?.name || orgInfo?.name || "",
            email: currentUser?.email || "",
            phone: currentUser?.phone || orgInfo?.phone || "",
            address: orgInfo?.address || "",
          }}
          onDownloadDraft={handleDownloadDraft}
          onSaveTemplate={handleSaveTemplate}
          onSendForSigning={handleSendForSigning}
        />
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="secondary"
          onClick={handleBack}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Mbrapa
        </Button>

        {step < STEPS.length - 1 && (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Vazhdo
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
