import { NextRequest, NextResponse } from "next/server";
import {
  createTimeStampResponse,
  parseTimeStampReq,
} from "@/lib/crypto/tsa";

/**
 * RFC 3161 Time-Stamp Protocol endpoint
 *
 * POST /api/timestamp/rfc3161
 *
 * Supports two modes:
 * 1. Standard RFC 3161: Content-Type: application/timestamp-query
 *    Body: DER-encoded TimeStampReq
 *    Response: application/timestamp-reply (DER-encoded TimeStampResp)
 *
 * 2. JSON mode (internal use): Content-Type: application/json
 *    Body: { hash: "hex-encoded-sha256" }
 *    Response: { token: "base64-encoded-TimeStampResp" }
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/timestamp-query")) {
      // RFC 3161 binary mode
      const body = await req.arrayBuffer();
      const derBytes = Buffer.from(body);

      if (derBytes.length === 0) {
        return new NextResponse("Empty request body", { status: 400 });
      }

      // Parse the TimeStampReq
      const tsReq = parseTimeStampReq(derBytes);

      // Create the TimeStampResp
      const hashHex = tsReq.hash.toString("hex");
      const tsResp = createTimeStampResponse(hashHex, tsReq.nonce);

      return new NextResponse(new Uint8Array(tsResp), {
        status: 200,
        headers: {
          "Content-Type": "application/timestamp-reply",
          "Content-Length": String(tsResp.length),
        },
      });
    }

    // JSON mode for internal use
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request. Send application/timestamp-query (DER) or JSON { hash: string }",
        },
        { status: 400 }
      );
    }

    const hash = body?.hash;
    if (!hash || typeof hash !== "string") {
      return NextResponse.json(
        { error: "Request body must contain 'hash' (hex-encoded SHA-256)" },
        { status: 400 }
      );
    }

    // Validate hex format and length (SHA-256 = 32 bytes = 64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(hash)) {
      return NextResponse.json(
        { error: "hash must be a 64-character hex string (SHA-256)" },
        { status: 400 }
      );
    }

    const tsResp = createTimeStampResponse(hash);
    const token = tsResp.toString("base64");

    return NextResponse.json(
      { token },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[TSA] Error creating timestamp:", err);
    return NextResponse.json(
      { error: "Internal TSA error" },
      { status: 500 }
    );
  }
}
