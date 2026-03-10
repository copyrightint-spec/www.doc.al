import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { createTimestamp, computeSHA256 } from "@/lib/timestamp/engine";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  try {
    const contentType = req.headers.get("content-type") || "";
    let fingerprint: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return apiError("File eshte i detyrueshem", 400);
      const buffer = Buffer.from(await file.arrayBuffer());
      fingerprint = computeSHA256(buffer);
    } else {
      const body = await req.json();
      if (!body.hash || !/^[a-f0-9]{64}$/i.test(body.hash)) {
        return apiError("Hash SHA-256 i pavlefshem", 400);
      }
      fingerprint = body.hash.toLowerCase();
    }

    const result = await createTimestamp(fingerprint, "SUBMITTED_HASH");
    return apiSuccess(result, 201);
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
