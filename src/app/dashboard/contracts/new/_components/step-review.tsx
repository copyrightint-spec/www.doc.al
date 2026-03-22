"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentEditor } from "@/components/ui/document-editor";
import {
  Download,
  Send,
  Save,
  Loader2,
  Users,
  Scale,
  FileText,
  Pencil,
  Eye,
  PenTool,
} from "lucide-react";
import type { PartyData } from "./step-parties";

interface LegalBasisInfo {
  id: string;
  title: string;
  lawReference: string;
  category: string;
}

interface CreatorInfo {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface StepReviewProps {
  title: string;
  parties: PartyData[];
  selectedLegalBases: LegalBasisInfo[];
  termsHtml: string;
  onTermsChange: (html: string) => void;
  orgName?: string;
  orgLogo?: string;
  hasLogo?: boolean | null;
  isSelfSign?: boolean;
  creatorInfo?: CreatorInfo;
  onDownloadDraft: () => Promise<void>;
  onSaveTemplate: () => Promise<void>;
  onSendForSigning: () => Promise<void>;
}

export function StepReview({
  title,
  parties,
  selectedLegalBases,
  termsHtml,
  onTermsChange,
  orgName,
  orgLogo,
  hasLogo,
  isSelfSign,
  creatorInfo,
  onDownloadDraft,
  onSaveTemplate,
  onSendForSigning,
}: StepReviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  async function handleDownload() {
    setDownloading(true);
    try {
      await onDownloadDraft();
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      await onSaveTemplate();
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      await onSendForSigning();
    } finally {
      setSending(false);
    }
  }

  const today = new Date().toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const displayName = orgName || creatorInfo?.name || "";

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Rishikimi & Veprimet</h3>
          <p className="text-sm text-muted-foreground">
            Rishikoni kontraten sic do te duket ne PDF. Klikoni butonin e editimit per te bere ndryshime.
          </p>
        </div>
        <Button
          variant={isEditing ? "primary" : "secondary"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="min-h-[48px] sm:min-h-[36px] w-full sm:w-auto flex-shrink-0"
        >
          {isEditing ? (
            <>
              <Eye className="mr-1.5 h-4 w-4" />
              Paraqit
            </>
          ) : (
            <>
              <Pencil className="mr-1.5 h-4 w-4" />
              Edito
            </>
          )}
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">{parties.length} pale</span>
          <span className="text-muted-foreground">
            ({parties.map((p) => p.fullName || "...").join(", ")})
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
          <Scale className="h-3.5 w-3.5" />
          <span className="font-medium">{selectedLegalBases.length} baza ligjore</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
          <FileText className="h-3.5 w-3.5" />
          <Badge variant="info" className="text-[10px] py-0">DRAFT</Badge>
        </div>
      </div>

      {/* A4 PDF-like Preview */}
      <div className="overflow-x-hidden">
        <div
          ref={previewRef}
          className="a4-preview-container bg-gray-100 dark:bg-gray-900 p-4 sm:p-8 rounded-lg shadow-inner overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "75vh" }}
        >
          {/* A4 Page */}
          <div
            className="a4-page relative bg-white shadow-[0_2px_20px_rgba(0,0,0,0.12)] mx-auto"
            style={{
              width: "210mm",
              minHeight: "297mm",
              maxWidth: "100%",
            }}
          >
            {/* DRAFT Watermark — RED */}
            <div
              className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              <span
                className="select-none text-[60px] sm:text-[120px] font-black tracking-[0.3em] uppercase"
                style={{
                  color: "rgba(220, 38, 38, 0.12)",
                  transform: "rotate(-35deg)",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3em",
                }}
              >
                DRAFT
              </span>
            </div>

            {/* ═══ Page Header — Brussels style ═══ */}
            <div className="px-4 sm:px-[18mm] pt-4 sm:pt-[12mm]">
              <div className="flex items-start justify-between gap-2">
                {/* LEFT: Logo + company details */}
                <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                  {hasLogo !== false && (
                    orgLogo ? (
                      <img
                        src={orgLogo}
                        alt={displayName}
                        className="h-10 w-10 sm:h-16 sm:w-16 object-contain flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 sm:h-16 sm:w-16 rounded border-2 border-black flex items-center justify-center bg-white flex-shrink-0">
                        <span className="text-lg sm:text-2xl font-black text-black">
                          {displayName.charAt(0).toUpperCase() || "?"}
                        </span>
                      </div>
                    )
                  )}
                  <div className="pt-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-black leading-tight truncate">{displayName}</p>
                    {creatorInfo?.address && (
                      <p className="text-[8px] sm:text-[9px] text-black mt-0.5 truncate">{creatorInfo.address}</p>
                    )}
                    {creatorInfo?.phone && (
                      <p className="text-[8px] sm:text-[9px] text-black truncate">Tel: {creatorInfo.phone}</p>
                    )}
                    {creatorInfo?.email && (
                      <p className="text-[8px] sm:text-[9px] text-black truncate">{creatorInfo.email}</p>
                    )}
                  </div>
                </div>

                {/* RIGHT: QR + DataMatrix */}
                <div className="flex items-start gap-1 sm:gap-2 flex-shrink-0">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded border border-black flex items-center justify-center bg-white">
                    <span className="text-[6px] sm:text-[7px] font-bold text-black">QR</span>
                  </div>
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded border border-black flex items-center justify-center bg-white">
                    <span className="text-[5px] sm:text-[6px] font-bold text-black">DM</span>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="border-b-2 border-black mt-3" />

              {/* Linear barcode placeholder — full width */}
              <div className="mt-3 flex justify-center">
                <div className="w-full h-6 sm:h-8 border border-black rounded flex items-center justify-center bg-white overflow-hidden">
                  <span className="text-[6px] sm:text-[8px] font-mono text-black tracking-widest truncate px-1">
                    |||| |||| | ||| || |||| | || ||| |||| || | |||| | ||| || |||| | || ||| ||||
                  </span>
                </div>
              </div>
            </div>

            {/* ═══ Title + Date ═══ */}
            <div className="px-4 sm:px-[18mm] pt-4 sm:pt-5 pb-2">
              <h1 className="text-center text-base sm:text-xl font-bold text-black break-words">{title}</h1>
              <div className="flex justify-center mt-1.5">
                <div className="h-[2px] bg-blue-600" style={{ width: "60px" }} />
              </div>
              <p className="text-right text-[9px] sm:text-[10px] text-black mt-3">Data: {today}</p>
            </div>

            {/* ═══ Page Content ═══ */}
            <div className="relative z-0 px-2 sm:px-[8mm]">
              {isEditing ? (
                <DocumentEditor
                  content={termsHtml}
                  onChange={onTermsChange}
                  editable={true}
                  className="border-0 shadow-none rounded-none min-h-[100mm] sm:min-h-[160mm]"
                />
              ) : (
                <DocumentEditor
                  content={termsHtml}
                  editable={false}
                  className="border-0 shadow-none rounded-none min-h-[100mm] sm:min-h-[160mm]"
                />
              )}
            </div>

            {/* ═══ Signature Blocks ═══ */}
            <div className="px-4 sm:px-[18mm] pb-16 sm:pb-[20mm] mt-8">
              <div className="border-t-2 border-black pt-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <p className="text-[10px] sm:text-[11px] font-bold text-black uppercase tracking-wider">
                    Nenshkrimet
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-black">
                    Nenshkrim elektronik sipas eIDAS (BE) Nr. 910/2014
                  </p>
                </div>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {parties.map((p) => (
                    <div key={p.partyNumber} className="space-y-2">
                      <p className="text-[8px] sm:text-[9px] text-black uppercase tracking-wider font-medium">
                        Pala {p.partyNumber} — {p.role || "Pa rol"}
                      </p>
                      <p className="text-[10px] sm:text-[11px] font-bold text-black">
                        {p.fullName || "[Emri]"}
                      </p>
                      <div className="h-12 sm:h-14 border border-dashed border-black rounded flex items-end justify-center pb-1">
                        <p className="text-[6px] sm:text-[7px] text-black">Nenshkrimi</p>
                      </div>
                      <p className="text-[7px] sm:text-[8px] text-black">
                        Data: ____/____/________
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ Page Footer ═══ */}
            <div className="border-t border-black px-4 sm:px-[18mm] py-2 flex items-center justify-between bg-white mt-auto">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded border border-black flex items-center justify-center">
                  <span className="text-[4px] sm:text-[5px] font-bold text-black">QR</span>
                </div>
                <div className="h-4 w-6 sm:h-5 sm:w-8 rounded border border-black flex items-center justify-center">
                  <span className="text-[3px] sm:text-[4px] font-bold text-black">DM</span>
                </div>
                <span className="text-[6px] sm:text-[7px] font-bold text-black ml-1">doc.al</span>
              </div>
              <p className="text-[6px] sm:text-[7px] text-black">
                Vulosur dixhitalisht nga DOC.al | Faqja 1
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Actions ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t">
        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={downloading}
          className="min-h-[48px] sm:min-h-[40px] w-full"
        >
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Shkarko Draft (PDF)
        </Button>

        <Button
          variant="secondary"
          onClick={handleSaveTemplate}
          disabled={savingTemplate}
          className="min-h-[48px] sm:min-h-[40px] w-full"
        >
          {savingTemplate ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Ruaj si Shabllone
        </Button>

        {isSelfSign ? (
          <Button
            onClick={handleSend}
            disabled={sending}
            className="min-h-[48px] sm:min-h-[40px] w-full"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PenTool className="mr-2 h-4 w-4" />
            )}
            Nenshkruaj Tani
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={sending || parties.some((p) => !p.email)}
            className="min-h-[48px] sm:min-h-[40px] w-full"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Dergo per Nenshkrim
          </Button>
        )}
      </div>
    </div>
  );
}
