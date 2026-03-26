"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Users,
  Send,
  CheckCircle,
  MousePointer2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  subSteps?: string[];
  target?: string; // CSS selector for spotlight
  position: "top" | "bottom" | "left" | "right" | "center";
  cursorTarget?: string; // CSS selector for animated cursor destination
  icon?: React.ReactNode;
  type: "welcome" | "highlight" | "done";
}

/* ------------------------------------------------------------------ */
/*  Tutorial steps configuration                                      */
/* ------------------------------------------------------------------ */

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Mire se erdhet ne doc.al!",
    description:
      "Le t'ju tregojme si funksionon platforma. Ky udhezues interaktiv do t'ju tregoje hapat kryesore.",
    position: "center",
    type: "welcome",
    icon: <Shield className="h-10 w-10 text-blue-600" strokeWidth={1.5} />,
  },
  {
    id: "kyc",
    title: "Verifikoni Identitetin (KYC)",
    description:
      "Hapi i pare: Verifikoni identitetin tuaj per te perdorur platformen.",
    subSteps: [
      "Shkoni te Cilesimet \u2192 Verifikimi KYC",
      "Ngarkoni dokumentin e identitetit",
      "Plotesoni te dhenat personale",
      "Prisni aprovimin nga administratori",
    ],
    target: '[data-onboarding="kyc-alert"]',
    cursorTarget: '[data-onboarding="kyc-alert"]',
    position: "bottom",
    type: "highlight",
    icon: <Upload className="h-6 w-6 text-yellow-600" strokeWidth={1.5} />,
  },
  {
    id: "signature",
    title: "Krijoni Nenshkrimin Dixhital",
    description:
      "Krijoni nenshkrimin tuaj dixhital qe do perdoret ne te gjitha dokumentet.",
    subSteps: [
      "Vizatoni nenshkrimin me dore",
      "Shkruani me tekst nenshkrimin tuaj",
      "Ngarkoni nje imazh te nenshkrimit",
    ],
    target: '[data-onboarding="settings-menu"]',
    cursorTarget: '[data-onboarding="settings-menu"]',
    position: "right",
    type: "highlight",
    icon: <PenTool className="h-6 w-6 text-blue-600" strokeWidth={1.5} />,
  },
  {
    id: "self-sign",
    title: "Nenshkruani nje Dokument",
    description: "Nenshkruani dokumentet tuaja me nje klik.",
    subSteps: [
      "Ngarkoni nje PDF dokument",
      "Vendosni nenshkrimin ne pozicionin e duhur",
      "Konfirmoni dhe verifikoni",
    ],
    target: '[data-onboarding="esign-menu"]',
    cursorTarget: '[data-onboarding="esign-menu"]',
    position: "right",
    type: "highlight",
    icon: <FileText className="h-6 w-6 text-green-600" strokeWidth={1.5} />,
  },
  {
    id: "agreement",
    title: "Krijoni nje Marreveshje",
    description:
      "Krijoni marreveshje me shume pale dhe ftoni per nenshkrim.",
    subSteps: [
      "Shtoni palet e marreveshjes",
      "Vendosni kushtet dhe dokumentet",
      "Dergoni per nenshkrim",
    ],
    target: '[data-onboarding="esign-menu"]',
    cursorTarget: '[data-onboarding="esign-menu"]',
    position: "right",
    type: "highlight",
    icon: <Users className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />,
  },
  {
    id: "done",
    title: "Jeni gati!",
    description: "Filloni te perdorni doc.al per nenshkrime te sigurta.",
    position: "center",
    type: "done",
    icon: (
      <CheckCircle className="h-10 w-10 text-green-500" strokeWidth={1.5} />
    ),
  },
];

const STORAGE_KEY = "docal_onboarding_tutorial_completed";

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 25, stiffness: 300, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const confettiVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: [0, 1, 1, 0],
    scale: [0, 1.2, 1, 0.5],
    x: [0, (i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 60)],
    y: [0, -(40 + Math.random() * 80), 20],
    rotate: [0, (i % 2 === 0 ? 1 : -1) * 180],
    transition: {
      duration: 1.5,
      delay: i * 0.08,
      ease: "easeOut",
    },
  }),
};

/* ------------------------------------------------------------------ */
/*  Spotlight component                                                */
/* ------------------------------------------------------------------ */

function Spotlight({ targetSelector }: { targetSelector?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);

    const handleResize = () => {
      const updated = el.getBoundingClientRect();
      setRect(updated);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [targetSelector]);

  if (!rect) return null;

  const padding = 8;
  const x = rect.left - padding;
  const y = rect.top - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;
  const r = 12;

  return (
    <motion.svg
      className="pointer-events-none fixed inset-0 z-[9998] h-full w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <defs>
        <mask id="spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.6)"
        mask="url(#spotlight-mask)"
      />
      {/* Animated border around spotlight */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        stroke="rgba(59,130,246,0.5)"
        strokeWidth="2"
        className="animate-pulse"
      />
    </motion.svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated cursor                                                    */
/* ------------------------------------------------------------------ */

function AnimatedCursor({
  targetSelector,
}: {
  targetSelector?: string;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [clicking, setClicking] = useState(false);

  useEffect(() => {
    if (!targetSelector) {
      setPos(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    // Click animation loop
    const interval = setInterval(() => {
      setClicking(true);
      setTimeout(() => setClicking(false), 400);
    }, 2000);

    return () => clearInterval(interval);
  }, [targetSelector]);

  if (!pos) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[10001]"
      initial={{ x: pos.x + 80, y: pos.y + 80, opacity: 0 }}
      animate={{
        x: pos.x - 4,
        y: pos.y - 4,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: 0.5,
      }}
    >
      <MousePointer2
        className={cn(
          "h-7 w-7 drop-shadow-lg transition-transform duration-200",
          clicking ? "scale-90 text-blue-400" : "text-white"
        )}
        strokeWidth={2}
        fill="rgba(59,130,246,0.3)"
      />
      {/* Click ripple */}
      <AnimatePresence>
        {clicking && (
          <motion.div
            className="absolute left-1 top-1 h-5 w-5 rounded-full border-2 border-blue-400"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip positioning                                                */
/* ------------------------------------------------------------------ */

function useTooltipPosition(
  targetSelector: string | undefined,
  position: TutorialStep["position"]
) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (position === "center" || !targetSelector) {
      setStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const compute = () => {
      const rect = el.getBoundingClientRect();
      const gap = 16;

      switch (position) {
        case "bottom":
          setStyle({
            position: "fixed",
            top: rect.bottom + gap,
            left: Math.max(16, Math.min(rect.left, window.innerWidth - 400)),
          });
          break;
        case "top":
          setStyle({
            position: "fixed",
            bottom: window.innerHeight - rect.top + gap,
            left: Math.max(16, Math.min(rect.left, window.innerWidth - 400)),
          });
          break;
        case "right":
          setStyle({
            position: "fixed",
            top: Math.max(16, rect.top),
            left: rect.right + gap,
          });
          break;
        case "left":
          setStyle({
            position: "fixed",
            top: Math.max(16, rect.top),
            right: window.innerWidth - rect.left + gap,
          });
          break;
        default:
          setStyle({
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          });
      }
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [targetSelector, position]);

  return style;
}

/* ------------------------------------------------------------------ */
/*  Confetti                                                           */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-400",
  "bg-red-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-orange-400",
  "bg-teal-500",
];

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[10002] flex items-center justify-center overflow-hidden">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={confettiVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "absolute h-3 w-3 rounded-sm",
            CONFETTI_COLORS[i % CONFETTI_COLORS.length]
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Arrow pointing to target                                           */
/* ------------------------------------------------------------------ */

function TooltipArrow({
  position,
}: {
  position: TutorialStep["position"];
}) {
  if (position === "center") return null;

  const arrowClass = {
    bottom:
      "-top-2 left-8 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white dark:border-b-slate-800",
    top: "-bottom-2 left-8 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-slate-800",
    right:
      "top-6 -left-2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white dark:border-r-slate-800",
    left: "top-6 -right-2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white dark:border-l-slate-800",
  };

  return (
    <div
      className={cn("absolute h-0 w-0", arrowClass[position])}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OnboardingTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevStepRef = useRef(0);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const tooltipStyle = useTooltipPosition(step.target, step.position);

  // Check localStorage
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so dashboard can render first
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Trigger confetti on done step
  useEffect(() => {
    if (step.type === "done" && prevStepRef.current !== currentStep) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    prevStepRef.current = currentStep;
  }, [currentStep, step.type]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  const handleFinish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    router.push("/dashboard/contracts/self-sign");
  }, [router]);

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
    <>
      <AnimatePresence mode="wait">
        {/* Overlay */}
        <motion.div
          key="overlay"
          className="fixed inset-0 z-[9997]"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {/* Dark backdrop for center steps (no target) */}
          {step.type !== "highlight" && (
            <div className="absolute inset-0 bg-black/60" />
          )}
        </motion.div>

        {/* Spotlight for highlight steps */}
        {step.type === "highlight" && step.target && (
          <Spotlight key={`spotlight-${step.id}`} targetSelector={step.target} />
        )}

        {/* Animated cursor */}
        {step.type === "highlight" && step.cursorTarget && (
          <AnimatedCursor
            key={`cursor-${step.id}`}
            targetSelector={step.cursorTarget}
          />
        )}

        {/* Tooltip / Card */}
        <motion.div
          key={`tooltip-${step.id}`}
          className="fixed z-[9999]"
          style={tooltipStyle}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div
            className={cn(
              "relative w-[340px] rounded-2xl border border-border bg-white p-6 shadow-2xl dark:bg-slate-800 sm:w-[380px]",
              step.type === "welcome" && "w-[400px] sm:w-[440px]",
              step.type === "done" && "w-[400px] sm:w-[440px]"
            )}
          >
            <TooltipArrow position={step.position} />

            {/* Progress bar */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-blue-600"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {currentStep + 1}/{totalSteps}
              </span>
            </div>

            {/* Welcome special layout */}
            {step.type === "welcome" && (
              <motion.div
                className="mb-4 flex items-center justify-center"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, delay: 0.3 }}
              >
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
              </motion.div>
            )}

            {/* Done special layout */}
            {step.type === "done" && (
              <motion.div
                className="mb-4 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.2 }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30">
                  {step.icon}
                </div>
              </motion.div>
            )}

            {/* Icon for highlight steps */}
            {step.type === "highlight" && step.icon && (
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50">
                {step.icon}
              </div>
            )}

            {/* Title */}
            <h3
              className={cn(
                "font-bold text-foreground",
                step.type === "welcome" || step.type === "done"
                  ? "text-center text-xl"
                  : "text-lg"
              )}
            >
              {step.title}
            </h3>

            {/* Description */}
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed text-muted-foreground",
                (step.type === "welcome" || step.type === "done") && "text-center"
              )}
            >
              {step.description}
            </p>

            {/* Sub-steps */}
            {step.subSteps && step.subSteps.length > 0 && (
              <div className="mt-4 space-y-2">
                {step.subSteps.map((sub, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2.5"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {i + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{sub}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Signature preview for step 3 */}
            {step.id === "signature" && (
              <motion.div
                className="mt-4 flex items-center gap-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                  <PenTool className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                  <span className="text-xs italic text-muted-foreground">
                    Aa
                  </span>
                </div>
                <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.div>
            )}

            {/* Agreement flow visual for step 5 */}
            {step.id === "agreement" && (
              <motion.div
                className="mt-4 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {[
                  { icon: Users, color: "text-indigo-500" },
                  { icon: FileText, color: "text-blue-500" },
                  { icon: Send, color: "text-green-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <motion.div
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-700/50"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7 + i * 0.15 }}
                    >
                      <item.icon
                        className={cn("h-4 w-4", item.color)}
                        strokeWidth={1.5}
                      />
                    </motion.div>
                    {i < 2 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* Buttons */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Kaperce
              </button>

              {step.type === "done" ? (
                <Button onClick={handleFinish} size="sm">
                  Fillo Nenshkrimin e Pare
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleNext} size="sm">
                  Vazhdo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-700"
              aria-label="Mbyll tutorialin"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Confetti on done step */}
      {showConfetti && <Confetti />}
    </>
  );
}
