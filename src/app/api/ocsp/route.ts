import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getIssuingCA } from "@/lib/crypto/ca";

/**
 * OCSP Responder (simplified JSON-based)
 *
 * POST /api/ocsp - accepts JSON { serialNumber: string }
 * GET  /api/ocsp?serial=xxx - query by serial number
 *
 * Returns certificate revocation status as JSON.
 * A full RFC 6960 DER-encoded OCSP responder would require ASN.1 encoding
 * beyond what node-forge conveniently provides, so we use a JSON-based
 * approach that serves the same purpose for the doc.al ecosystem.
 */

interface OCSPResponse {
  status: "good" | "revoked" | "unknown";
  serialNumber: string;
  thisUpdate: string;
  nextUpdate: string;
  issuer: string;
  revocationTime?: string;
  revocationReason?: string;
}

async function lookupCertificateStatus(
  serialNumber: string
): Promise<OCSPResponse> {
  const now = new Date();
  const nextUpdate = new Date(now);
  nextUpdate.setHours(nextUpdate.getHours() + 24); // valid for 24 hours

  const issuingCA = getIssuingCA();
  const issuerDN = issuingCA.certificate.subject.attributes
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(", ");

  const cert = await prisma.certificate.findUnique({
    where: { serialNumber },
    select: {
      serialNumber: true,
      revoked: true,
      revokedAt: true,
      revokeReason: true,
    },
  });

  if (!cert) {
    return {
      status: "unknown",
      serialNumber,
      thisUpdate: now.toISOString(),
      nextUpdate: nextUpdate.toISOString(),
      issuer: issuerDN,
    };
  }

  if (cert.revoked) {
    return {
      status: "revoked",
      serialNumber,
      thisUpdate: now.toISOString(),
      nextUpdate: nextUpdate.toISOString(),
      issuer: issuerDN,
      revocationTime: cert.revokedAt?.toISOString(),
      revocationReason: cert.revokeReason || undefined,
    };
  }

  return {
    status: "good",
    serialNumber,
    thisUpdate: now.toISOString(),
    nextUpdate: nextUpdate.toISOString(),
    issuer: issuerDN,
  };
}

export async function GET(req: NextRequest) {
  try {
    const serial = req.nextUrl.searchParams.get("serial");

    if (!serial) {
      return NextResponse.json(
        { error: "Missing 'serial' query parameter" },
        { status: 400 }
      );
    }

    const response = await lookupCertificateStatus(serial);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal OCSP responder error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const serialNumber = body?.serialNumber;

    if (!serialNumber || typeof serialNumber !== "string") {
      return NextResponse.json(
        { error: "Request body must contain 'serialNumber' string" },
        { status: 400 }
      );
    }

    const response = await lookupCertificateStatus(serialNumber);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal OCSP responder error" },
      { status: 500 }
    );
  }
}
