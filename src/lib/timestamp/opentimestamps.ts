import { prisma } from "@/lib/db";

// OpenTimestamps calendar servers
const OTS_CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];

/**
 * Submit a SHA-256 hash to OpenTimestamps calendar servers.
 * Returns the OTS proof (pending, not yet confirmed in BTC).
 */
export async function submitToOpenTimestamps(
  hashHex: string
): Promise<Buffer | null> {
  const hashBytes = Buffer.from(hashHex, "hex");

  for (const calendar of OTS_CALENDARS) {
    try {
      const response = await fetch(`${calendar}/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: hashBytes,
      });

      if (response.ok) {
        const proofBytes = Buffer.from(await response.arrayBuffer());
        return proofBytes;
      }
    } catch {
      // Try next calendar
      continue;
    }
  }

  return null;
}

/**
 * Check if an OTS proof has been confirmed in the Bitcoin blockchain.
 * Queries the calendar server for upgrade.
 */
export async function checkOtsConfirmation(
  hashHex: string,
  otsProof: Buffer
): Promise<{
  confirmed: boolean;
  btcTxId?: string;
  btcBlockHeight?: number;
  btcBlockHash?: string;
  upgradedProof?: Buffer;
}> {
  for (const calendar of OTS_CALENDARS) {
    try {
      const response = await fetch(`${calendar}/timestamp/${hashHex}`, {
        method: "GET",
        headers: { Accept: "application/octet-stream" },
      });

      if (response.ok) {
        const body = await response.text();
        // Parse the response to check for Bitcoin attestation
        // OpenTimestamps returns upgraded proof with BTC block info when confirmed
        if (body.includes("bitcoin")) {
          // Extract BTC block info from the response
          const blockHeightMatch = body.match(/block\s+(\d+)/i);
          const txIdMatch = body.match(/([a-f0-9]{64})/i);

          return {
            confirmed: true,
            btcBlockHeight: blockHeightMatch
              ? parseInt(blockHeightMatch[1])
              : undefined,
            btcTxId: txIdMatch ? txIdMatch[1] : undefined,
            upgradedProof: Buffer.from(await response.arrayBuffer()),
          };
        }
      }
    } catch {
      continue;
    }
  }

  return { confirmed: false };
}

/**
 * Submit a timestamp entry's hash to OpenTimestamps.
 * Updates the database entry with the OTS proof.
 */
export async function anchorToBitcoin(timestampEntryId: string): Promise<boolean> {
  const entry = await prisma.timestampEntry.findUnique({
    where: { id: timestampEntryId },
  });

  if (!entry) return false;

  const proof = await submitToOpenTimestamps(entry.fingerprint);

  if (!proof) return false;

  await prisma.timestampEntry.update({
    where: { id: timestampEntryId },
    data: {
      otsProof: new Uint8Array(proof),
      otsStatus: "PENDING",
    },
  });

  return true;
}

/**
 * Check all pending OTS proofs for Bitcoin confirmations.
 * Should be run periodically (every 10 minutes).
 */
export async function checkPendingConfirmations(): Promise<{
  checked: number;
  confirmed: number;
}> {
  const pendingEntries = await prisma.timestampEntry.findMany({
    where: {
      otsStatus: "PENDING",
      otsProof: { not: null },
    },
    take: 50,
  });

  let confirmed = 0;

  for (const entry of pendingEntries) {
    if (!entry.otsProof) continue;

    const result = await checkOtsConfirmation(
      entry.fingerprint,
      Buffer.from(entry.otsProof)
    );

    if (result.confirmed) {
      await prisma.timestampEntry.update({
        where: { id: entry.id },
        data: {
          otsStatus: "CONFIRMED",
          btcTxId: result.btcTxId,
          btcBlockHeight: result.btcBlockHeight,
          btcBlockHash: result.btcBlockHash,
          otsProof: result.upgradedProof ? new Uint8Array(result.upgradedProof) : entry.otsProof,
        },
      });
      confirmed++;
    }
  }

  return { checked: pendingEntries.length, confirmed };
}
