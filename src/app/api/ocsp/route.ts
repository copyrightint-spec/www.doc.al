import { NextRequest, NextResponse } from "next/server";
import forge from "node-forge";
import { prisma } from "@/lib/db";
import { getIssuingCA } from "@/lib/crypto/ca";

/**
 * OCSP Responder (RFC 6960 DER-encoded)
 *
 * Supports:
 * - POST: Content-Type: application/ocsp-request (DER body)
 * - GET:  /api/ocsp/{base64-encoded-request}
 * - GET:  /api/ocsp?serial=xxx (JSON fallback for internal use)
 *
 * Returns proper DER-encoded OCSPResponse (application/ocsp-response).
 *
 * ASN.1 structures implemented:
 *
 * OCSPResponse ::= SEQUENCE {
 *   responseStatus ENUMERATED { successful(0) },
 *   responseBytes  [0] EXPLICIT SEQUENCE {
 *     responseType OID (id-pkix-ocsp-basic = 1.3.6.1.5.5.7.48.1.1),
 *     response     OCTET STRING containing BasicOCSPResponse
 *   }
 * }
 *
 * BasicOCSPResponse ::= SEQUENCE {
 *   tbsResponseData   ResponseData,
 *   signatureAlgorithm AlgorithmIdentifier,
 *   signature          BIT STRING,
 *   certs              [0] EXPLICIT SEQUENCE OF Certificate OPTIONAL
 * }
 *
 * ResponseData ::= SEQUENCE {
 *   version           [0] EXPLICIT INTEGER DEFAULT v1,
 *   responderID       ResponderID,
 *   producedAt        GeneralizedTime,
 *   responses         SEQUENCE OF SingleResponse,
 *   responseExtensions [1] EXPLICIT Extensions OPTIONAL
 * }
 */

// OIDs
const OID_OCSP_BASIC = "1.3.6.1.5.5.7.48.1.1";
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_SHA256_WITH_RSA = "1.2.840.113549.1.1.11";
const OID_SHA1 = "1.3.14.3.2.26";

// CertStatus tag values
const CERT_STATUS_GOOD = 0;
const CERT_STATUS_REVOKED = 1;
const CERT_STATUS_UNKNOWN = 2;

interface ParsedOCSPRequest {
  serialNumbers: string[];
  issuerNameHash?: string;
  issuerKeyHash?: string;
  hashAlgorithmOid?: string;
}

/**
 * Parse a DER-encoded OCSPRequest to extract serial numbers.
 *
 * OCSPRequest ::= SEQUENCE {
 *   tbsRequest TBSRequest
 * }
 * TBSRequest ::= SEQUENCE {
 *   version    [0] EXPLICIT INTEGER DEFAULT v1,
 *   requestorName [1] EXPLICIT GeneralName OPTIONAL,
 *   requestList SEQUENCE OF Request
 * }
 * Request ::= SEQUENCE {
 *   reqCert CertID
 * }
 * CertID ::= SEQUENCE {
 *   hashAlgorithm AlgorithmIdentifier,
 *   issuerNameHash OCTET STRING,
 *   issuerKeyHash  OCTET STRING,
 *   serialNumber   CertificateSerialNumber
 * }
 */
function parseOCSPRequest(derBytes: Buffer): ParsedOCSPRequest {
  const asn1 = forge.asn1.fromDer(
    forge.util.createBuffer(derBytes.toString("binary"))
  );

  const result: ParsedOCSPRequest = { serialNumbers: [] };

  // OCSPRequest -> tbsRequest
  const ocspReqValue = asn1.value as forge.asn1.Asn1[];
  const tbsRequest = ocspReqValue[0] as forge.asn1.Asn1;
  const tbsValue = tbsRequest.value as forge.asn1.Asn1[];

  // Find the requestList (SEQUENCE OF Request)
  // It may be at index 0 if no version/requestorName, or later
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
    // reqCert is the first element (CertID SEQUENCE)
    const certId = reqValue[0] as forge.asn1.Asn1;
    const certIdValue = certId.value as forge.asn1.Asn1[];

    // hashAlgorithm (index 0)
    const algId = certIdValue[0] as forge.asn1.Asn1;
    const algIdValue = algId.value as forge.asn1.Asn1[];
    const hashAlgOid = forge.asn1.derToOid(
      forge.util.createBuffer((algIdValue[0] as forge.asn1.Asn1).value as string)
    );
    result.hashAlgorithmOid = hashAlgOid;

    // issuerNameHash (index 1)
    const nameHash = (certIdValue[1] as forge.asn1.Asn1).value as string;
    result.issuerNameHash = forge.util.bytesToHex(nameHash);

    // issuerKeyHash (index 2)
    const keyHash = (certIdValue[2] as forge.asn1.Asn1).value as string;
    result.issuerKeyHash = forge.util.bytesToHex(keyHash);

    // serialNumber (index 3, INTEGER)
    const serialBytes = (certIdValue[3] as forge.asn1.Asn1).value as string;
    const serialHex = forge.util.bytesToHex(serialBytes);
    result.serialNumbers.push(serialHex);
  }

  return result;
}

/**
 * Look up certificate status from DB.
 */
async function lookupCertStatus(
  serialNumber: string
): Promise<{
  status: "good" | "revoked" | "unknown";
  revokedAt?: Date;
  reason?: string;
}> {
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
    return { status: "unknown" };
  }

  if (cert.revoked) {
    return {
      status: "revoked",
      revokedAt: cert.revokedAt || undefined,
      reason: cert.revokeReason || undefined,
    };
  }

  return { status: "good" };
}

/**
 * Build a DER-encoded CertID ASN.1 structure for a given serial number.
 */
function buildCertId(
  serialNumber: string,
  hashAlgorithmOid: string
): forge.asn1.Asn1 {
  const issuingCA = getIssuingCA();
  const cert = issuingCA.certificate;

  // Compute issuer name hash and key hash
  const issuerDnDer = forge.asn1.toDer(
    forge.pki.distinguishedNameToAsn1(cert.subject)
  ).getBytes();

  const pubKeyDer = forge.asn1
    .toDer(forge.pki.publicKeyToAsn1(cert.publicKey))
    .getBytes();

  // Use the same hash algorithm as the request (or SHA-1 for standard OCSP)
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
    // Default to SHA-1 (most common in OCSP)
    const md1 = forge.md.sha1.create();
    md1.update(issuerDnDer);
    nameHash = md1.digest().getBytes();

    const md2 = forge.md.sha1.create();
    md2.update(pubKeyDer);
    keyHash = md2.digest().getBytes();
  }

  const algOid = hashAlgorithmOid || OID_SHA1;

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // hashAlgorithm AlgorithmIdentifier
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(algOid).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.NULL,
            false,
            ""
          ),
        ]
      ),
      // issuerNameHash OCTET STRING
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        nameHash
      ),
      // issuerKeyHash OCTET STRING
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OCTETSTRING,
        false,
        keyHash
      ),
      // serialNumber INTEGER
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        forge.util.hexToBytes(serialNumber)
      ),
    ]
  );
}

/**
 * Build a DER-encoded SingleResponse.
 *
 * SingleResponse ::= SEQUENCE {
 *   certID       CertID,
 *   certStatus   CertStatus,
 *   thisUpdate   GeneralizedTime,
 *   nextUpdate   [0] EXPLICIT GeneralizedTime OPTIONAL
 * }
 */
function buildSingleResponse(
  serialNumber: string,
  status: "good" | "revoked" | "unknown",
  revokedAt?: Date,
  hashAlgorithmOid?: string
): forge.asn1.Asn1 {
  const now = new Date();
  const nextUpdate = new Date(now);
  nextUpdate.setHours(nextUpdate.getHours() + 24);

  const certId = buildCertId(serialNumber, hashAlgorithmOid || OID_SHA1);

  // CertStatus: good [0] IMPLICIT NULL, revoked [1] IMPLICIT RevokedInfo, unknown [2] IMPLICIT NULL
  let certStatus: forge.asn1.Asn1;
  if (status === "good") {
    certStatus = forge.asn1.create(
      forge.asn1.Class.CONTEXT_SPECIFIC,
      CERT_STATUS_GOOD,
      false,
      ""
    );
  } else if (status === "revoked") {
    const revokedTime = revokedAt || new Date();
    certStatus = forge.asn1.create(
      forge.asn1.Class.CONTEXT_SPECIFIC,
      CERT_STATUS_REVOKED,
      true,
      [
        // revocationTime GeneralizedTime
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.GENERALIZEDTIME,
          false,
          formatGeneralizedTime(revokedTime)
        ),
      ]
    );
  } else {
    certStatus = forge.asn1.create(
      forge.asn1.Class.CONTEXT_SPECIFIC,
      CERT_STATUS_UNKNOWN,
      false,
      ""
    );
  }

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      certId,
      certStatus,
      // thisUpdate GeneralizedTime
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.GENERALIZEDTIME,
        false,
        formatGeneralizedTime(now)
      ),
      // nextUpdate [0] EXPLICIT GeneralizedTime
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.GENERALIZEDTIME,
          false,
          formatGeneralizedTime(nextUpdate)
        ),
      ]),
    ]
  );
}

/**
 * Build a complete DER-encoded OCSPResponse.
 */
async function buildOCSPResponse(
  serialNumbers: string[],
  hashAlgorithmOid?: string
): Promise<Buffer> {
  const issuingCA = getIssuingCA();
  const cert = issuingCA.certificate;
  const privateKey = issuingCA.privateKey;

  const now = new Date();

  // Build SingleResponse for each serial number
  const singleResponses: forge.asn1.Asn1[] = [];
  for (const serial of serialNumbers) {
    const certStatus = await lookupCertStatus(serial);
    singleResponses.push(
      buildSingleResponse(serial, certStatus.status, certStatus.revokedAt, hashAlgorithmOid)
    );
  }

  // ResponderID: byName [1] -- use the issuer's DN
  const responderID = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    1,
    true,
    [forge.pki.distinguishedNameToAsn1(cert.subject)]
  );

  // ResponseData (tbsResponseData)
  const tbsResponseData = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // version [0] EXPLICIT INTEGER DEFAULT v1 (omitted for v1)
      // responderID
      responderID,
      // producedAt GeneralizedTime
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.GENERALIZEDTIME,
        false,
        formatGeneralizedTime(now)
      ),
      // responses SEQUENCE OF SingleResponse
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        singleResponses
      ),
    ]
  );

  // Sign the tbsResponseData
  const tbsDer = forge.asn1.toDer(tbsResponseData).getBytes();
  const md = forge.md.sha256.create();
  md.update(tbsDer);
  const signatureBytes = privateKey.sign(md);

  // BasicOCSPResponse
  const basicOCSPResponse = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      tbsResponseData,
      // signatureAlgorithm AlgorithmIdentifier (sha256WithRSAEncryption)
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
      // signature BIT STRING (with leading 0x00 for unused bits)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.BITSTRING,
        false,
        String.fromCharCode(0x00) + signatureBytes
      ),
      // certs [0] EXPLICIT SEQUENCE OF Certificate
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

  const basicOCSPResponseDer = forge.asn1.toDer(basicOCSPResponse).getBytes();

  // OCSPResponse
  const ocspResponse = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // responseStatus ENUMERATED { successful(0) }
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.ENUMERATED,
        false,
        String.fromCharCode(0x00)
      ),
      // responseBytes [0] EXPLICIT SEQUENCE
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SEQUENCE,
          true,
          [
            // responseType OID (id-pkix-ocsp-basic)
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OID,
              false,
              forge.asn1.oidToDer(OID_OCSP_BASIC).getBytes()
            ),
            // response OCTET STRING (contains BasicOCSPResponse)
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OCTETSTRING,
              false,
              basicOCSPResponseDer
            ),
          ]
        ),
      ]),
    ]
  );

  const der = forge.asn1.toDer(ocspResponse).getBytes();
  return Buffer.from(der, "binary");
}

/**
 * Build an error OCSPResponse (no responseBytes).
 */
function buildOCSPErrorResponse(
  statusCode: number
): Buffer {
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
  const der = forge.asn1.toDer(ocspResponse).getBytes();
  return Buffer.from(der, "binary");
}

function formatGeneralizedTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}Z`;
}

/**
 * Handle a DER-encoded OCSP request and return DER-encoded response.
 */
async function handleOCSPDerRequest(derBytes: Buffer): Promise<Buffer> {
  try {
    const parsed = parseOCSPRequest(derBytes);
    if (parsed.serialNumbers.length === 0) {
      // malformedRequest(1)
      return buildOCSPErrorResponse(1);
    }
    return await buildOCSPResponse(parsed.serialNumbers, parsed.hashAlgorithmOid);
  } catch (err) {
    console.error("[OCSP] Error processing request:", err);
    // internalError(2)
    return buildOCSPErrorResponse(2);
  }
}

export async function GET(req: NextRequest) {
  try {
    const serial = req.nextUrl.searchParams.get("serial");

    // If no serial, check for base64-encoded OCSP request in the path
    // GET /api/ocsp/{base64-encoded-request}
    const pathname = req.nextUrl.pathname;
    const ocspPrefix = "/api/ocsp/";
    if (!serial && pathname.startsWith(ocspPrefix) && pathname.length > ocspPrefix.length) {
      const b64 = decodeURIComponent(pathname.substring(ocspPrefix.length));
      try {
        const derBytes = Buffer.from(b64, "base64");
        const response = await handleOCSPDerRequest(derBytes);
        return new NextResponse(new Uint8Array(response), {
          status: 200,
          headers: {
            "Content-Type": "application/ocsp-response",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        return new NextResponse(new Uint8Array(buildOCSPErrorResponse(1)), {
          status: 200,
          headers: { "Content-Type": "application/ocsp-response" },
        });
      }
    }

    // JSON fallback: ?serial=xxx
    if (!serial) {
      return NextResponse.json(
        {
          service: "doc.al OCSP Responder (RFC 6960)",
          status: "online",
          usage:
            "POST with application/ocsp-request (DER), GET /api/ocsp/{base64-request}, or GET /api/ocsp?serial=<hex>",
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60",
          },
        }
      );
    }

    // JSON mode for legacy/internal use
    const certStatus = await lookupCertStatus(serial);
    let issuerDN = "doc.al Issuing CA";
    try {
      const issuingCA = getIssuingCA();
      issuerDN = issuingCA.certificate.subject.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", ");
    } catch {
      // CA not available
    }

    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setHours(nextUpdate.getHours() + 24);

    return NextResponse.json(
      {
        status: certStatus.status,
        serialNumber: serial,
        thisUpdate: now.toISOString(),
        nextUpdate: nextUpdate.toISOString(),
        issuer: issuerDN,
        ...(certStatus.revokedAt
          ? { revocationTime: certStatus.revokedAt.toISOString() }
          : {}),
        ...(certStatus.reason
          ? { revocationReason: certStatus.reason }
          : {}),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal OCSP responder error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/ocsp-request")) {
      // DER-encoded OCSP request
      const body = await req.arrayBuffer();
      const derBytes = Buffer.from(body);

      if (derBytes.length === 0) {
        return new NextResponse(new Uint8Array(buildOCSPErrorResponse(1)), {
          status: 200,
          headers: { "Content-Type": "application/ocsp-response" },
        });
      }

      const response = await handleOCSPDerRequest(derBytes);
      return new NextResponse(new Uint8Array(response), {
        status: 200,
        headers: {
          "Content-Type": "application/ocsp-response",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // JSON fallback for internal use
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request. Send application/ocsp-request (DER) or JSON { serialNumber: string }",
        },
        { status: 400 }
      );
    }

    const serialNumber = body?.serialNumber;
    if (!serialNumber || typeof serialNumber !== "string") {
      return NextResponse.json(
        { error: "Request body must contain 'serialNumber' string" },
        { status: 400 }
      );
    }

    const certStatus = await lookupCertStatus(serialNumber);
    let issuerDN = "doc.al Issuing CA";
    try {
      const issuingCA = getIssuingCA();
      issuerDN = issuingCA.certificate.subject.attributes
        .map((a) => `${a.shortName || a.name}=${a.value}`)
        .join(", ");
    } catch {
      // CA not available
    }

    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setHours(nextUpdate.getHours() + 24);

    return NextResponse.json(
      {
        status: certStatus.status,
        serialNumber,
        thisUpdate: now.toISOString(),
        nextUpdate: nextUpdate.toISOString(),
        issuer: issuerDN,
        ...(certStatus.revokedAt
          ? { revocationTime: certStatus.revokedAt.toISOString() }
          : {}),
        ...(certStatus.reason
          ? { revocationReason: certStatus.reason }
          : {}),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal OCSP responder error" },
      { status: 500 }
    );
  }
}
