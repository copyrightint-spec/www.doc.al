"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  FileText,
  Bitcoin,
  Link as LinkIcon,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageSpinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

interface VerificationResult {
  valid: boolean;
  sealInfo?: {
    organizationName: string;
    sealName: string;
    sealType: string;
    eidasLevel: string;
    etsiPolicy: string | null;
    appliedAt: string;
    appliedBy: string;
    documentTitle: string;
    documentHash: string;
  };
  timestamps?: {
    server: {
      timestamp: string;
      sequenceNumber: number;
      fingerprint: string;
    };
    bitcoin?: {
      status: string;
      txId: string | null;
      blockHeight: number | null;
      blockHash: string | null;
    };
  };
  certificate?: {
    serialNumber: string;
    subjectDN: string;
    issuerDN: string;
    validFrom: string;
    validTo: string;
    signatureValid: boolean;
  };
  chainIntegrity: boolean;
}

export default function SealVerificationPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch(`/api/v1/seals/verify?hash=${hash}`);
        const data = await res.json();
        if (data.success) {
          setResult(data.data);
        } else {
          setError(data.error || "Verifikimi deshtoi");
        }
      } catch {
        setError("Gabim ne lidhje me serverin");
      }
      setLoading(false);
    }
    verify();
  }, [hash]);

  if (loading) return <PageSpinner />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Verifikimi Deshtoi</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <p className="mt-4 font-mono text-xs text-muted-foreground break-all">{hash}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) return null;

  const isValid = result.valid;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex items-center justify-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <h1 className="text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Verifikim i Vules Dixhitale</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        {/* Status Banner */}
        <Card className={cn("border-2", isValid ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
          <CardContent className="flex items-center gap-4 p-6">
            {isValid ? (
              <CheckCircle className="h-12 w-12 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-12 w-12 text-red-500 shrink-0" />
            )}
            <div>
              <h2 className={cn("text-xl font-bold", isValid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {isValid ? "Vula eshte e Vlefshme" : "Vula nuk eshte e Vlefshme"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isValid
                  ? "Ky dokument eshte vulosur me vule dixhitale te verifikueshme"
                  : "Kjo vule nuk mund te verifikohet. Dokumenti mund te jete ndryshuar."}
              </p>
            </div>
          </CardContent>
        </Card>

        {result.sealInfo && (
          <>
            {/* Organization & Seal Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="h-4 w-4" /> Informacione te Vules
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Organizata</span>
                    <p className="mt-1 text-lg font-bold text-foreground">{result.sealInfo.organizationName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Emri i Vules</span>
                    <p className="mt-1 text-foreground">{result.sealInfo.sealName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Dokumenti</span>
                    <p className="mt-1 text-foreground">{result.sealInfo.documentTitle}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Aplikuar nga</span>
                    <p className="mt-1 text-foreground">{result.sealInfo.appliedBy}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Data e Vulosjes</span>
                    <p className="mt-1 text-foreground">{new Date(result.sealInfo.appliedAt).toLocaleString("sq-AL")}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Tipi</span>
                    <p className="mt-1 text-foreground">{result.sealInfo.sealType.replace(/_/g, " ")}</p>
                  </div>
                </div>

                {/* Compliance badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="success">eIDAS {result.sealInfo.eidasLevel}</Badge>
                  {result.sealInfo.etsiPolicy && <Badge variant="info">{result.sealInfo.etsiPolicy}</Badge>}
                  <Badge variant="default">SHA-256</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps - Dual verification */}
            {result.timestamps && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-4 w-4" /> Verifikimi i Timestamps (Dual)
                  </h3>

                  <div className="mt-4 space-y-4">
                    {/* Server timestamp */}
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-foreground">Server Timestamp (DOC.AL)</span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <p className="font-mono text-foreground">{new Date(result.timestamps.server.timestamp).toLocaleString("sq-AL")}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Chain #:</span>
                          <p className="font-mono text-foreground">#{result.timestamps.server.sequenceNumber}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fingerprint:</span>
                          <p className="font-mono text-foreground break-all">{result.timestamps.server.fingerprint.slice(0, 16)}...</p>
                        </div>
                      </div>
                    </div>

                    {/* Bitcoin timestamp */}
                    <div className="rounded-xl border border-border bg-muted/50 p-4">
                      <div className="flex items-center gap-2">
                        {result.timestamps.bitcoin?.status === "CONFIRMED" ? (
                          <Bitcoin className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                        )}
                        <span className="font-medium text-foreground">Bitcoin Timestamp (OpenTimestamps)</span>
                        <Badge variant={result.timestamps.bitcoin?.status === "CONFIRMED" ? "success" : "warning"}>
                          {result.timestamps.bitcoin?.status === "CONFIRMED" ? "Konfirmuar" : "Ne Pritje"}
                        </Badge>
                      </div>
                      {result.timestamps.bitcoin?.status === "CONFIRMED" ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                          {result.timestamps.bitcoin.blockHeight && (
                            <div>
                              <span className="text-muted-foreground">Block Height:</span>
                              <p className="font-mono text-foreground">#{result.timestamps.bitcoin.blockHeight.toLocaleString()}</p>
                            </div>
                          )}
                          {result.timestamps.bitcoin.txId && (
                            <div>
                              <span className="text-muted-foreground">TX ID:</span>
                              <p className="font-mono text-foreground break-all">{result.timestamps.bitcoin.txId.slice(0, 16)}...</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Konfirmimi ne Bitcoin zakonisht kerkon 1-2 ore. Provoni perseri me vone.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certificate info */}
            {result.certificate && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Shield className="h-4 w-4" /> Certifikata Dixhitale
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Serial Number:</span>
                      <p className="font-mono text-foreground">{result.certificate.serialNumber.slice(0, 24)}...</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <p className="text-foreground">{result.certificate.subjectDN}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issuer:</span>
                      <p className="text-foreground">{result.certificate.issuerDN}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nenshkrim Dixhital:</span>
                      <Badge variant={result.certificate.signatureValid ? "success" : "destructive"}>
                        {result.certificate.signatureValid ? "I Vlefshm" : "I Pavlefshem"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vlefshme nga:</span>
                      <p className="text-foreground">{new Date(result.certificate.validFrom).toLocaleDateString("sq-AL")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Skadon me:</span>
                      <p className="text-foreground">{new Date(result.certificate.validTo).toLocaleDateString("sq-AL")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hash */}
            <Card>
              <CardContent className="p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <LinkIcon className="h-4 w-4" /> Hash Verifikimi
                </h3>
                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Certification Hash (SHA-256):</span>
                    <p className="mt-1 break-all rounded-lg bg-muted p-2 font-mono text-foreground">{hash}</p>
                  </div>
                  {result.sealInfo.documentHash && (
                    <div>
                      <span className="text-muted-foreground">Document Hash (SHA-256):</span>
                      <p className="mt-1 break-all rounded-lg bg-muted p-2 font-mono text-foreground">{result.sealInfo.documentHash}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Verifikuar nga doc.al - Platforma e Nenshkrimeve Elektronike</p>
          <p className="mt-1">Konform me Rregulloren eIDAS (EU) Nr. 910/2014 dhe standardet ETSI</p>
        </div>
      </div>
    </div>
  );
}
