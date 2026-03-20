import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  clearRootCACache,
  clearIssuingCACache,
  getRootCA,
  getIssuingCA,
} from "@/lib/crypto/ca";
import { generateUserCertificate } from "@/lib/crypto/certificates";
import forge from "node-forge";

function extractCertInfo(cert: forge.pki.Certificate) {
  const getAttr = (name: string) => {
    const attr = cert.subject.getField(name);
    return attr ? (attr.value as string) : "";
  };

  const derBytes = forge.asn1
    .toDer(forge.pki.certificateToAsn1(cert))
    .getBytes();
  const md = forge.md.sha256.create();
  md.update(derBytes);
  const fingerprint =
    md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(":") || "";

  return {
    commonName: getAttr("commonName"),
    serialNumber: cert.serialNumber,
    validFrom: cert.validity.notBefore.toISOString(),
    validTo: cert.validity.notAfter.toISOString(),
    fingerprintSHA256: fingerprint,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Vetem SUPER_ADMIN mund te rigjeroje certifikatat CA" },
        { status: 403 }
      );
    }

    let body: { type: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "JSON i pavlefshem" },
        { status: 400 }
      );
    }

    const { type } = body;

    if (!["root", "issuing", "user-certificates"].includes(type)) {
      return NextResponse.json(
        {
          error:
            "Tipi duhet te jete 'root', 'issuing', ose 'user-certificates'",
        },
        { status: 400 }
      );
    }

    if (type === "root") {
      // Clear root CA cache - will regenerate on next access
      // Note: if ROOT_CA_CERT/ROOT_CA_KEY env vars are set, those will be used instead
      clearRootCACache();
      // Also clear issuing CA since it depends on root
      clearIssuingCACache();

      const newRoot = getRootCA();
      const rootInfo = extractCertInfo(newRoot.certificate);

      await prisma.auditLog.create({
        data: {
          action: "ROOT_CA_REGENERATED",
          entityType: "CA",
          entityId: "root",
          userId: session.user.id,
          metadata: {
            regeneratedBy: session.user.email || session.user.id,
            newSerialNumber: rootInfo.serialNumber,
            newFingerprint: rootInfo.fingerprintSHA256,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Root CA u rigjenerua me sukses",
        data: rootInfo,
      });
    }

    if (type === "issuing") {
      // Clear only issuing CA cache
      clearIssuingCACache();

      const newIssuing = getIssuingCA();
      const issuingInfo = extractCertInfo(newIssuing.certificate);

      await prisma.auditLog.create({
        data: {
          action: "ISSUING_CA_REGENERATED",
          entityType: "CA",
          entityId: "issuing",
          userId: session.user.id,
          metadata: {
            regeneratedBy: session.user.email || session.user.id,
            newSerialNumber: issuingInfo.serialNumber,
            newFingerprint: issuingInfo.fingerprintSHA256,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Issuing CA u rigjenerua me sukses",
        data: issuingInfo,
      });
    }

    // type === "user-certificates"
    // Find all active (non-revoked, non-expired) certificates with users
    const activeCerts = await prisma.certificate.findMany({
      where: {
        revoked: false,
        validTo: { gt: new Date() },
        userId: { not: null },
      },
      select: {
        id: true,
        serialNumber: true,
        userId: true,
        type: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    let regeneratedCount = 0;
    const errors: string[] = [];

    for (const oldCert of activeCerts) {
      if (!oldCert.user || !oldCert.userId) continue;

      try {
        // Revoke the old certificate
        await prisma.certificate.update({
          where: { id: oldCert.id },
          data: {
            revoked: true,
            revokedAt: new Date(),
            revokeReason: "CA_COMPROMISE - Rigjenerim i certifikatave",
          },
        });

        // Generate new certificate
        await generateUserCertificate(oldCert.userId, {
          commonName: oldCert.user.name,
          organization: oldCert.user.organization?.name,
          country: "AL",
          validityYears: 2,
          type: oldCert.type,
        });

        regeneratedCount++;
      } catch (err) {
        errors.push(
          `Gabim per ${oldCert.user.email}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "USER_CERTIFICATES_REGENERATED",
        entityType: "Certificate",
        entityId: "batch",
        userId: session.user.id,
        metadata: {
          regeneratedBy: session.user.email || session.user.id,
          totalFound: activeCerts.length,
          regeneratedCount,
          errorCount: errors.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${regeneratedCount} certifikata u rigjeneruan me sukses`,
      data: {
        totalFound: activeCerts.length,
        regenerated: regeneratedCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("[CA Regenerate] Error:", error);
    return NextResponse.json(
      { error: "Ndodhi nje gabim gjate rigjenerimit" },
      { status: 500 }
    );
  }
}
