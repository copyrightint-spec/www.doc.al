import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";
import crypto from "crypto";

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return `docal_${crypto.randomBytes(32).toString("hex")}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate API request by X-API-Key header
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<{
  authenticated: boolean;
  userId?: string;
  organizationId?: string | null;
  error?: string;
}> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return { authenticated: false, error: "X-API-Key header eshte i detyrueshem" };
  }

  const hashedKey = hashApiKey(apiKey);
  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
  });

  if (!keyRecord || !keyRecord.active) {
    return { authenticated: false, error: "API key i pavlefshem" };
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return { authenticated: false, error: "API key ka skaduar" };
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    authenticated: true,
    userId: keyRecord.userId,
    organizationId: keyRecord.organizationId,
  };
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Standard API success response
 */
export function apiSuccess(data: unknown, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
