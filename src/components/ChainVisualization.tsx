"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Info,
  Hash,
  Link as LinkIcon,
  X,
  ArrowRight,
} from "lucide-react";

interface ChainEntry {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
}

interface ChainVisualizationProps {
  currentEntry: {
    sequenceNumber: number;
    fingerprint: string;
    sequentialFingerprint: string;
    serverTimestamp: string;
  };
  previousEntry: ChainEntry | null;
  nextEntry: ChainEntry | null;
}

function truncate(hash: string, len = 10): string {
  if (hash.length <= len * 2 + 3) return hash;
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}

function truncateShort(hash: string): string {
  return `${hash.slice(0, 8)}...`;
}

export default function ChainVisualization({
  currentEntry,
  previousEntry,
  nextEntry,
}: ChainVisualizationProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const prevSeqFP = previousEntry
    ? truncateShort(previousEntry.sequentialFingerprint)
    : "GENESIS";

  const currentFP = truncateShort(currentEntry.fingerprint);
  const currentSeqNum = currentEntry.sequenceNumber;

  return (
    <div className="space-y-6">
      {/* === CHAIN BLOCKS === */}
      <div className="relative">
        {/* Desktop: horizontal chain */}
        <div className="hidden md:flex items-stretch justify-center gap-0">
          {/* Previous Block */}
          <ChainBlock
            label={previousEntry ? "Para" : "Genesis"}
            sequenceNumber={previousEntry?.sequenceNumber ?? null}
            fingerprint={previousEntry?.fingerprint ?? null}
            seqFingerprint={previousEntry?.sequentialFingerprint ?? null}
            variant="muted"
            href={
              previousEntry
                ? `/explorer/${previousEntry.sequenceNumber}`
                : undefined
            }
          />

          {/* Arrow prev → current */}
          <ChainArrow variant="active" />

          {/* Current Block */}
          <ChainBlock
            label="Aktuale"
            sequenceNumber={currentEntry.sequenceNumber}
            fingerprint={currentEntry.fingerprint}
            seqFingerprint={currentEntry.sequentialFingerprint}
            variant="current"
          />

          {/* Arrow current → next */}
          <ChainArrow variant={nextEntry ? "default" : "dashed"} />

          {/* Next Block */}
          <ChainBlock
            label={nextEntry ? "Pas" : "Me i fundit"}
            sequenceNumber={nextEntry?.sequenceNumber ?? null}
            fingerprint={nextEntry?.fingerprint ?? null}
            seqFingerprint={nextEntry?.sequentialFingerprint ?? null}
            variant="muted"
            href={
              nextEntry
                ? `/explorer/${nextEntry.sequenceNumber}`
                : undefined
            }
          />
        </div>

        {/* Mobile: vertical chain */}
        <div className="flex md:hidden flex-col items-center gap-0">
          <ChainBlock
            label={previousEntry ? "Para" : "Genesis"}
            sequenceNumber={previousEntry?.sequenceNumber ?? null}
            fingerprint={previousEntry?.fingerprint ?? null}
            seqFingerprint={previousEntry?.sequentialFingerprint ?? null}
            variant="muted"
            href={
              previousEntry
                ? `/explorer/${previousEntry.sequenceNumber}`
                : undefined
            }
            mobile
          />
          <ChainArrowVertical variant="active" />
          <ChainBlock
            label="Aktuale"
            sequenceNumber={currentEntry.sequenceNumber}
            fingerprint={currentEntry.fingerprint}
            seqFingerprint={currentEntry.sequentialFingerprint}
            variant="current"
            mobile
          />
          <ChainArrowVertical variant={nextEntry ? "default" : "dashed"} />
          <ChainBlock
            label={nextEntry ? "Pas" : "Me i fundit"}
            sequenceNumber={nextEntry?.sequenceNumber ?? null}
            fingerprint={nextEntry?.fingerprint ?? null}
            seqFingerprint={nextEntry?.sequentialFingerprint ?? null}
            variant="muted"
            href={
              nextEntry
                ? `/explorer/${nextEntry.sequenceNumber}`
                : undefined
            }
            mobile
          />
        </div>
      </div>

      {/* === HASH FORMULA === */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10">
              <Hash className="h-3.5 w-3.5 text-indigo-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Formula e Zinxhirit
            </span>
          </div>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            aria-label="Informacion rreth formules"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* The formula */}
        <div className="rounded-lg bg-black/20 dark:bg-black/40 px-4 py-3 overflow-x-auto">
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            <span className="text-purple-400 font-semibold">
              SeqFP#{currentSeqNum}
            </span>
            <span className="text-muted-foreground">=</span>
            <span className="text-indigo-300">SHA-256</span>
            <span className="text-muted-foreground">(</span>
            {previousEntry ? (
              <Link
                href={`/explorer/${previousEntry.sequenceNumber}`}
                className="text-blue-400 hover:text-blue-300 underline decoration-dotted underline-offset-2 transition-colors"
                title={previousEntry.sequentialFingerprint}
              >
                SeqFP#{previousEntry.sequenceNumber}
              </Link>
            ) : (
              <span className="text-yellow-400">&quot;GENESIS&quot;</span>
            )}
            <span className="text-muted-foreground">+</span>
            <span className="text-green-400" title={currentEntry.fingerprint}>
              FP#{currentSeqNum}
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="text-orange-400">Timestamp</span>
            <span className="text-muted-foreground">)</span>
          </div>
        </div>

        {/* Expanded values */}
        <div className="mt-3 space-y-1.5">
          <FormulaRow
            label={
              previousEntry
                ? `SeqFP#${previousEntry.sequenceNumber}`
                : "prevSeqFP"
            }
            value={
              previousEntry
                ? previousEntry.sequentialFingerprint
                : "GENESIS"
            }
            color="text-blue-400"
            href={
              previousEntry
                ? `/explorer/${previousEntry.sequenceNumber}`
                : undefined
            }
          />
          <FormulaRow
            label={`FP#${currentSeqNum}`}
            value={currentEntry.fingerprint}
            color="text-green-400"
          />
          <FormulaRow
            label="Timestamp"
            value={currentEntry.serverTimestamp}
            color="text-orange-400"
          />
          <div className="border-t border-indigo-500/20 pt-1.5">
            <FormulaRow
              label={`SeqFP#${currentSeqNum}`}
              value={currentEntry.sequentialFingerprint}
              color="text-purple-400"
              bold
            />
          </div>
        </div>
      </div>

      {/* === INFO TOOLTIP PANEL === */}
      {showTooltip && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-4 relative animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <h4 className="text-sm font-semibold text-indigo-300 mb-2">
            Si funksionon zinxhiri i integritetit?
          </h4>
          <div className="space-y-3 text-xs text-indigo-200/80 leading-relaxed">
            <p>
              <strong className="text-indigo-300">Fingerprint (FP)</strong> eshte
              hash SHA-256 i dokumentit tuaj. Eshte si nje &quot;gjurme
              gishtash&quot; unike per dokumentin -- cdo ndryshim i vogel ne
              dokument do te prodhonte nje hash krejt te ndryshme.
            </p>
            <p>
              <strong className="text-indigo-300">
                Sequential Fingerprint (SeqFP)
              </strong>{" "}
              eshte hash qe lidh kete entry me te gjitha entry-t e meparshme.
              Llogaritet duke kombinuar SeqFP te entry-t para, FP te entry-t
              aktuale, dhe timestamp-in e serverit.
            </p>
            <div className="flex items-start gap-2 rounded-lg bg-indigo-500/10 p-3">
              <LinkIcon className="h-4 w-4 mt-0.5 text-indigo-400 shrink-0" />
              <p>
                <strong className="text-indigo-300">Pse ka rendesi?</strong>{" "}
                Nese dikush perpiqet te ndryshoje nje dokument te vjeter, SeqFP
                e atij entry ndryshon, qe shkakton ndryshimin e SeqFP per CDO
                entry pasardhese. Kjo eshte arsyeja pse quhet &quot;zinxhir&quot; -- eshte
                e pamundur te ndryshohet nje hallke pa prishur te gjitha hallkat
                pas saj.
              </p>
            </div>
            <p className="text-indigo-400/60 italic">
              Kjo eshte e njejta logjike qe perdorin blockchain-et si Bitcoin
              dhe Ethereum per te garantuar qe te dhenat jane te pandryshueshme.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Sub-components ───────────────────────── */

function ChainBlock({
  label,
  sequenceNumber,
  fingerprint,
  seqFingerprint,
  variant,
  href,
  mobile,
}: {
  label: string;
  sequenceNumber: number | null;
  fingerprint: string | null;
  seqFingerprint: string | null;
  variant: "current" | "muted";
  href?: string;
  mobile?: boolean;
}) {
  const isCurrent = variant === "current";
  const isEmpty = sequenceNumber === null;

  const blockClasses = isCurrent
    ? "border-2 border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
    : href
      ? "border border-border bg-muted hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer transition-all duration-200"
      : "border border-dashed border-border bg-muted/50";

  const widthClass = mobile
    ? "w-full max-w-[280px]"
    : isCurrent
      ? "min-w-[180px] max-w-[200px]"
      : "min-w-[150px] max-w-[170px]";

  const content = (
    <div className={`${blockClasses} ${widthClass} rounded-xl px-4 py-3`}>
      {/* Header: label + sequence number */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            isCurrent ? "text-indigo-400" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
        {!isEmpty && href && (
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* Sequence number */}
      <p
        className={`font-mono text-lg font-bold ${
          isCurrent
            ? "text-indigo-300"
            : isEmpty
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {isEmpty ? "--" : `#${sequenceNumber}`}
      </p>

      {/* Hash rows */}
      {!isEmpty && fingerprint && seqFingerprint && (
        <div className="mt-2 space-y-1">
          <div>
            <span className="text-[9px] font-medium text-green-500/70 uppercase tracking-wider">
              FP
            </span>
            <p className="font-mono text-[10px] text-foreground/70 leading-tight">
              {truncate(fingerprint, 8)}
            </p>
          </div>
          <div>
            <span className="text-[9px] font-medium text-purple-500/70 uppercase tracking-wider">
              SeqFP
            </span>
            <p className="font-mono text-[10px] text-foreground/70 leading-tight">
              {truncate(seqFingerprint, 8)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ChainArrow({ variant }: { variant: "active" | "default" | "dashed" }) {
  const lineColor =
    variant === "active"
      ? "bg-indigo-500"
      : variant === "dashed"
        ? "bg-border"
        : "bg-border";

  return (
    <div className="flex items-center self-center">
      <div
        className={`h-0.5 w-8 ${lineColor} ${variant === "dashed" ? "opacity-50" : ""}`}
        style={
          variant === "dashed"
            ? {
                backgroundImage:
                  "repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px)",
                backgroundColor: "transparent",
              }
            : undefined
        }
      />
      <ChevronRight
        className={`-ml-1 h-4 w-4 ${
          variant === "active"
            ? "text-indigo-500"
            : "text-muted-foreground"
        } ${variant === "dashed" ? "opacity-50" : ""}`}
      />
    </div>
  );
}

function ChainArrowVertical({
  variant,
}: {
  variant: "active" | "default" | "dashed";
}) {
  const lineColor =
    variant === "active" ? "bg-indigo-500" : "bg-border";

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-0.5 h-6 ${lineColor} ${variant === "dashed" ? "opacity-50" : ""}`}
      />
      <svg
        className={`h-3 w-3 -mt-0.5 ${
          variant === "active"
            ? "text-indigo-500"
            : "text-muted-foreground"
        } ${variant === "dashed" ? "opacity-50" : ""}`}
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 9L2 5h8L6 9z" />
      </svg>
    </div>
  );
}

function FormulaRow({
  label,
  value,
  color,
  href,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  href?: string;
  bold?: boolean;
}) {
  const valueEl = (
    <code
      className={`font-mono text-[10px] sm:text-[11px] ${
        bold ? "text-purple-300 font-semibold" : "text-foreground/60"
      } break-all`}
    >
      {value}
    </code>
  );

  return (
    <div className="flex items-start gap-2">
      <span
        className={`${color} text-[10px] sm:text-[11px] font-medium shrink-0 w-16 sm:w-20 text-right ${
          bold ? "font-bold" : ""
        }`}
      >
        {label}:
      </span>
      {href ? (
        <Link
          href={href}
          className="hover:underline decoration-dotted underline-offset-2"
        >
          {valueEl}
        </Link>
      ) : (
        valueEl
      )}
    </div>
  );
}
