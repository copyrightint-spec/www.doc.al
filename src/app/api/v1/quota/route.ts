import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { getQuotaSummary } from "@/lib/quota";

// GET - Get current quota usage for the organization
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  if (!auth.organizationId) {
    return apiError("API key duhet te jete i lidhur me nje organizate", 403);
  }

  try {
    const summary = await getQuotaSummary(auth.organizationId);
    return apiSuccess(summary);
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
