"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const complete = localStorage.getItem("docal_onboarding_complete");
    if (!complete) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("docal_onboarding_complete", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/50">
          <Info className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-900 dark:text-red-200">
            Sapo u regjistruat?
          </p>
          <p className="text-sm text-red-700 dark:text-red-400">
            Shikoni tutorialin per te mesuar si funksionon platforma.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" asChild>
          <Link href="/dashboard/onboarding">
            Shiko Tutorialin
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismiss}
          aria-label="Mbyll"
          className="h-8 w-8 text-red-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
