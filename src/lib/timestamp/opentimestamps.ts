import { prisma } from "@/lib/db";

// OpenTimestamps calendar servers
const OTS_CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];

// OTS binary format magic bytes and attestation markers
const OTS_BITCOIN_ATTESTATION_TAG = 0x05; // Bitcoin block header attestation
const OTS_PENDING_ATTESTATION_TAG = 0x83; // Pending attestation

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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/vnd.opentimestamps.v1",
        },
        body: new Uint8Array(hashBytes),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const proofBytes = Buffer.from(await response.arrayBuffer());
        console.log(`[OTS] Successfully submitted hash ${hashHex.slice(0, 16)}... to ${calendar}, proof size: ${proofBytes.length} bytes`);
        return proofBytes;
      } else {
        console.log(`[OTS] Calendar ${calendar} returned ${response.status} for hash ${hashHex.slice(0, 16)}...`);
      }
    } catch (err) {
      console.log(`[OTS] Failed to submit to ${calendar}:`, err instanceof Error ? err.message : "unknown error");
      continue;
    }
  }

  console.log(`[OTS] All calendars failed for hash ${hashHex.slice(0, 16)}...`);
  return null;
}

/**
 * Parse OTS binary proof to extract Bitcoin attestation data.
 * OTS proofs are binary format - we look for Bitcoin attestation markers.
 */
function parseOtsProof(proofBytes: Buffer): {
  hasBitcoinAttestation: boolean;
  hasPendingAttestation: boolean;
  btcBlockHeight?: number;
} {
  let hasBitcoinAttestation = false;
  let hasPendingAttestation = false;
  let btcBlockHeight: number | undefined;

  for (let i = 0; i < proofBytes.length; i++) {
    // Check for Bitcoin attestation tag (0x0588960d73d71901)
    if (proofBytes[i] === OTS_BITCOIN_ATTESTATION_TAG && i + 8 < proofBytes.length) {
      // Bitcoin attestation found - extract block height (8 bytes after tag)
      if (
        proofBytes[i + 1] === 0x88 &&
        proofBytes[i + 2] === 0x96 &&
        proofBytes[i + 3] === 0x0d &&
        proofBytes[i + 4] === 0x73 &&
        proofBytes[i + 5] === 0xd7 &&
        proofBytes[i + 6] === 0x19 &&
        proofBytes[i + 7] === 0x01
      ) {
        hasBitcoinAttestation = true;
        // Block height follows as varint
        if (i + 8 < proofBytes.length) {
          btcBlockHeight = readVarInt(proofBytes, i + 8);
        }
      }
    }

    // Check for pending attestation tag (0x83dfe30d2ef90c8e)
    if (proofBytes[i] === OTS_PENDING_ATTESTATION_TAG && i + 8 < proofBytes.length) {
      if (
        proofBytes[i + 1] === 0xdf &&
        proofBytes[i + 2] === 0xe3 &&
        proofBytes[i + 3] === 0x0d &&
        proofBytes[i + 4] === 0x2e &&
        proofBytes[i + 5] === 0xf9 &&
        proofBytes[i + 6] === 0x0c &&
        proofBytes[i + 7] === 0x8e
      ) {
        hasPendingAttestation = true;
      }
    }
  }

  return { hasBitcoinAttestation, hasPendingAttestation, btcBlockHeight };
}

/**
 * Read a variable-length integer from buffer (Bitcoin varint format)
 */
function readVarInt(buf: Buffer, offset: number): number {
  if (offset >= buf.length) return 0;
  const first = buf[offset];
  if (first < 0xfd) return first;
  if (first === 0xfd && offset + 2 < buf.length) {
    return buf.readUInt16LE(offset + 1);
  }
  if (first === 0xfe && offset + 4 < buf.length) {
    return buf.readUInt32LE(offset + 1);
  }
  return 0;
}

/**
 * Check if an OTS proof has been confirmed in the Bitcoin blockchain.
 * Queries the calendar server for an upgraded proof.
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
  // First check if the existing proof already has a Bitcoin attestation
  const existingParsed = parseOtsProof(otsProof);
  if (existingParsed.hasBitcoinAttestation) {
    return {
      confirmed: true,
      btcBlockHeight: existingParsed.btcBlockHeight,
    };
  }

  // Try to get an upgraded proof from calendar servers
  for (const calendar of OTS_CALENDARS) {
    try {
      const response = await fetch(`${calendar}/timestamp/${hashHex}`, {
        method: "GET",
        headers: { Accept: "application/octet-stream" },
      });

      if (response.ok) {
        const upgradedBytes = Buffer.from(await response.arrayBuffer());

        // Check if the upgraded proof has a bitcoin attestation
        const parsed = parseOtsProof(upgradedBytes);

        if (parsed.hasBitcoinAttestation) {
          // Try to get BTC transaction details from a block explorer
          const btcInfo = await fetchBtcInfo(hashHex, parsed.btcBlockHeight);

          return {
            confirmed: true,
            btcBlockHeight: parsed.btcBlockHeight,
            btcTxId: btcInfo?.txId,
            btcBlockHash: btcInfo?.blockHash,
            upgradedProof: upgradedBytes,
          };
        }

        // If response is larger than original proof, it might be partially upgraded
        if (upgradedBytes.length > otsProof.length && !parsed.hasPendingAttestation) {
          return {
            confirmed: false,
            upgradedProof: upgradedBytes,
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
 * Fetch Bitcoin transaction info from a public block explorer.
 */
async function fetchBtcInfo(
  _hashHex: string,
  blockHeight?: number
): Promise<{ txId?: string; blockHash?: string } | null> {
  if (!blockHeight) return null;

  try {
    // Use blockstream.info API to get block hash from height
    const blockResponse = await fetch(
      `https://blockstream.info/api/block-height/${blockHeight}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (blockResponse.ok) {
      const blockHash = await blockResponse.text();
      return { blockHash: blockHash.trim() };
    }
  } catch {
    // Non-critical, block info is supplementary
  }

  return null;
}

/**
 * Submit a timestamp entry's hash to OpenTimestamps.
 * Updates the database entry with the OTS proof.
 */
export async function anchorToBitcoin(timestampEntryId: string): Promise<boolean> {
  const entry = await prisma.timestampEntry.findUnique({
    where: { id: timestampEntryId },
  });

  if (!entry) {
    console.log(`[OTS] Entry ${timestampEntryId} not found`);
    return false;
  }

  console.log(`[OTS] Anchoring entry ${timestampEntryId}, fingerprint: ${entry.fingerprint.slice(0, 16)}...`);
  const proof = await submitToOpenTimestamps(entry.fingerprint);

  if (!proof) {
    console.log(`[OTS] Failed to get proof for entry ${timestampEntryId}`);
    return false;
  }

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
    } else if (result.upgradedProof) {
      // Save partially upgraded proof
      await prisma.timestampEntry.update({
        where: { id: entry.id },
        data: {
          otsProof: new Uint8Array(result.upgradedProof),
        },
      });
    }
  }

  return { checked: pendingEntries.length, confirmed };
}
