"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  X,
  Clock,
  Link as LinkIcon,
  Upload,
  PenTool,
  Shield,
  Link2,
  Hexagon,
  Globe,
  Hash,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface SignerInfo {
  name: string;
  signedAt: string | null;
  order: number;
}

interface BlockchainInfo {
  anchored: boolean;
  status: string;
  btcBlockHeight: number | null;
  btcTxId: string | null;
}

interface HashTimelineStep {
  step: number;
  action: string;
  hash?: string;
  cid?: string;
  timestamp: string;
  label: string;
  status: "completed" | "in-progress" | "pending";
}

interface VerificationData {
  documentTitle: string;
  certificationHash: string;
  stampedAt: string;
  signerCount: number;
  signers: SignerInfo[];
  blockchain: BlockchainInfo;
  chainIntegrity: boolean;
  fileHash: string;
  ipfsCid: string | null;
  ipfsUrl: string | null;
  documentCreatedAt: string;
  hashTimeline?: HashTimelineStep[];
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("sq-AL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const VERIFY_HASH_ICONS: Record<string, typeof Hash> = {
  UPLOAD: Upload,
  VISUAL_SIGN: PenTool,
  PADES_SIGN: Shield,
  CHAIN: Link2,
  POLYGON: Hexagon,
  IPFS: Globe,
};

function VerifyHashTimeline({ steps }: { steps: HashTimelineStep[] }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="mt-3 space-y-2">
      {steps.map((step) => {
        const IconComponent = VERIFY_HASH_ICONS[step.action] || Hash;
        const displayHash = step.hash || step.cid || "";
        const isExpanded = expandedStep === step.step;
        const isCompleted = step.status === "completed";

        return (
          <div key={step.step} className="flex items-start gap-3 rounded-xl bg-muted px-4 py-3">
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
                isCompleted
                  ? "bg-green-100 dark:bg-green-900/40"
                  : step.status === "in-progress"
                  ? "bg-blue-100 dark:bg-blue-900/40"
                  : "bg-gray-100 dark:bg-gray-800"
              )}
            >
              <IconComponent
                className={cn(
                  "h-3.5 w-3.5",
                  isCompleted
                    ? "text-green-600 dark:text-green-400"
                    : step.status === "in-progress"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                )}
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground">
                  {step.step}
                </span>
                <p className="text-sm font-medium text-foreground">{step.label}</p>
                {!isCompleted && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      step.status === "in-progress"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    )}
                  >
                    {step.status === "in-progress" ? "Ne progres" : "Ne pritje"}
                  </span>
                )}
              </div>
              {displayHash && (
                <button
                  onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                  className="mt-1 flex w-full items-center gap-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="truncate">
                    {isExpanded
                      ? displayHash
                      : displayHash.substring(0, 16) + "..." + displayHash.substring(displayHash.length - 6)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(displayHash);
                    }}
                    className="flex-shrink-0 rounded p-0.5 hover:bg-muted-foreground/10"
                  >
                    {copiedHash === displayHash ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                  )}
                </button>
              )}
              <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                {formatDate(step.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VerifyPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/verify/${hash}`);
        const json = await res.json();
        if (json.valid) {
          setData(json.data);
          setValid(true);
        } else {
          setError(json.error || "Dokumenti nuk u gjet");
          setValid(false);
        }
      } catch {
        setError("Ndodhi nje gabim ne lidhje me serverin");
        setValid(false);
      }
      setLoading(false);
    }
    if (hash) verify();
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
          <Skeleton className="h-7 w-56 mx-auto" />
          {/* Status card skeleton */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-4 p-6">
              <Skeleton className="h-14 w-14 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
              <div className="px-6 py-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <span className="text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </div>
          <span className="text-xs text-muted-foreground">Verifikim Publik</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {/* Title */}
        <h1 className="mb-8 text-center text-2xl font-bold text-foreground">
          Verifikim i Dokumentit
        </h1>

        {/* Status Card */}
        <Card className="mb-6 overflow-hidden">
          <div
            className={cn(
              "flex items-center gap-4 p-6",
              valid
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            )}
          >
            {valid ? (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-green-500">
                <Check className="h-8 w-8 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-red-500">
                <X className="h-8 w-8 text-white" strokeWidth={3} />
              </div>
            )}
            <div>
              <h2
                className={cn(
                  "text-xl font-bold",
                  valid
                    ? "text-green-800 dark:text-green-300"
                    : "text-red-800 dark:text-red-300"
                )}
              >
                {valid
                  ? "Dokumenti eshte i verifikuar"
                  : "Dokumenti nuk u verifikua"}
              </h2>
              <p
                className={cn(
                  "mt-1 text-sm",
                  valid
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {valid
                  ? "Ky dokument eshte certifikuar me sukses nga DOC.AL"
                  : error || "Hash-i i certifikimit nuk u gjet ne sistem"}
              </p>
            </div>
          </div>

          {/* Document Details */}
          {valid && data && (
            <div className="divide-y divide-border">
              {/* Document Title */}
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-muted-foreground">Dokumenti</span>
                <span className="font-medium text-foreground">
                  {data.documentTitle}
                </span>
              </div>

              {/* Certification Hash */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Hash i Certifikimit
                </span>
                <p className="mt-1 break-all rounded-xl bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {data.certificationHash}
                </p>
              </div>

              {/* File Hash */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Hash i Dokumentit (SHA-256)
                </span>
                <p className="mt-1 break-all rounded-xl bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {data.fileHash}
                </p>
              </div>

              {/* Stamped At */}
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Data e Certifikimit
                </span>
                <span className="text-sm font-medium text-foreground">
                  {formatDate(data.stampedAt)}
                </span>
              </div>

              {/* Signers */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Nenshkruesit ({data.signerCount})
                </span>
                <div className="mt-3 space-y-2">
                  {data.signers.map((signer, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-muted px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {signer.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Radha: {signer.order + 1}
                          </p>
                        </div>
                      </div>
                      {signer.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(signer.signedAt)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Polygon Blockchain */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Polygon Blockchain (STAMLES)
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                    <Check className="h-3.5 w-3.5 text-blue-600" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    I regjistruar ne Polygon
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Hash-i eshte ne STAMLES Merkle batch queue per Polygon blockchain.
                </p>
                <a
                  href="https://amoy.polygonscan.com/address/0x62ab62912b89fA0aA3A1af3CF0dFAbAE3976EC85#events"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                >
                  Shiko ne PolygonScan
                </a>
              </div>

              {/* IPFS Decentralized Proof */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  IPFS Decentralized Proof
                </span>
                <div className="mt-2 flex items-center gap-2">
                  {data.ipfsCid ? (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                        <Check className="h-3.5 w-3.5 text-blue-600" strokeWidth={3} />
                      </div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        E ruajtur ne blockchain IPFS
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        IPFS nuk eshte i disponueshem
                      </span>
                    </>
                  )}
                </div>
                {data.ipfsCid && (
                  <div className="mt-2">
                    <a
                      href={data.ipfsUrl || `https://ipfs.io/ipfs/${data.ipfsCid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-xs text-blue-600 hover:text-blue-500 hover:underline dark:text-blue-400"
                    >
                      ipfs.io/ipfs/{data.ipfsCid}
                    </a>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Prova kriptografike e nenshkrimit eshte e ruajtur ne blockchain-in global te decentralizuar IPFS.
                      Kjo prove eshte e shperndare ne te gjithe boten dhe nuk mund te ndryshohet ose fshihet nga askush.
                      Klikoni per ta verifikuar direkt ne rrjetin IPFS.
                    </p>
                  </div>
                )}
              </div>

              {/* Hash Timeline */}
              {data.hashTimeline && data.hashTimeline.length > 0 && (
                <div className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">
                    Kronologjia e Hash-eve
                  </span>
                  <VerifyHashTimeline steps={data.hashTimeline} />
                </div>
              )}

              {/* Chain Integrity */}
              <div className="px-6 py-4">
                <span className="text-sm text-muted-foreground">
                  Integriteti i Zinxhirit
                </span>
                <div className="mt-2 flex items-center gap-2">
                  {data.chainIntegrity ? (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                        <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={3} />
                      </div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        Zinxhiri i nenshkrimeve eshte i plote
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                        <X className="h-3.5 w-3.5 text-red-600" strokeWidth={3} />
                      </div>
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        Problem me integritetin e zinxhirit
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Verifikuar nga platforma DOC.AL - Nenshkrime Dixhitale te Sigurta
          </p>
          <a
            href="https://www.doc.al"
            className="mt-1 inline-block text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            www.doc.al
          </a>
        </div>
      </main>
    </div>
  );
}
