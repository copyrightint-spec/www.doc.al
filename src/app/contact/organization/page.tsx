"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle,
  ArrowLeft,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TurnstileCaptcha } from "@/components/ui/turnstile";

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  position: string;
  employees: string;
  industry: string;
  documentsPerMonth: string;
  needsCertificateAuthority: boolean;
  needsApiIntegration: boolean;
  needsWhiteLabel: boolean;
  needsCustomTemplates: boolean;
  currentSolution: string;
  message: string;
}

const initialForm: FormData = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  position: "",
  employees: "",
  industry: "",
  documentsPerMonth: "",
  needsCertificateAuthority: false,
  needsApiIntegration: false,
  needsWhiteLabel: false,
  needsCustomTemplates: false,
  currentSolution: "",
  message: "",
};

const employeeOptions = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

const industryOptions = [
  "Banka & Finance",
  "Drejtesi & Juridik",
  "Sigurime",
  "Shendesi",
  "Ndertim & Pasuri",
  "Telekomunikacion",
  "Administratr Publike",
  "Arsim",
  "Tjeter",
];

const docVolumeOptions = ["1-50", "51-200", "201-1000", "1000-5000", "5000+"];

export default function OrganizationContactPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  function updateField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Ndodhi nje gabim. Provoni perseri.");
      }
    } catch {
      setError("Ndodhi nje gabim. Provoni perseri.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
            </Link>
          </div>
        </nav>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Faleminderit!</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Kerkesa juaj u dergua me sukses. Ekipi yne do ju kontaktoje brenda
            24 oreve me nje oferte te personalizuar.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/">
              <Button>Kthehu ne Fillim</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="secondary">Krijo Llogari Individuale</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <span className="text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Hyr
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Llogari Falas</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Kthehu
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-foreground">
            Kerkoni Oferte per Organizaten Tuaj
          </h1>
          <p className="mt-3 text-muted-foreground">
            Plotesoni formen me te dhenat e organizates dhe nevojat tuaja. Ekipi
            yne do ju kontaktoje brenda 24 oreve me nje oferte te personalizuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Info */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Te dhenat e kompanise
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Emri i kompanise *
                </label>
                <Input
                  required
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  placeholder="Emri i kompanise"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Industria *
                </label>
                <select
                  required
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Zgjidhni industrine</option>
                  {industryOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Nr. punonjesve *
                </label>
                <select
                  required
                  value={form.employees}
                  onChange={(e) => updateField("employees", e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Zgjidhni</option>
                  {employeeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Dokumente/muaj (estim) *
                </label>
                <select
                  required
                  value={form.documentsPerMonth}
                  onChange={(e) =>
                    updateField("documentsPerMonth", e.target.value)
                  }
                  className="flex h-10 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Zgjidhni</option>
                  {docVolumeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Personi i kontaktit
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Emri i plote *
                </label>
                <Input
                  required
                  type="text"
                  value={form.contactName}
                  onChange={(e) => updateField("contactName", e.target.value)}
                  placeholder="Emri i plote"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Pozicioni
                </label>
                <Input
                  type="text"
                  value={form.position}
                  onChange={(e) => updateField("position", e.target.value)}
                  placeholder="p.sh. Drejtor IT, Menaxher"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Email *
                </label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="email@kompania.al"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Telefon
                </label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+355 6X XXX XXXX"
                />
              </div>
            </div>
          </div>

          {/* Needs */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Cfare ju nevojitet?
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  key: "needsCertificateAuthority" as const,
                  label: "Certificate Authority (CA) per organizaten",
                },
                {
                  key: "needsApiIntegration" as const,
                  label: "Integrim API me sistemet tona",
                },
                {
                  key: "needsWhiteLabel" as const,
                  label: "White-label / Custom branding",
                },
                {
                  key: "needsCustomTemplates" as const,
                  label: "Template te personalizuara nenshkrimesh",
                },
              ].map((need) => (
                <label
                  key={need.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                    form[need.key]
                      ? "border-slate-900 bg-muted dark:border-slate-400"
                      : "border-border hover:border-slate-400 dark:hover:border-slate-600"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={form[need.key]}
                    onChange={(e) => updateField(need.key, e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">{need.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Current Solution */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Cfare zgjidhje perdorni aktualisht per nenshkrime? (opsionale)
            </label>
            <Input
              type="text"
              value={form.currentSolution}
              onChange={(e) => updateField("currentSolution", e.target.value)}
              placeholder="p.sh. Nenshkrime me dore, DocuSign, asnje"
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Mesazh shtese (opsionale)
            </label>
            <Textarea
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              rows={4}
              placeholder="Pershkruani nevojat tuaja specifike..."
            />
          </div>

          {error && <Alert variant="destructive" title={error} />}

          <TurnstileCaptcha
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken("")}
            className="flex justify-center"
          />

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duke derguar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Dergo Kerkesen
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Duke derguar kete forme, ju pranoni qe te kontaktoheni nga ekipi yne
            per oferten.
          </p>
        </form>
      </div>
    </div>
  );
}
