"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  ChevronRight,
  X,
  FileText,
  Upload,
  PenTool,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link?: string;
  linkLabel?: string;
}

/* ------------------------------------------------------------------ */
/*  Tutorial steps configuration                                      */
/* ------------------------------------------------------------------ */

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Mire se vini ne doc.al!",
    description:
      "Platforma e nenshkrimit elektronik dhe certifikimit dixhital. Le t'ju tregojme hapat kryesore.",
    icon: <Shield className="h-10 w-10 text-blue-600" strokeWidth={1.5} />,
  },
  {
    id: "kyc",
    title: "Verifikoni identitetin (KYC)",
    description:
      "Verifikoni identitetin tuaj per te perdorur platformen. Ngarkoni dokumentin e identitetit dhe plotesoni te dhenat personale.",
    icon: <Upload className="h-10 w-10 text-yellow-600" strokeWidth={1.5} />,
    link: "/settings/kyc",
    linkLabel: "Shko tek KYC",
  },
  {
    id: "signature",
    title: "Vendosni nenshkrimin tuaj",
    description:
      "Krijoni nenshkrimin tuaj dixhital qe do perdoret ne te gjitha dokumentet. Mund ta vizatoni, shkruani, ose ngarkoni.",
    icon: <PenTool className="h-10 w-10 text-blue-600" strokeWidth={1.5} />,
    link: "/settings/signature",
    linkLabel: "Shko tek Nenshkrimi",
  },
  {
    id: "self-sign",
    title: "Nenshkruani dokumentin e pare",
    description:
      "Ngarkoni nje PDF dokument dhe nenshkruajeni me nenshkrimin tuaj dixhital. Procesi eshte i thjeshte dhe i sigurt.",
    icon: <FileText className="h-10 w-10 text-green-600" strokeWidth={1.5} />,
    link: "/dashboard/contracts/self-sign",
    linkLabel: "Nenshkruaj Dokument",
  },
];

const STORAGE_KEY = "docal_onboarding_tutorial_completed";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.97,
    transition: { duration: 0.2 },
  },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OnboardingTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;

  // Check localStorage
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    // Also mark the banner's key so it doesn't show
    localStorage.setItem("docal_onboarding_complete", "true");
    setIsVisible(false);
  }, []);

  const handleFinish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem("docal_onboarding_complete", "true");
    setIsVisible(false);
  }, []);

  const handleStepLink = useCallback(() => {
    if (step.link) {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem("docal_onboarding_complete", "true");
      setIsVisible(false);
      router.push(step.link);
    }
  }, [step, router]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isVisible, handleNext, handleSkip]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${step.id}`}
          className="w-full max-w-md"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="relative rounded-2xl border border-border bg-white p-6 shadow-2xl dark:bg-slate-800 sm:p-8">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-700"
              aria-label="Mbyll tutorialin"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="mb-5 flex justify-center">
              {currentStep === 0 ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
                  <Image
                    src="/api/logo"
                    alt="doc.al"
                    width={48}
                    height={48}
                    className="h-12 w-12"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-700/50">
                  {step.icon}
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-center text-xl font-bold text-foreground">
              {step.title}
            </h3>

            {/* Description */}
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
              {step.description}
            </p>

            {/* Step link */}
            {step.link && (
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={handleStepLink}
              >
                {step.linkLabel}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            {/* Buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Kaperceni
              </button>

              {currentStep === totalSteps - 1 ? (
                <Button onClick={handleFinish} size="sm">
                  Perfundo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleNext} size="sm">
                  Vazhdo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Progress dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? "w-6 bg-primary"
                      : i < currentStep
                      ? "w-2 bg-primary/40"
                      : "w-2 bg-slate-300 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
