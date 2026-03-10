import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { findByFingerprint } from "@/lib/timestamp/engine";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  try {
    const body = await req.json();
    if (!body.hash || !/^[a-f0-9]{64}$/i.test(body.hash)) {
      return apiError("Hash SHA-256 i pavlefshem", 400);
    }

    const entry = await findByFingerprint(body.hash.toLowerCase());
    if (!entry) {
      return apiSuccess({ found: false, hash: body.hash });
    }

    return apiSuccess({
      found: true,
      sequenceNumber: entry.sequenceNumber,
      fingerprint: entry.fingerprint,
      type: entry.type,
      serverTimestamp: entry.serverTimestamp,
      btcTxId: entry.btcTxId,
      btcBlockHeight: entry.btcBlockHeight,
      otsStatus: entry.otsStatus,
    });
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
