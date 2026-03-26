"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle,
  Upload,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  ImageIcon,
  X,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PageSpinner, Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { KYC_STATUS } from "@/lib/constants/status";
import { cn } from "@/lib/cn";

interface KycData {
  kycStatus: string;
  kycDocumentUrl: string | null;
  kycVerifiedAt: string | null;
  phone: string | null;
  name: string | null;
  kycMetadata: {
    fullName?: string;
    dateOfBirth?: string;
    idNumber?: string;
    nationality?: string;
    address?: string;
    city?: string;
    phone?: string;
    documentType?: string;
  } | null;
}

type Step = 1 | 2 | 3;

export default function KycPage() {
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [nationality, setNationality] = useState("Shqiptar");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 fields
  const [documentType, setDocumentType] = useState("Karte Identiteti");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/kyc");
      const data: KycData = await res.json();
      setKycData(data);
      if (data.name) setFullName(data.name);
      if (data.phone) setPhone(data.phone);
      if (data.kycMetadata) {
        const m = data.kycMetadata;
        if (m.fullName) setFullName(m.fullName);
        if (m.dateOfBirth) setDateOfBirth(m.dateOfBirth);
        if (m.idNumber) setIdNumber(m.idNumber);
        if (m.nationality) setNationality(m.nationality);
        if (m.address) setAddress(m.address);
        if (m.city) setCity(m.city);
        if (m.phone) setPhone(m.phone);
        if (m.documentType) setDocumentType(m.documentType);
      }
    } catch {
      // ignore
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Pre-fill name from session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.name && !fullName) {
          setFullName(data.user.name);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileSelect(
    file: File | null,
    setter: (f: File | null) => void,
    previewSetter: (p: string | null) => void
  ) {
    setter(file);
    if (file) {
      const url = URL.createObjectURL(file);
      previewSetter(url);
    } else {
      previewSetter(null);
    }
  }

  function handleDrop(
    e: React.DragEvent,
    setter: (f: File | null) => void,
    previewSetter: (p: string | null) => void
  ) {
    e.preventDefault();
    const file = e.dataTransfer.files[0] || null;
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      handleFileSelect(file, setter, previewSetter);
    }
  }

  function canProceedStep1() {
    return fullName && dateOfBirth && idNumber && nationality && address && city && phone;
  }

  function canProceedStep2() {
    return frontFile !== null;
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("dateOfBirth", dateOfBirth);
    formData.append("idNumber", idNumber);
    formData.append("nationality", nationality);
    formData.append("address", address);
    formData.append("city", city);
    formData.append("phone", phone);
    formData.append("documentType", documentType);
    if (frontFile) formData.append("frontDocument", frontFile);
    if (backFile) formData.append("backDocument", backFile);
    if (selfieFile) formData.append("selfie", selfieFile);

    try {
      const res = await fetch("/api/settings/kyc", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Dokumentat u ngarkuan. KYC eshte ne pritje verifikimi nga administratori.");
      setKycData((prev) =>
        prev ? { ...prev, kycStatus: "PENDING" } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return <PageSpinner />;
  }

  // Verified state
  if (kycData?.kycStatus === "VERIFIED") {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
        <PageHeader title="Verifikimi i Identitetit (KYC)" />

        <div className="mt-8">
          <Alert
            variant="success"
            icon={<CheckCircle className="h-5 w-5" />}
            title="Identiteti i Verifikuar"
            description="Identiteti juaj eshte verifikuar me sukses. Mund te nenshkruani dokumente."
          />
        </div>

        {kycData.kycVerifiedAt && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Verifikuar me: {new Date(kycData.kycVerifiedAt).toLocaleDateString("sq-AL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    );
  }

  const stepTitles: Record<Step, string> = {
    1: "Informacioni Personal",
    2: "Ngarkimi i Dokumentit",
    3: "Konfirmimi",
  };

  const kycConfig = kycData?.kycStatus ? KYC_STATUS[kycData.kycStatus] : null;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Verifikimi i Identitetit (KYC)"
        subtitle="Plotesoni te dhenat tuaja personale dhe ngarkoni dokumentin e identitetit per te aktivizuar nenshkrimin e dokumentave."
      />

      {/* Status badge */}
      {kycData?.kycStatus && kycData.kycStatus !== "PENDING" && kycConfig && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Statusi:</span>
          <Badge variant={kycConfig.variant}>{kycConfig.label}</Badge>
        </div>
      )}

      {/* Success message after submit */}
      {message && (
        <div className="mt-4">
          <Alert
            variant="success"
            icon={<Check className="h-4 w-4" />}
            title={message}
          />
        </div>
      )}

      {!message && (
        <>
          {/* Step indicator */}
          <div className="mt-8 flex items-center gap-2">
            {([1, 2, 3] as Step[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (s < step) setStep(s);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors",
                    s === step
                      ? "bg-primary text-primary-foreground"
                      : s < step
                        ? "bg-green-600 text-white cursor-pointer"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {s < step ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    s
                  )}
                </button>
                {s < 3 && (
                  <div className={cn("h-0.5 w-12 sm:w-20", s < step ? "bg-green-600" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            {stepTitles[step]}
          </h2>

          {error && (
            <div className="mt-4">
              <Alert variant="destructive" title={error} />
            </div>
          )}

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Emri i plote *
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Emri Mbiemri"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Datelindja *
                  </label>
                  <Input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Numri Personal (ID) *
                  </label>
                  <Input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="J12345678A"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Kombesia *
                </label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-muted px-4 py-3 sm:py-2.5 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] sm:min-h-0"
                >
                  <option value="Shqiptar">Shqiptar</option>
                  <option value="Kosovar">Kosovar</option>
                  <option value="Tjeter">Tjeter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground">
                  Adresa *
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rruga, Nr."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Qyteti *
                  </label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Tirane"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Numri i telefonit *
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+355 6X XXX XXXX"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1()}
                  className="min-h-[48px]"
                >
                  Vazhdo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Document Upload */}
          {step === 2 && (
            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground">
                  Lloji i dokumentit *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-muted px-4 py-3 sm:py-2.5 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] sm:min-h-0"
                >
                  <option value="Karte Identiteti">Karte Identiteti</option>
                  <option value="Pasaporte">Pasaporte</option>
                  <option value="Patente Shofer">Patente Shofer</option>
                </select>
              </div>

              {/* Front document */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Foto e perparme e dokumentit *
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setFrontFile, setFrontPreview)}
                  onClick={() => frontRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <input
                    ref={frontRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setFrontFile, setFrontPreview)}
                    className="hidden"
                  />
                  {frontPreview ? (
                    <div className="space-y-2">
                      {frontFile?.type.startsWith("image/") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={frontPreview} alt="Para" className="mx-auto max-h-40 rounded-lg object-contain" />
                      )}
                      <p className="text-sm font-medium text-foreground">{frontFile?.name}</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setFrontFile(null); setFrontPreview(null); }}
                        className="text-destructive"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Hiqe
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Terhiqni dhe leshoni ose klikoni per te ngarkuar
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, ose PDF (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              {/* Back document - show only for Karte Identiteti */}
              {documentType === "Karte Identiteti" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Foto e pasme e dokumentit
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, setBackFile, setBackPreview)}
                    onClick={() => backRef.current?.click()}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <input
                      ref={backRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setBackFile, setBackPreview)}
                      className="hidden"
                    />
                    {backPreview ? (
                      <div className="space-y-2">
                        {backFile?.type.startsWith("image/") && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={backPreview} alt="Pas" className="mx-auto max-h-40 rounded-lg object-contain" />
                        )}
                        <p className="text-sm font-medium text-foreground">{backFile?.name}</p>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setBackFile(null); setBackPreview(null); }}
                          className="text-destructive"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Hiqe
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm font-medium text-foreground">
                          Terhiqni dhe leshoni ose klikoni per te ngarkuar
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, ose PDF (max 10MB)</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Selfie with document */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Selfie me dokumentin
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(opsionale, por e rekomanduar)</span>
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, setSelfieFile, setSelfiePreview)}
                  onClick={() => selfieRef.current?.click()}
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <input
                    ref={selfieRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setSelfieFile, setSelfiePreview)}
                    className="hidden"
                  />
                  {selfiePreview ? (
                    <div className="space-y-2">
                      {selfieFile?.type.startsWith("image/") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selfiePreview} alt="Selfie" className="mx-auto max-h-40 rounded-lg object-contain" />
                      )}
                      <p className="text-sm font-medium text-foreground">{selfieFile?.name}</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setSelfieFile(null); setSelfiePreview(null); }}
                        className="text-destructive"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Hiqe
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Beni nje selfie duke mbajtur dokumentin
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">JPG ose PNG (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep(1)} className="min-h-[48px]">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Kthehu
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2()}
                  className="min-h-[48px]"
                >
                  Vazhdo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    Informacioni Personal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Emri:</span>
                      <p className="font-medium text-foreground">{fullName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Datelindja:</span>
                      <p className="font-medium text-foreground">{dateOfBirth}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Numri Personal:</span>
                      <p className="font-medium text-foreground">{idNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kombesia:</span>
                      <p className="font-medium text-foreground">{nationality}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Adresa:</span>
                      <p className="font-medium text-foreground">{address}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qyteti:</span>
                      <p className="font-medium text-foreground">{city}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telefoni:</span>
                      <p className="font-medium text-foreground">{phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    Dokumenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Lloji:</span>
                      <span className="ml-2 font-medium text-foreground">{documentType}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Foto e perparme:</span>
                      <span className="ml-2 font-medium text-foreground">{frontFile?.name || "-"}</span>
                    </div>
                    {backFile && (
                      <div>
                        <span className="text-muted-foreground">Foto e pasme:</span>
                        <span className="ml-2 font-medium text-foreground">{backFile.name}</span>
                      </div>
                    )}
                    {selfieFile && (
                      <div>
                        <span className="text-muted-foreground">Selfie:</span>
                        <span className="ml-2 font-medium text-foreground">{selfieFile.name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Data processing consent */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <p className="font-medium text-foreground mb-1">Perpunimi i te dhenave personale</p>
                    <p>
                      Ne perputhje me Ligjin Nr. 9887, date 10.03.2008 &quot;Per Mbrojtjen e te Dhenave Personale&quot;
                      (i ndryshuar), te dhenat tuaja personale dhe dokumentet e identifikimit do te perpunohen
                      vetem per qellimin e verifikimit te identitetit dhe funksionimit te sherbimit te nenshkrimit elektronik.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  Konfirmoj qe te dhenat e mesiperme jane te sakta dhe te verteta. Pranoj dhe jap pelqimin
                  qe te dhenat e mia personale te perpunohen dhe verifikohen per qellim te funksionimit
                  te sherbimit te nenshkrimit elektronik, ne perputhje me Ligjin Nr. 9887 &quot;Per Mbrojtjen
                  e te Dhenave Personale&quot;.
                </span>
              </label>

              <div className="flex justify-between pt-2">
                <Button variant="secondary" onClick={() => setStep(2)} className="min-h-[48px]">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Kthehu
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !confirmed}
                  className="min-h-[48px]"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      Duke derguar...
                    </>
                  ) : (
                    "Dergo per Verifikim"
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
