/**
 * In-memory rate limiter for API endpoints
 *
 * Uses a sliding window approach with automatic cleanup.
 * For production with multiple instances, replace with Redis-based implementation.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp ms
}

// In-memory store (per-process)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes per IP */
  login: { windowMs: 15 * 60 * 1000, max: 5 },
  /** Registration: 3 per hour per IP */
  register: { windowMs: 60 * 60 * 1000, max: 3 },
  /** OTP send: 3 per 10 minutes per IP */
  otpSend: { windowMs: 10 * 60 * 1000, max: 3 },
  /** OTP verify: 5 attempts per 5 minutes per IP */
  otpVerify: { windowMs: 5 * 60 * 1000, max: 5 },
  /** Password change: 3 per hour per user */
  passwordChange: { windowMs: 60 * 60 * 1000, max: 3 },
  /** Contact form: 3 per hour per IP */
  contact: { windowMs: 60 * 60 * 1000, max: 3 },
  /** Document upload: 20 per hour per user */
  documentUpload: { windowMs: 60 * 60 * 1000, max: 20 },
  /** Template creation: 10 per hour per user */
  templateCreate: { windowMs: 60 * 60 * 1000, max: 10 },
  /** Timestamp creation: 30 per hour per IP */
  timestamp: { windowMs: 60 * 60 * 1000, max: 30 },
  /** API key: configurable per key */
  apiKey: { windowMs: 60 * 60 * 1000, max: 100 },
  /** General: 60 per minute per IP */
  general: { windowMs: 60 * 1000, max: 60 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMITS;

/**
 * Get client IP from request
 */
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Check rate limit and return result
 */
export function checkRateLimit(
  key: string,
  config: { windowMs: number; max: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Rate limit middleware for API routes
 *
 * Usage:
 * ```ts
 * const limited = rateLimit(req, "login");
 * if (limited) return limited;
 * ```
 */
export function rateLimit(
  req: NextRequest,
  preset: RateLimitPreset,
  /** Optional custom identifier (e.g., userId). Defaults to IP. */
  identifier?: string
): NextResponse | null {
  const config = RATE_LIMITS[preset];
  const ip = getClientIp(req);
  const key = `${preset}:${identifier || ip}`;
  const result = checkRateLimit(key, config);

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Keni bere shume kerkesa. Provoni perseri me vone.",
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null; // Allowed
}

/**
 * Account lockout check
 * After 5 failed login attempts, lock for 30 minutes
 */
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

const lockouts = new Map<string, { failedAttempts: number; lockedUntil: number }>();

export function checkAccountLockout(email: string): { locked: boolean; remainingMinutes: number } {
  const key = email.toLowerCase();
  const entry = lockouts.get(key);

  if (!entry) return { locked: false, remainingMinutes: 0 };

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return { locked: true, remainingMinutes: Math.ceil((entry.lockedUntil - now) / 60000) };
  }

  // Lockout expired, reset
  if (entry.failedAttempts >= LOCKOUT_THRESHOLD) {
    lockouts.delete(key);
  }

  return { locked: false, remainingMinutes: 0 };
}

export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const entry = lockouts.get(key) || { failedAttempts: 0, lockedUntil: 0 };

  entry.failedAttempts++;
  if (entry.failedAttempts >= LOCKOUT_THRESHOLD) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  lockouts.set(key, entry);
}

export function clearFailedLogins(email: string): void {
  lockouts.delete(email.toLowerCase());
}
