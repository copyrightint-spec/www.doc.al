import { NextRequest, NextResponse } from "next/server";
import { createTimestamp, computeSHA256 } from "@/lib/timestamp/engine";
import type { TimestampType } from "@/generated/prisma/enums";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let fingerprint: string;
    let type: TimestampType;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "Skedari eshte i detyrueshem" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      fingerprint = computeSHA256(buffer);
      type = "SINGLE_FILE";
    } else {
      // Hash submission
      const body = await req.json();
      const { hash } = body;
      if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
        return NextResponse.json(
          { error: "Hash SHA-256 i pavlefshem. Duhet te jete 64 karaktere hex." },
          { status: 400 }
        );
      }
      fingerprint = hash.toLowerCase();
      type = "SUBMITTED_HASH";
    }

    const result = await createTimestamp(fingerprint, type);

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        sequenceNumber: result.sequenceNumber,
        fingerprint: result.fingerprint,
        sequentialFingerprint: result.sequentialFingerprint,
        type: result.type,
        serverTimestamp: result.serverTimestamp.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim gjate krijimit te timestamp" },
      { status: 500 }
    );
  }
}
