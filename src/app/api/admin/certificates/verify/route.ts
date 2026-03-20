import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyCertificateChain } from "@/lib/crypto/ca";

/**
 * GET /api/admin/certificates/verify?id=xxx
 *
 * Verifies a certificate's chain against the CA hierarchy.
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
      select: { publicKey: true, serialNumber: true },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // The publicKey field stores the PEM certificate
    // Try to verify the chain
    const result = verifyCertificateChain(cert.publicKey);

    return NextResponse.json({
      success: true,
      data: {
        valid: result.valid,
        error: result.error || null,
        serialNumber: cert.serialNumber,
      },
    });
  } catch (error) {
    console.error("[Cert Verify] Error:", error);
    return NextResponse.json({
      success: true,
      data: {
        valid: false,
        error: "Gabim gjate verifikimit te zinxhirit",
      },
    });
  }
}
