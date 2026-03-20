import { NextRequest, NextResponse } from "next/server";
import { getRootCA, getIssuingCA } from "@/lib/crypto/ca";

/**
 * CA Certificate Download Endpoint
 *
 * GET /api/ca/root.crt     - Root CA certificate (PEM)
 * GET /api/ca/issuing.crt  - Issuing CA certificate (PEM)
 * GET /api/ca/chain.pem    - Full chain: Issuing CA + Root CA (PEM)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    switch (type) {
      case "root.crt": {
        const rootCA = getRootCA();
        return new NextResponse(rootCA.pem.certificate, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "Content-Disposition": 'attachment; filename="docal-root-ca.crt"',
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      case "issuing.crt": {
        const issuingCA = getIssuingCA();
        return new NextResponse(issuingCA.pem.certificate, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "Content-Disposition":
              'attachment; filename="docal-issuing-ca.crt"',
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      case "chain.pem": {
        const rootCA = getRootCA();
        const issuingCA = getIssuingCA();
        const chain = issuingCA.pem.certificate + rootCA.pem.certificate;
        return new NextResponse(chain, {
          status: 200,
          headers: {
            "Content-Type": "application/x-pem-file",
            "Content-Disposition": 'attachment; filename="docal-chain.pem"',
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown certificate type. Use: root.crt, issuing.crt, or chain.pem",
          },
          { status: 404 }
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve CA certificate" },
      { status: 500 }
    );
  }
}
