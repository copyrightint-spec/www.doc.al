import { NextRequest, NextResponse } from "next/server";
import { findByFingerprint, computeSHA256, verifyChainIntegrity } from "@/lib/timestamp/engine";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let fingerprint: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { success: false, error: "Skedari eshte i detyrueshem" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      fingerprint = computeSHA256(buffer);
    } else {
      const body = await req.json();
      const { hash } = body;
      if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
        return NextResponse.json(
          { success: false, error: "Hash SHA-256 i pavlefshem" },
          { status: 400 }
        );
      }
      fingerprint = hash.toLowerCase();
    }

    const entry = await findByFingerprint(fingerprint);

    if (!entry) {
      return NextResponse.json({
        success: true,
        data: {
          found: false,
          fingerprint,
          message: "Ky hash nuk u gjet ne chain",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        fingerprint: entry.fingerprint,
        sequenceNumber: entry.sequenceNumber,
        sequentialFingerprint: entry.sequentialFingerprint,
        type: entry.type,
        serverTimestamp: entry.serverTimestamp.toISOString(),
        otsStatus: entry.otsStatus,
        polygonTxHash: (entry as Record<string, unknown>).polygonTxHash || entry.btcTxId || null,
        polygonBlockNumber: (entry as Record<string, unknown>).polygonBlockNumber || entry.btcBlockHeight || null,
        document: entry.document,
        signature: entry.signature,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim gjate verifikimit" },
      { status: 500 }
    );
  }
}

// Chain integrity verification
export async function GET() {
  try {
    const result = await verifyChainIntegrity();
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
