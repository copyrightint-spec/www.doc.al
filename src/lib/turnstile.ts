/**
 * Cloudflare Turnstile server-side verification
 *
 * Environment variables required:
 *   TURNSTILE_SECRET_KEY — from Cloudflare dashboard
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — from Cloudflare dashboard (used client-side)
 *
 * In development, set TURNSTILE_SECRET_KEY to the Cloudflare test secret:
 *   "1x0000000000000000000000000000000AA" (always passes)
 *   "2x0000000000000000000000000000000AA" (always fails)
 *   "3x0000000000000000000000000000000AA" (forces interactive)
 */

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResult {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token server-side.
 * Returns true if the token is valid, false otherwise.
 * If TURNSTILE_SECRET_KEY is not set, skips verification (dev mode).
 */
export async function verifyTurnstileToken(token: string | null | undefined): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In production, require secret key
  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Turnstile] TURNSTILE_SECRET_KEY not set in production!");
      return false;
    }
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification (dev mode)");
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data: TurnstileVerifyResult = await res.json();
    return data.success === true;
  } catch (error) {
    console.error("[Turnstile] Verification failed:", error);
    return false;
  }
}
