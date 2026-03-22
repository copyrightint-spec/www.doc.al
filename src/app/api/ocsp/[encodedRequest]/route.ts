import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";
import { prisma } from "@/lib/db";
import { getIssuingCA } from "@/lib/crypto/ca";

/**
 * OCSP GET endpoint for base64-encoded requests
 * GET /api/ocsp/{base64-encoded-OCSPRequest}
 *
 * Per RFC 6960 Section A.1, the GET method encodes the OCSPRequest
 * as base64, then URL-encodes it in the path.
 */

// OIDs
const OID_OCSP_BASIC = "1.3.6.1.5.5.7.48.1.1";
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_SHA256_WITH_RSA = "1.2.840.113549.1.1.11";
const OID_SHA1 = "1.3.14.3.2.26";

function formatGeneralizedTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}Z`;
}

function parseOCSPRequest(derBytes: Buffer): {
  serialNumbers: string[];
  hashAlgorithmOid?: string;
} {
  const asn1 = forge.asn1.fromDer(
    forge.util.createBuffer(derBytes.toString("binary"))
  );
  const result: { serialNumbers: string[]; hashAlgorithmOid?: string } = {
    serialNumbers: [],
  };

  const ocspReqValue = asn1.value as forge.asn1.Asn1[];
  const tbsRequest = ocspReqValue[0] as forge.asn1.Asn1;
  const tbsValue = tbsRequest.value as forge.asn1.Asn1[];

  let requestList: forge.asn1.Asn1 | null = null;
  for (const elem of tbsValue) {
    const e = elem as forge.asn1.Asn1;
    if (
      e.tagClass === forge.asn1.Class.UNIVERSAL &&
      e.type === forge.asn1.Type.SEQUENCE &&
      e.constructed
    ) {
      requestList = e;
      break;
    }
  }

  if (!requestList) return result;

  const requests = requestList.value as forge.asn1.Asn1[];
  for (const req of requests) {
    const reqValue = (req as forge.asn1.Asn1).value as forge.asn1.Asn1[];
    const certId = reqValue[0] as forge.asn1.Asn1;
    const certIdValue = certId.value as forge.asn1.Asn1[];

    const algId = certIdValue[0] as forge.asn1.Asn1;
    const algIdValue = algId.value as forge.asn1.Asn1[];
    result.hashAlgorithmOid = forge.asn1.derToOid(
      forge.util.createBuffer(
        (algIdValue[0] as forge.asn1.Asn1).value as string
      )
    );

    const serialBytes = (certIdValue[3] as forge.asn1.Asn1).value as string;
    result.serialNumbers.push(forge.util.bytesToHex(serialBytes));
  }

  return result;
}

async function lookupCertStatus(
  serialNumber: string
): Promise<{
  status: "good" | "revoked" | "unknown";
  revokedAt?: Date;
}> {
  const cert = await prisma.certificate.findUnique({
    where: { serialNumber },
    select: { revoked: true, revokedAt: true },
  });
  if (!cert) return { status: "unknown" };
  if (cert.revoked) return { status: "revoked", revokedAt: cert.revokedAt || undefined };
  return { status: "good" };
}

function buildCertId(
  serialNumber: string,
  hashAlgorithmOid: string
): forge.asn1.Asn1 {
  const issuingCA = getIssuingCA();
  const cert = issuingCA.certificate;

  const issuerDnDer = forge.asn1
    .toDer(forge.pki.distinguishedNameToAsn1(cert.subject))
    .getBytes();
  const pubKeyDer = forge.asn1
    .toDer(forge.pki.publicKeyToAsn1(cert.publicKey))
    .getBytes();

  let nameHash: string;
  let keyHash: string;
  if (hashAlgorithmOid === OID_SHA256) {
    const md1 = forge.md.sha256.create();
    md1.update(issuerDnDer);
    nameHash = md1.digest().getBytes();
    const md2 = forge.md.sha256.create();
    md2.update(pubKeyDer);
    keyHash = md2.digest().getBytes();
  } else {
    const md1 = forge.md.sha1.create();
    md1.update(issuerDnDer);
    nameHash = md1.digest().getBytes();
    const md2 = forge.md.sha1.create();
    md2.update(pubKeyDer);
    keyHash = md2.digest().getBytes();
  }

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(hashAlgorithmOid || OID_SHA1).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.NULL,
            false,
            ""
          ),
        ]
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        nameHash
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        keyHash
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        forge.util.hexToBytes(serialNumber)
      ),
    ]
  );
}

async function buildOCSPResponse(
  serialNumbers: string[],
  hashAlgorithmOid?: string
): Promise<Buffer> {
  const issuingCA = getIssuingCA();
  const cert = issuingCA.certificate;
  const privateKey = issuingCA.privateKey;
  const now = new Date();
  const nextUpdate = new Date(now);
  nextUpdate.setHours(nextUpdate.getHours() + 24);

  const singleResponses: forge.asn1.Asn1[] = [];
  for (const serial of serialNumbers) {
    const certStatus = await lookupCertStatus(serial);
    const certId = buildCertId(serial, hashAlgorithmOid || OID_SHA1);

    let certStatusAsn1: forge.asn1.Asn1;
    if (certStatus.status === "good") {
      certStatusAsn1 = forge.asn1.create(
        forge.asn1.Class.CONTEXT_SPECIFIC,
        0,
        false,
        ""
      );
    } else if (certStatus.status === "revoked") {
      certStatusAsn1 = forge.asn1.create(
        forge.asn1.Class.CONTEXT_SPECIFIC,
        1,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.GENERALIZEDTIME,
            false,
            formatGeneralizedTime(certStatus.revokedAt || new Date())
          ),
        ]
      );
    } else {
      certStatusAsn1 = forge.asn1.create(
        forge.asn1.Class.CONTEXT_SPECIFIC,
        2,
        false,
        ""
      );
    }

    singleResponses.push(
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          certId,
          certStatusAsn1,
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.GENERALIZEDTIME,
            false,
            formatGeneralizedTime(now)
          ),
          forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.GENERALIZEDTIME,
              false,
              formatGeneralizedTime(nextUpdate)
            ),
          ]),
        ]
      )
    );
  }

  const responderID = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    1,
    true,
    [forge.pki.distinguishedNameToAsn1(cert.subject)]
  );

  const tbsResponseData = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      responderID,
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.GENERALIZEDTIME,
        false,
        formatGeneralizedTime(now)
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        singleResponses
      ),
    ]
  );

  const tbsDer = forge.asn1.toDer(tbsResponseData).getBytes();
  const md = forge.md.sha256.create();
  md.update(tbsDer);
  const signatureBytes = privateKey.sign(md);

  const basicOCSPResponse = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      tbsResponseData,
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_SHA256_WITH_RSA).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.NULL,
            false,
            ""
          ),
        ]
      ),
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.BITSTRING,
        false,
        String.fromCharCode(0x00) + signatureBytes
      ),
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SEQUENCE,
          true,
          [forge.pki.certificateToAsn1(cert)]
        ),
      ]),
    ]
  );

  const basicDer = forge.asn1.toDer(basicOCSPResponse).getBytes();

  const ocspResponse = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.ENUMERATED,
        false,
        String.fromCharCode(0x00)
      ),
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SEQUENCE,
          true,
          [
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OID,
              false,
              forge.asn1.oidToDer(OID_OCSP_BASIC).getBytes()
            ),
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OCTETSTRING,
              false,
              basicDer
            ),
          ]
        ),
      ]),
    ]
  );

  return Buffer.from(forge.asn1.toDer(ocspResponse).getBytes(), "binary");
}

function buildOCSPErrorResponse(statusCode: number): Buffer {
  const ocspResponse = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.ENUMERATED,
        false,
        String.fromCharCode(statusCode)
      ),
    ]
  );
  return Buffer.from(forge.asn1.toDer(ocspResponse).getBytes(), "binary");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ encodedRequest: string }> }
) {
  try {
    const { encodedRequest } = await params;
    const b64 = decodeURIComponent(encodedRequest);
    const derBytes = Buffer.from(b64, "base64");

    if (derBytes.length === 0) {
      return new NextResponse(new Uint8Array(buildOCSPErrorResponse(1)), {
        status: 200,
        headers: { "Content-Type": "application/ocsp-response" },
      });
    }

    const parsed = parseOCSPRequest(derBytes);
    if (parsed.serialNumbers.length === 0) {
      return new NextResponse(new Uint8Array(buildOCSPErrorResponse(1)), {
        status: 200,
        headers: { "Content-Type": "application/ocsp-response" },
      });
    }

    const response = await buildOCSPResponse(
      parsed.serialNumbers,
      parsed.hashAlgorithmOid
    );
    return new NextResponse(new Uint8Array(response), {
      status: 200,
      headers: {
        "Content-Type": "application/ocsp-response",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[OCSP] Error processing GET request:", err);
    return new NextResponse(new Uint8Array(buildOCSPErrorResponse(2)), {
      status: 200,
      headers: { "Content-Type": "application/ocsp-response" },
    });
  }
}
