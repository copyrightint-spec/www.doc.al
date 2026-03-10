import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Certificate Revocation List (CRL) endpoint
export async function GET() {
  try {
    const revokedCerts = await prisma.certificate.findMany({
      where: { revoked: true },
      select: {
        serialNumber: true,
        revokedAt: true,
        revokeReason: true,
      },
      orderBy: { revokedAt: "desc" },
    });

    return NextResponse.json({
      issuer: "doc.al Certificate Authority",
      lastUpdate: new Date().toISOString(),
      revokedCertificates: revokedCerts.map((c) => ({
        serialNumber: c.serialNumber,
        revocationDate: c.revokedAt?.toISOString(),
        reason: c.revokeReason,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
