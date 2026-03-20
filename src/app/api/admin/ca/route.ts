import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

  // Compute SHA-256 fingerprint
  const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const md = forge.md.sha256.create();
  md.update(derBytes);
  const fingerprint = md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(":") || "";

  // Get key size
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const keySize = (publicKey.n as { bitLength(): number }).bitLength();

  // Basic constraints
  const bcExt = cert.getExtension("basicConstraints") as { cA?: boolean; pathLenConstraint?: number } | null;

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
    issuerCountry: getIssuerAttr("countryName"),
    isCA: bcExt?.cA ?? false,
    pathLenConstraint: bcExt?.pathLenConstraint ?? null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const rootCA = getRootCA();
    const issuingCA = getIssuingCA();

    const rootInfo = extractCertInfo(rootCA.certificate);
    const issuingInfo = extractCertInfo(issuingCA.certificate);

    // Get certificate stats
    const now = new Date();
    const [totalCertificates, revokedCertificates, expiredCertificates] = await Promise.all([
      prisma.certificate.count(),
      prisma.certificate.count({ where: { revoked: true } }),
      prisma.certificate.count({ where: { validTo: { lt: now }, revoked: false } }),
    ]);

    const activeCertificates = totalCertificates - revokedCertificates - expiredCertificates;

    return NextResponse.json({
      success: true,
      data: {
        rootCA: rootInfo,
        issuingCA: issuingInfo,
        stats: {
          totalCertificates,
          activeCertificates,
          revokedCertificates,
          expiredCertificates,
        },
        ocspUrl: "/api/ocsp",
        crlUrl: "/api/crl",
      },
    });
  } catch (error) {
    console.error("[Admin CA] Error:", error);
    return NextResponse.json(
      { error: "Failed to load CA data" },
      { status: 500 }
    );
  }
}
