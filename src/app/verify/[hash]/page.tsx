"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  X,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/spinner";

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
        <PageSpinner />
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
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                    <Check className="h-3.5 w-3.5 text-purple-600" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">
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
                  className="mt-1 block text-xs text-purple-600 hover:text-purple-500 hover:underline dark:text-purple-400"
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
