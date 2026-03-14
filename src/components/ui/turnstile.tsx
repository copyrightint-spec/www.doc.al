"use client";

import { Turnstile as TurnstileWidget } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useRef, useCallback } from "react";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA widget.
 *
 * Uses NEXT_PUBLIC_TURNSTILE_SITE_KEY from environment.
 * In dev without the key, renders nothing (form works without CAPTCHA).
 *
 * Dev test keys (set in NEXT_PUBLIC_TURNSTILE_SITE_KEY):
 *   "1x00000000000000000000AA" — always passes (invisible)
 *   "2x00000000000000000000AB" — always fails
 *   "3x00000000000000000000FF" — forces interactive challenge
 */
export function TurnstileCaptcha({ onVerify, onExpire, onError, className }: TurnstileCaptchaProps) {
  const ref = useRef<TurnstileInstance | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleExpire = useCallback(() => {
    onExpire?.();
    ref.current?.reset();
  }, [onExpire]);

  // Don't render if no site key (dev mode)
  if (!siteKey) {
    return null;
  }

  return (
    <div className={className}>
      <TurnstileWidget
        ref={ref}
        siteKey={siteKey}
        onSuccess={onVerify}
        onExpire={handleExpire}
        onError={onError}
        options={{
          theme: "auto",
          size: "flexible",
        }}
      />
    </div>
  );
}

/**
 * Hook to reset a Turnstile widget imperatively.
 * Usage: pass the returned ref to TurnstileWidget's ref prop.
 */
export function useTurnstileRef() {
  return useRef<TurnstileInstance | null>(null);
}
