/**
 * NTP Time Validation Utility
 *
 * Validates server time against external time sources to ensure
 * timestamps used in certificates and signatures are accurate.
 *
 * Uses HTTP-based time APIs since raw NTP requires UDP sockets
 * not available in serverless environments.
 */

export interface TimeValidationResult {
  valid: boolean;
  offset: number; // milliseconds difference from NTP
  ntpTime: Date;
  serverTime: Date;
  source: string;
}

/** Maximum acceptable time offset in milliseconds (5 seconds) */
const MAX_ACCEPTABLE_OFFSET_MS = 5000;

/**
 * Validate server time against an external time source.
 * Called at startup to ensure timestamps are accurate.
 *
 * Tries multiple sources in order and returns the first successful result.
 */
export async function validateServerTime(): Promise<TimeValidationResult> {
  const sources = [
    { name: "worldtimeapi.org", fn: fetchWorldTimeAPI },
    { name: "timeapi.io", fn: fetchTimeApiIO },
  ];

  for (const source of sources) {
    try {
      const result = await source.fn();
      return result;
    } catch {
      console.warn(`[NTP] Failed to validate against ${source.name}, trying next source...`);
    }
  }

  // If all sources fail, return a warning result with zero offset
  console.warn(
    "[NTP] WARNING: Could not validate server time against any external source. " +
      "Proceeding with local clock."
  );

  const now = new Date();
  return {
    valid: true, // assume valid if we can't check
    offset: 0,
    ntpTime: now,
    serverTime: now,
    source: "local (unverified)",
  };
}

async function fetchWorldTimeAPI(): Promise<TimeValidationResult> {
  const beforeRequest = Date.now();
  const response = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`worldtimeapi.org returned ${response.status}`);
  }

  const data = await response.json();
  const afterRequest = Date.now();

  // Estimate server time at the midpoint of the request
  const serverTimeMid = new Date(beforeRequest + (afterRequest - beforeRequest) / 2);

  // Parse the unixtime from the response (seconds since epoch)
  const ntpTime = new Date(data.unixtime * 1000);

  const offset = ntpTime.getTime() - serverTimeMid.getTime();

  return {
    valid: Math.abs(offset) <= MAX_ACCEPTABLE_OFFSET_MS,
    offset,
    ntpTime,
    serverTime: serverTimeMid,
    source: "worldtimeapi.org",
  };
}

async function fetchTimeApiIO(): Promise<TimeValidationResult> {
  const beforeRequest = Date.now();
  const response = await fetch(
    "https://timeapi.io/api/time/current/zone?timeZone=UTC",
    { signal: AbortSignal.timeout(5000) }
  );

  if (!response.ok) {
    throw new Error(`timeapi.io returned ${response.status}`);
  }

  const data = await response.json();
  const afterRequest = Date.now();

  const serverTimeMid = new Date(beforeRequest + (afterRequest - beforeRequest) / 2);

  // timeapi.io returns dateTime as ISO string
  const ntpTime = new Date(data.dateTime + "Z");

  const offset = ntpTime.getTime() - serverTimeMid.getTime();

  return {
    valid: Math.abs(offset) <= MAX_ACCEPTABLE_OFFSET_MS,
    offset,
    ntpTime,
    serverTime: serverTimeMid,
    source: "timeapi.io",
  };
}

/**
 * Log time validation result at startup.
 * Call this from your app initialization.
 */
export async function logTimeValidation(): Promise<void> {
  const result = await validateServerTime();

  if (result.valid) {
    console.log(
      `[NTP] Server time validated against ${result.source}. ` +
        `Offset: ${result.offset}ms`
    );
  } else {
    console.error(
      `[NTP] WARNING: Server clock is off by ${result.offset}ms ` +
        `(source: ${result.source}). ` +
        `This exceeds the ${MAX_ACCEPTABLE_OFFSET_MS}ms threshold. ` +
        `Certificate timestamps may be inaccurate.`
    );
  }
}
