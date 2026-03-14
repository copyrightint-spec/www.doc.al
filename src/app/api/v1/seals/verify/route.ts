import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-auth";
import { verifyCompanySeal } from "@/lib/crypto/company-seal";

// GET - Verify a seal by certification hash (PUBLIC - no auth required)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const hash = searchParams.get("hash");

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    return apiError("Hash SHA-256 i pavlefshem", 400);
  }

  try {
    const result = await verifyCompanySeal(hash);
    return apiSuccess(result);
  } catch {
    return apiError("Gabim ne verifikim", 500);
  }
}
