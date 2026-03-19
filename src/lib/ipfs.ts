/**
 * IPFS Integration via Kubo RPC
 *
 * Connects to our self-hosted IPFS Kubo node to publish
 * cryptographic proofs (hashes) of digital signatures.
 *
 * IMPORTANT: Only proof metadata (hashes, timestamps) are published.
 * Documents and personal data NEVER leave our server.
 */

interface SignatureProofMetadata {
  platform: string;
  type: string;
  version: string;
  documentHash: string;
  signedAt: string;
  sequenceNumber: number;
  signer: {
    name: string;
    email: string;
  };
  verification: {
    eidas: boolean;
    otpVerified: boolean;
    totpVerified: boolean;
    kycVerified: boolean;
    kycVerifiedAt: string | null;
  };
  chain: {
    fingerprint: string;
    sequentialFingerprint: string;
    previousSequenceNumber: number | null;
    previousFingerprint: string | null;
  };
  blockchain: {
    network: string;
    system: string;
    status: string;
  };
  verify: string;
}

/**
 * Mask personal data for public IPFS proof.
 * "Daniel Kordhoni" → "D***l K***i"
 * "kordhoni@gmail.com" → "k***i@gmail.com"
 */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => {
      if (p.length <= 2) return p;
      return p[0] + "***" + p[p.length - 1];
    })
    .join(" ");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || local.length <= 2) return "***@" + (domain || "***");
  return local[0] + "***" + local[local.length - 1] + "@" + domain;
}

/**
 * Build the proof metadata object that gets published to IPFS.
 * Contains ONLY cryptographic hashes and masked identity info.
 */
export function buildProofMetadata(opts: {
  documentHash: string;
  signedAt: string;
  sequenceNumber: number;
  signerName: string;
  signerEmail: string;
  fingerprint: string;
  sequentialFingerprint: string;
  previousSequenceNumber: number | null;
  previousFingerprint: string | null;
  kycVerified?: boolean;
  kycVerifiedAt?: string | null;
}): SignatureProofMetadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://doc.al";
  return {
    platform: "doc.al",
    type: "DIGITAL_SIGNATURE_PROOF",
    version: "2.1",
    documentHash: opts.documentHash,
    signedAt: opts.signedAt,
    sequenceNumber: opts.sequenceNumber,
    signer: {
      name: maskName(opts.signerName),
      email: maskEmail(opts.signerEmail),
    },
    verification: {
      eidas: true,
      otpVerified: true,
      totpVerified: true,
      kycVerified: opts.kycVerified ?? false,
      kycVerifiedAt: opts.kycVerifiedAt ?? null,
    },
    chain: {
      fingerprint: opts.fingerprint,
      sequentialFingerprint: opts.sequentialFingerprint,
      previousSequenceNumber: opts.previousSequenceNumber,
      previousFingerprint: opts.previousFingerprint,
    },
    blockchain: {
      network: "Polygon PoS (Amoy Testnet)",
      system: "STAMLES Merkle Batching",
      status: "QUEUED",
    },
    verify: `${baseUrl}/verify/${opts.fingerprint}`,
  };
}

/**
 * Publish proof metadata to IPFS via Kubo RPC.
 * Returns the CID (Content Identifier) string.
 *
 * Data is auto-pinned on our node and available globally via:
 * https://ipfs.io/ipfs/{CID}
 */
export async function publishToIPFS(metadata: SignatureProofMetadata): Promise<string | null> {
  const endpoint = process.env.IPFS_API_URL || "http://docal-ipfs:5001";

  try {
    const jsonData = JSON.stringify(metadata, null, 2);
    const boundary = "----IPFSBoundary" + Date.now();

    // Use Kubo RPC /api/v0/add endpoint directly via fetch
    // This avoids ESM/CJS compatibility issues with kubo-rpc-client
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="proof.json"\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      jsonData +
      `\r\n--${boundary}--\r\n`;

    const response = await fetch(`${endpoint}/api/v0/add?pin=true&quiet=false`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[IPFS] Add failed with status ${response.status}`);
      return null;
    }

    const result = await response.json();
    const cid = result.Hash;

    console.log(`[IPFS] Published proof, CID: ${cid}, size: ${result.Size} bytes`);
    return cid;
  } catch (error) {
    console.error("[IPFS] Failed to publish:", error instanceof Error ? error.message : "unknown");
    return null;
  }
}

/**
 * Get the public IPFS gateway URL for a CID.
 */
export function getIPFSUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}
