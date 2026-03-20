import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateCRL, type RevokedEntry } from "@/lib/crypto/ca";

/**
 * Certificate Revocation List (CRL) endpoint
 *
 * GET /api/crl          - Returns PEM-encoded CRL signed by Issuing CA
 * GET /api/crl?format=json - Returns JSON for UI consumption
 */
export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get("format");

    const revokedCerts = await prisma.certificate.findMany({
      where: { revoked: true },
      select: {
        serialNumber: true,
        revokedAt: true,
        revokeReason: true,
      },
      orderBy: { revokedAt: "desc" },
    });

    // JSON format for UI
    if (format === "json") {
      return NextResponse.json({
        issuer: "doc.al Issuing CA",
        lastUpdate: new Date().toISOString(),
        nextUpdate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        revokedCertificates: revokedCerts.map((c) => ({
          serialNumber: c.serialNumber,
          revocationDate: c.revokedAt?.toISOString(),
          reason: c.revokeReason,
        })),
      });
    }

    // PEM format (default) - signed CRL
    const revokedEntries: RevokedEntry[] = revokedCerts.map((c) => ({
      serialNumber: c.serialNumber,
      revocationDate: c.revokedAt || new Date(),
      reason: c.revokeReason || undefined,
    }));

    const crlPem = generateCRL(revokedEntries);

    return new NextResponse(crlPem, {
      status: 200,
      headers: {
        "Content-Type": "application/pkix-crl",
        "Content-Disposition": 'inline; filename="docal-crl.pem"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
