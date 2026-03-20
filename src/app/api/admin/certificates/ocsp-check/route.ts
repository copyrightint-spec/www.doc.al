import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/certificates/ocsp-check?id=xxx
 *
 * Checks the OCSP status of a certificate by looking at its
 * revocation status in the database.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const certId = req.nextUrl.searchParams.get("id");
  if (!certId) {
    return NextResponse.json({ error: "Missing certificate ID" }, { status: 400 });
  }

  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: certId },
      select: {
        id: true,
        serialNumber: true,
        revoked: true,
        revokedAt: true,
        revokeReason: true,
        validFrom: true,
        validTo: true,
      },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const now = new Date();
    let status = "good";

    if (cert.revoked) {
      status = "revoked";
    } else if (now < cert.validFrom) {
      status = "not_yet_valid";
    } else if (now > cert.validTo) {
      status = "expired";
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        serialNumber: cert.serialNumber,
        revokedAt: cert.revokedAt?.toISOString() || null,
        revokeReason: cert.revokeReason,
      },
    });
  } catch (error) {
    console.error("[OCSP Check] Error:", error);
    return NextResponse.json(
      { error: "Failed to check OCSP status" },
      { status: 500 }
    );
  }
}
