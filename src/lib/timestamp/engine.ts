import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { TimestampType } from "@/generated/prisma/enums";

export interface TimestampResult {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
  type: TimestampType;
  serverTimestamp: Date;
  previousEntryId: string | null;
}

/**
 * Computes SHA-256 hash of a buffer or string
 */
export function computeSHA256(data: Buffer | string): string {
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}

/**
 * Computes the sequential fingerprint for the chain:
 * SHA256(previousSequentialFingerprint + currentFingerprint + serverTimestamp)
 */
function computeSequentialFingerprint(
  previousSequentialFingerprint: string | null,
  currentFingerprint: string,
  serverTimestamp: string
): string {
  const input = `${previousSequentialFingerprint || "GENESIS"}${currentFingerprint}${serverTimestamp}`;
  return computeSHA256(input);
}

/**
 * Creates a new timestamp entry in the chain.
 * Each entry links to the previous one via sequential fingerprint.
 */
export async function createTimestamp(
  data: Buffer | string,
  type: TimestampType,
  options?: {
    documentId?: string;
    signatureId?: string;
  }
): Promise<TimestampResult> {
  const fingerprint =
    typeof data === "string" && /^[a-f0-9]{64}$/i.test(data)
      ? data.toLowerCase()
      : computeSHA256(data);

  const serverTimestamp = new Date();
  const timestampISO = serverTimestamp.toISOString();

  // Use serializable transaction to prevent race conditions.
  // Two concurrent requests cannot get the same lastEntry.
  const entry = await prisma.$transaction(async (tx) => {
    // Get the last entry in the chain (locked within transaction)
    const lastEntry = await tx.timestampEntry.findFirst({
      orderBy: { sequenceNumber: "desc" },
      select: {
        id: true,
        sequentialFingerprint: true,
      },
    });

    const sequentialFingerprint = computeSequentialFingerprint(
      lastEntry?.sequentialFingerprint ?? null,
      fingerprint,
      timestampISO
    );

    return tx.timestampEntry.create({
      data: {
        fingerprint,
        sequentialFingerprint,
        type,
        serverTimestamp,
        previousEntryId: lastEntry?.id ?? undefined,
        documentId: options?.documentId,
        signatureId: options?.signatureId,
      },
    });
  }, {
    isolationLevel: "Serializable",
    timeout: 10000,
  });

  // Auto-submit to OpenTimestamps (fire and forget)
  import("@/lib/timestamp/opentimestamps")
    .then(({ anchorToBitcoin }) => anchorToBitcoin(entry.id))
    .catch(() => {});

  return {
    id: entry.id,
    sequenceNumber: entry.sequenceNumber,
    fingerprint: entry.fingerprint,
    sequentialFingerprint: entry.sequentialFingerprint,
    type: entry.type,
    serverTimestamp: entry.serverTimestamp,
    previousEntryId: entry.previousEntryId,
  };
}

/**
 * Verifies the integrity of the entire timestamp chain.
 * Returns true if all sequential fingerprints are valid.
 */
export async function verifyChainIntegrity(): Promise<{
  valid: boolean;
  checkedEntries: number;
  brokenAt?: number;
}> {
  const entries = await prisma.timestampEntry.findMany({
    orderBy: { sequenceNumber: "asc" },
    select: {
      sequenceNumber: true,
      fingerprint: true,
      sequentialFingerprint: true,
      serverTimestamp: true,
    },
  });

  let previousSequentialFingerprint: string | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expected = computeSequentialFingerprint(
      previousSequentialFingerprint,
      entry.fingerprint,
      entry.serverTimestamp.toISOString()
    );

    if (expected !== entry.sequentialFingerprint) {
      return {
        valid: false,
        checkedEntries: i + 1,
        brokenAt: entry.sequenceNumber,
      };
    }

    previousSequentialFingerprint = entry.sequentialFingerprint;
  }

  return { valid: true, checkedEntries: entries.length };
}

/**
 * Finds a timestamp entry by its fingerprint hash
 */
export async function findByFingerprint(fingerprint: string) {
  const fp = fingerprint.toLowerCase();

  // First: direct lookup by fingerprint (signed hash)
  const direct = await prisma.timestampEntry.findFirst({
    where: { fingerprint: fp },
    include: {
      document: { select: { id: true, title: true, fileName: true } },
      signature: {
        select: { id: true, signerName: true, signerEmail: true, signedAt: true },
      },
    },
  });

  if (direct) return direct;

  // Fallback: search by original file hash in document metadata
  // (QR code contains pre-stamp hash, but DB stores post-stamp hash)
  const doc = await prisma.document.findFirst({
    where: {
      metadata: { path: ["originalFileHash"], equals: fp },
    },
    select: { fileHash: true },
  });

  if (doc?.fileHash) {
    return prisma.timestampEntry.findFirst({
      where: { fingerprint: doc.fileHash.toLowerCase() },
      include: {
        document: { select: { id: true, title: true, fileName: true } },
        signature: {
          select: { id: true, signerName: true, signerEmail: true, signedAt: true },
        },
      },
    });
  }

  return null;
}
