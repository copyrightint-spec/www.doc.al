"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Shield,
  PenTool,
  Lock,
  FileText,
  Upload,
  Clock,
  Users,
  Send,
  Mail,
  Zap,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const goTo = useCallback(
    (step: number, dir: "next" | "prev") => {
      if (animating || step < 0 || step >= TOTAL_STEPS) return;
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(step);
        setAnimating(false);
      }, 300);
    },
    [animating]
  );

  const next = () => goTo(currentStep + 1, "next");
  const prev = () => goTo(currentStep - 1, "prev");

  const skip = () => {
    localStorage.setItem("docal_onboarding_complete", "true");
    router.push("/dashboard");
  };

  const finish = () => {
    if (dontShowAgain) {
      localStorage.setItem("docal_onboarding_complete", "true");
    }
    router.push("/dashboard");
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentStep < TOTAL_STEPS - 1) next();
      if (e.key === "ArrowLeft" && currentStep > 0) prev();
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, animating]);

  const slideClass = animating
    ? direction === "next"
      ? "translate-x-8 opacity-0"
      : "-translate-x-8 opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Hapi {currentStep + 1} nga {TOTAL_STEPS}
        </span>
        <Button variant="ghost" size="sm" onClick={skip}>
          Kalo
        </Button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-hidden">
        <div
          className={`w-full max-w-5xl transition-all duration-300 ease-in-out ${slideClass}`}
        >
          {currentStep === 0 && <StepWelcome />}
          {currentStep === 1 && <StepKYC />}
          {currentStep === 2 && <StepCertificate />}
          {currentStep === 3 && <StepSigning />}
          {currentStep === 4 && <StepBlockchain />}
          {currentStep === 5 && (
            <StepReady
              dontShowAgain={dontShowAgain}
              setDontShowAgain={setDontShowAgain}
              onFinish={finish}
            />
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button
            variant="ghost"
            onClick={prev}
            disabled={currentStep === 0}
            className="disabled:opacity-0 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            Para
          </Button>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > currentStep ? "next" : "prev")}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-8 bg-primary"
                    : i < currentStep
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-slate-300 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button onClick={next}>
              {currentStep === 0 ? "Filloni" : "Vazhdo"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[106px]" />
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Step Components --- */

function StepWelcome() {
  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="destructive" className="mb-6">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Tutorial
        </Badge>
        <h1 className="text-4xl font-bold text-foreground leading-tight">
          Mire se vini ne{" "}
          <span className="text-primary">doc.al</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Platforma e nenshkrimit elektronik dhe certifikimit dixhital per
          Shqiperine. Nenshkruani dokumente, verifikoni identitete, dhe
          ruani prova te pakundershtueshme ne blockchain.
        </p>
        <p className="mt-3 text-sm text-muted-foreground/70">
          Ky tutorial do t&apos;ju udhezoje hap pas hapi ne procesin e plote.
        </p>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-56 h-56 rounded-3xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 flex items-center justify-center">
            <Shield className="w-28 h-28 text-primary/80" strokeWidth={1} />
          </div>
          {/* Floating document */}
          <div className="absolute -top-4 -right-4 w-20 h-24 rounded-2xl bg-card shadow-lg border border-border flex flex-col items-center justify-center gap-1.5 p-3">
            <div className="w-10 h-1 rounded bg-slate-300 dark:bg-slate-600" />
            <div className="w-12 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="w-8 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="w-11 h-1 rounded bg-slate-200 dark:bg-slate-700" />
            <PenTool className="w-5 h-5 text-primary mt-1" strokeWidth={2} />
          </div>
          {/* Floating lock */}
          <div className="absolute -bottom-3 -left-3 w-14 h-14 rounded-2xl bg-card shadow-lg border border-border flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepKYC() {
  const subSteps = [
    { icon: FileText, title: "Plotesoni te dhenat personale", desc: "Emri, mbiemri, numri personal" },
    { icon: Upload, title: "Ngarkoni dokumentin e identitetit", desc: "Karte identiteti ose pasaporte" },
    { icon: Clock, title: "Prisni verifikimin nga administratori", desc: "Zakonisht brenda 24 oreve" },
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="warning" className="mb-4">Hapi 2</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Verifikoni Identitetin (KYC)
        </h2>
        <p className="mt-3 text-muted-foreground">
          Per te nenshkruar dokumente, duhet te verifikoni identitetin tuaj.
          Ky proces siguron qe nenshkrimi juaj eshte i vlefshem ligjerisht.
        </p>

        <div className="mt-8 space-y-4">
          {subSteps.map((s, i) => (
            <Card key={i} className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-400">
                <s.icon className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {i + 1}. {s.title}
                </p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <Button className="mt-6 bg-yellow-600 hover:bg-yellow-700" asChild>
          <Link href="/settings/kyc">
            Shko tek KYC
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-64 h-44 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-950/30 dark:to-orange-900/20 border border-yellow-200/50 dark:border-yellow-800/30 p-6 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-200/60 dark:bg-yellow-800/40" />
              <div className="space-y-1.5">
                <div className="w-20 h-2 rounded bg-yellow-300/60 dark:bg-yellow-700/50" />
                <div className="w-14 h-2 rounded bg-yellow-200/60 dark:bg-yellow-800/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="w-32 h-1.5 rounded bg-yellow-200/60 dark:bg-yellow-800/40" />
              <div className="w-24 h-1.5 rounded bg-yellow-200/60 dark:bg-yellow-800/40" />
            </div>
          </div>
          <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCertificate() {
  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="info" className="mb-4">Hapi 3</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Certifikata Dixhitale
        </h2>
        <p className="mt-3 text-muted-foreground">
          Pasi administratori verifikon identitetin, ai do t&apos;ju gjeneroje nje
          certifikate dixhitale X.509.
        </p>
        <p className="mt-3 text-muted-foreground">
          Certifikata lidh nenshkrimin tuaj me identitetin tuaj te verifikuar.
          Kjo garanton qe cdo dokument i nenshkruar mund te verifikohet se
          eshte nenshkruar nga ju.
        </p>

        <Alert
          variant="info"
          className="mt-6"
          icon={<Shield className="h-5 w-5" />}
          title="Kjo behet automatikisht nga administratori. Ju do te njoftoheni me email kur certifikata te jete gati."
        />
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="w-52 h-64 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/30 p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
            </div>
            <div className="w-28 h-2 rounded bg-blue-200/60 dark:bg-blue-800/40 mb-2" />
            <div className="w-20 h-2 rounded bg-blue-200/60 dark:bg-blue-800/40 mb-4" />
            <div className="w-24 h-1.5 rounded bg-blue-100/80 dark:bg-blue-900/30" />
            <div className="w-16 h-1.5 rounded bg-blue-100/80 dark:bg-blue-900/30 mt-1.5" />
            <div className="mt-4 w-10 h-10 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-400 dark:bg-blue-600" />
            </div>
          </div>
          <div className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-card shadow-lg border border-border flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSigning() {
  const flowSteps = [
    { icon: Upload, label: "Ngarkoni ose zgjidhni nje template" },
    { icon: Users, label: "Shtoni nenshkruesit (email)" },
    { icon: Send, label: "Dergoni per nenshkrim" },
    { icon: Mail, label: "Secili nenshkrues merr email me link" },
    { icon: PenTool, label: "Nenshkruesi verifikon me OTP dhe nenshkruan" },
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="success" className="mb-4">Hapi 4</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Nenshkruani Dokumenta
        </h2>
        <p className="mt-3 text-muted-foreground mb-6">
          Procesi i nenshkrimit eshte i thjeshte dhe i sigurt. Ja si funksionon:
        </p>

        <div className="space-y-3">
          {flowSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400">
                <s.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          {flowSteps.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border ${
                  i === 0
                    ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-950/50 dark:border-green-800 dark:text-green-400"
                    : i === flowSteps.length - 1
                    ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400"
                    : "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                <s.icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              {i < flowSteps.length - 1 && (
                <ChevronRight className="w-4 h-6 text-muted-foreground rotate-90" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepBlockchain() {
  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="purple" className="mb-4">Hapi 5</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Timestamp &amp; Blockchain
        </h2>
        <p className="mt-3 text-muted-foreground">
          Cdo nenshkrim ruhet me timestamp ne zinxhirin tone te sigurise.
          Kjo provon se dokumenti u nenshkrua ne nje moment te caktuar kohor.
        </p>
        <p className="mt-3 text-muted-foreground">
          Timestamps ankorohen ne Bitcoin blockchain per prove te
          pakundershtueshme. Askush nuk mund ta ndryshoje ose fshije kete
          prove.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Card className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Clock className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Timestamp Server</p>
              <p className="text-xs text-muted-foreground">time.copyright.al - RFC 3161</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
              <Zap className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Bitcoin Blockchain</p>
              <p className="text-xs text-muted-foreground">OpenTimestamps - prove e perhershme</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="relative w-56 h-56">
          <div className="absolute top-4 left-8 w-20 h-12 rounded-full border-4 border-purple-300 dark:border-purple-700" />
          <div className="absolute top-12 left-20 w-20 h-12 rounded-full border-4 border-purple-400 dark:border-purple-600" />
          <div className="absolute top-20 left-8 w-20 h-12 rounded-full border-4 border-purple-500 dark:border-purple-500" />
          <div className="absolute top-28 left-20 w-20 h-12 rounded-full border-4 border-orange-400 dark:border-orange-600" />
          <div className="absolute bottom-2 right-4 w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-950/50 border-2 border-orange-300 dark:border-orange-700 flex items-center justify-center">
            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">B</span>
          </div>
          <div className="absolute top-0 right-2 w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReady({
  dontShowAgain,
  setDontShowAgain,
  onFinish,
}: {
  dontShowAgain: boolean;
  setDontShowAgain: (v: boolean) => void;
  onFinish: () => void;
}) {
  const checklist = [
    "Verifikoni KYC",
    "Prisni certifikaten",
    "Ngarkoni dokumentin e pare",
    "Dergoni per nenshkrim",
  ];

  return (
    <div className="grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <Badge variant="success" className="mb-4">Perfundim</Badge>
        <h2 className="text-3xl font-bold text-foreground">
          Jeni Gati!
        </h2>
        <p className="mt-3 text-muted-foreground">
          Tani qe e dini si funksionon platforma, ja hapat qe duhet te ndiqni:
        </p>

        <div className="mt-6 space-y-3">
          {checklist.map((item, i) => (
            <Card key={i} className="flex items-center gap-3 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-slate-300 dark:border-slate-600">
                <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
              </div>
              <span className="text-sm text-foreground">{item}</span>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <Button onClick={onFinish} size="lg" className="w-full sm:w-auto">
            Shko tek Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 accent-primary"
            />
            <span className="text-sm text-muted-foreground">
              Mos e shfaq me kete tutorial
            </span>
          </label>
        </div>
      </div>

      {/* Illustration */}
      <div className="flex items-center justify-center">
        <div className="relative w-56 h-56 rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/20 flex items-center justify-center">
          <CheckCircle className="w-24 h-24 text-green-500" strokeWidth={1} />
          <div className="absolute top-4 right-6 w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
          <div className="absolute top-10 left-6 w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-8 right-10 w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-12 left-10 w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
        </div>
      </div>
    </div>
  );
}
