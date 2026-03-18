/**
 * STAMLES Integration for doc.al
 *
 * Submits document hashes to STAMLES Decentralized Trust System
 * for Polygon blockchain timestamping via Merkle tree batching.
 */

const STAMLES_URL = process.env.STAMLES_API_URL || "http://stamles-app:3001";
const STAMLES_KEY = process.env.STAMLES_API_KEY || "stamles_docal_2026_secret_key";

/** Public URL for STAMLES explorer (used in links shown to users) */
export const STAMLES_PUBLIC_URL = process.env.NEXT_PUBLIC_STAMLES_URL || "https://scan.stamles.eu";

interface StamlesSubmitResult {
  id: string;
  hash: string;
  status: string;
  duplicate?: boolean;
}

/**
 * Submit a document hash to STAMLES for blockchain timestamping.
 * Hash will be included in the next Merkle tree batch and stored on Polygon.
 *
 * @param hash - SHA-256 hash (64-char hex)
 * @param sourceId - Document/signature ID in doc.al
 * @param sourceType - "document", "signature", "contract", "seal"
 */
export async function submitToStamles(
  hash: string,
  sourceId?: string,
  sourceType?: string
): Promise<StamlesSubmitResult | null> {
  try {
    const response = await fetch(`${STAMLES_URL}/api/v1/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STAMLES_KEY}`,
      },
      body: JSON.stringify({
        hash: hash.toLowerCase(),
        sourceId,
        sourceType,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[STAMLES] Submit failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.success) {
      console.log(`[STAMLES] Hash submitted: ${hash.slice(0, 16)}... → ${data.data.status}`);
      return data.data;
    }

    return null;
  } catch (error) {
    console.error("[STAMLES] Submit error:", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

/**
 * Verify a hash against STAMLES blockchain proof.
 */
export async function verifyOnStamles(hash: string): Promise<{
  verified: boolean;
  status: string;
  polygonTxHash?: string;
  polygonBlock?: number;
  merkleRoot?: string;
  batchNumber?: number;
} | null> {
  try {
    const response = await fetch(`${STAMLES_URL}/api/v1/verify?hash=${hash.toLowerCase()}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      verified: data.verified,
      status: data.status,
      polygonTxHash: data.data?.polygon?.txHash,
      polygonBlock: data.data?.polygon?.blockNumber,
      merkleRoot: data.data?.batch?.merkleRoot,
      batchNumber: data.data?.batch?.number,
    };
  } catch {
    return null;
  }
}
