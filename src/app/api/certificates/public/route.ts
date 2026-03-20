import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRootCA, getIssuingCA } from "@/lib/crypto/ca";
import forge from "node-forge";

function extractCertInfo(cert: forge.pki.Certificate) {
  const getAttr = (name: string) => {
    const attr = cert.subject.getField(name);
    return attr ? (attr.value as string) : "";
  };
  const getIssuerAttr = (name: string) => {
    const attr = cert.issuer.getField(name);
    return attr ? (attr.value as string) : "";
  };

  const derBytes = forge.asn1
    .toDer(forge.pki.certificateToAsn1(cert))
    .getBytes();
  const md = forge.md.sha256.create();
  md.update(derBytes);
  const fingerprint =
    md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(":") || "";

  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const keySize = (publicKey.n as { bitLength(): number }).bitLength();

  const bcExt = cert.getExtension("basicConstraints") as {
    cA?: boolean;
    pathLenConstraint?: number;
  } | null;

  return {
    commonName: getAttr("commonName"),
    organization: getAttr("organizationName"),
    country: getAttr("countryName"),
    locality: getAttr("localityName"),
    validFrom: cert.validity.notBefore.toISOString(),
    validTo: cert.validity.notAfter.toISOString(),
    serialNumber: cert.serialNumber,
    fingerprintSHA256: fingerprint,
    keySize,
    issuerCN: getIssuerAttr("commonName"),
    issuerOrganization: getIssuerAttr("organizationName"),
    isCA: bcExt?.cA ?? false,
    pathLenConstraint: bcExt?.pathLenConstraint ?? null,
  };
}

/**
 * Mask a name for privacy: "Daniel Kroi" -> "D***l K***i"
 */
function maskName(name: string): string {
  return name
    .split(" ")
    .map((part) => {
      if (part.length <= 2) return part[0] + "*";
      return part[0] + "*".repeat(Math.min(part.length - 2, 3)) + part[part.length - 1];
    })
    .join(" ");
}

/**
 * Extract CN from a subject DN string like "CN=Daniel Kroi, C=AL"
 */
function extractCNFromDN(dn: string): string {
  const match = dn.match(/CN=([^,]+)/i);
  return match ? match[1].trim() : dn;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";

    // Build CA info
    let rootInfo = null;
    let issuingInfo = null;
    try {
      const rootCA = getRootCA();
      const issuingCA = getIssuingCA();
      rootInfo = extractCertInfo(rootCA.certificate);
      issuingInfo = extractCertInfo(issuingCA.certificate);
    } catch {
      // CA might not be available
    }

    // Build where clause
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.serialNumber = { contains: search };
    }

    if (statusFilter === "active") {
      where.revoked = false;
      where.validTo = { gt: now };
    } else if (statusFilter === "revoked") {
      where.revoked = true;
    } else if (statusFilter === "expired") {
      where.revoked = false;
      where.validTo = { lte: now };
    }

    const [certificates, total, totalAll, revokedCount, expiredCount] =
      await Promise.all([
        prisma.certificate.findMany({
          where,
          select: {
            id: true,
            serialNumber: true,
            subjectDN: true,
            type: true,
            validFrom: true,
            validTo: true,
            revoked: true,
            revokedAt: true,
            revokeReason: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.certificate.count({ where }),
        prisma.certificate.count(),
        prisma.certificate.count({ where: { revoked: true } }),
        prisma.certificate.count({
          where: { revoked: false, validTo: { lte: now } },
        }),
      ]);

    const activeCount = totalAll - revokedCount - expiredCount;

    // Map certificates to public-safe data
    const publicCertificates = certificates.map((cert) => {
      const cn = extractCNFromDN(cert.subjectDN);
      const isExpired = !cert.revoked && cert.validTo < now;

      return {
        serialNumber: cert.serialNumber,
        subjectCN: maskName(cn),
        type: cert.type,
        issuedDate: cert.validFrom.toISOString(),
        expiryDate: cert.validTo.toISOString(),
        status: cert.revoked ? "REVOKED" : isExpired ? "EXPIRED" : "ACTIVE",
        revokedAt: cert.revokedAt?.toISOString() || null,
        revokeReason: cert.revokeReason || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          rootCA: rootInfo,
          issuingCA: issuingInfo,
          stats: {
            total: totalAll,
            active: activeCount,
            revoked: revokedCount,
            expired: expiredCount,
          },
          certificates: publicCertificates,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Certificates Public] Error:", error);
    return NextResponse.json(
      { error: "Gabim gjate ngarkimit te certifikatave" },
      { status: 500 }
    );
  }
}
