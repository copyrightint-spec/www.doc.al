/**
 * Self-hosted RFC 3161 Time Stamping Authority (TSA)
 *
 * Creates RFC 3161 TimeStampTokens signed by the Issuing CA.
 *
 * References:
 * - RFC 3161: Internet X.509 PKI Time-Stamp Protocol (TSP)
 * - RFC 5652: Cryptographic Message Syntax (CMS)
 *
 * ASN.1 structures:
 *
 * TimeStampReq ::= SEQUENCE {
 *   version        INTEGER { v1(1) },
 *   messageImprint MessageImprint,
 *   reqPolicy      TSAPolicyId OPTIONAL,
 *   nonce          INTEGER OPTIONAL,
 *   certReq        BOOLEAN DEFAULT FALSE,
 *   extensions     [0] IMPLICIT Extensions OPTIONAL
 * }
 *
 * TimeStampResp ::= SEQUENCE {
 *   status         PKIStatusInfo,
 *   timeStampToken ContentInfo OPTIONAL
 * }
 *
 * TSTInfo ::= SEQUENCE {
 *   version        INTEGER { v1(1) },
 *   policy         TSAPolicyId,
 *   messageImprint MessageImprint,
 *   serialNumber   INTEGER,
 *   genTime        GeneralizedTime,
 *   accuracy       Accuracy OPTIONAL,
 *   ordering       BOOLEAN DEFAULT FALSE,
 *   nonce          INTEGER OPTIONAL,
 *   tsa            [0] GeneralName OPTIONAL,
 *   extensions     [1] IMPLICIT Extensions OPTIONAL
 * }
 */

import forge from "node-forge";
import crypto from "crypto";
import { getIssuingCA } from "./ca";

// TSA policy OID for doc.al
const TSA_POLICY_OID = "1.2.3.4.1"; // doc.al TSA policy

// OIDs
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_SIGNED_DATA = "1.2.840.113549.1.7.2";
const OID_TST_INFO = "1.2.840.113549.1.9.16.1.4"; // id-smime-ct-TSTInfo
const OID_CONTENT_TYPE = "1.2.840.113549.1.9.3";
const OID_MESSAGE_DIGEST = "1.2.840.113549.1.9.4";
const OID_SIGNING_TIME = "1.2.840.113549.1.9.5";
const OID_SHA256_WITH_RSA = "1.2.840.113549.1.1.11";

// Serial number counter (in production, this should be persistent)
let _tsaSerialCounter = 0;

function generateTSASerialNumber(): string {
  _tsaSerialCounter++;
  const randomPart = crypto.randomBytes(8).toString("hex");
  const counterPart = _tsaSerialCounter.toString(16).padStart(4, "0");
  return counterPart + randomPart;
}

/**
 * Parse an RFC 3161 TimeStampReq from DER bytes.
 * Returns the message imprint hash and optional nonce.
 */
export function parseTimeStampReq(derBytes: Buffer): {
  hashAlgorithm: string;
  hash: Buffer;
  nonce: Buffer | null;
  certReq: boolean;
} {
  const asn1 = forge.asn1.fromDer(
    forge.util.createBuffer(derBytes.toString("binary"))
  );

  // TimeStampReq is a SEQUENCE
  const seq = asn1.value as forge.asn1.Asn1[];

  // version (INTEGER) - index 0
  // messageImprint (SEQUENCE) - index 1
  const messageImprint = seq[1] as forge.asn1.Asn1;
  const miValue = messageImprint.value as forge.asn1.Asn1[];

  // AlgorithmIdentifier
  const algId = miValue[0] as forge.asn1.Asn1;
  const algIdValue = algId.value as forge.asn1.Asn1[];
  const oid = forge.asn1.derToOid(
    forge.util.createBuffer((algIdValue[0] as forge.asn1.Asn1).value as string)
  );

  // hashedMessage (OCTET STRING)
  const hashBytes = Buffer.from(
    (miValue[1] as forge.asn1.Asn1).value as string,
    "binary"
  );

  // Check for nonce (index 3 if present)
  let nonce: Buffer | null = null;
  let certReq = false;

  for (let i = 2; i < seq.length; i++) {
    const element = seq[i] as forge.asn1.Asn1;
    // BOOLEAN (certReq)
    if (
      element.type === forge.asn1.Type.BOOLEAN &&
      element.tagClass === forge.asn1.Class.UNIVERSAL
    ) {
      certReq = (element.value as string).charCodeAt(0) !== 0;
    }
    // INTEGER (nonce)
    if (
      element.type === forge.asn1.Type.INTEGER &&
      element.tagClass === forge.asn1.Class.UNIVERSAL
    ) {
      nonce = Buffer.from(element.value as string, "binary");
    }
  }

  return { hashAlgorithm: oid, hash: hashBytes, nonce, certReq };
}

/**
 * Build a TSTInfo ASN.1 structure.
 */
function buildTSTInfo(
  hashHex: string,
  serialNumber: string,
  genTime: Date,
  nonce: Buffer | null
): forge.asn1.Asn1 {
  const fields: forge.asn1.Asn1[] = [
    // version INTEGER { v1(1) }
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      forge.util.hexToBytes("01")
    ),
    // policy TSAPolicyId (OID)
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.OID,
      false,
      forge.asn1.oidToDer(TSA_POLICY_OID).getBytes()
    ),
    // messageImprint MessageImprint
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      [
        // AlgorithmIdentifier
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.SEQUENCE,
          true,
          [
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.OID,
              false,
              forge.asn1.oidToDer(OID_SHA256).getBytes()
            ),
            forge.asn1.create(
              forge.asn1.Class.UNIVERSAL,
              forge.asn1.Type.NULL,
              false,
              ""
            ),
          ]
        ),
        // hashedMessage OCTET STRING
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.OCTETSTRING,
          false,
          forge.util.hexToBytes(hashHex)
        ),
      ]
    ),
    // serialNumber INTEGER
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      forge.util.hexToBytes(serialNumber)
    ),
    // genTime GeneralizedTime
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.GENERALIZEDTIME,
      false,
      formatGeneralizedTime(genTime)
    ),
    // accuracy Accuracy OPTIONAL
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      [
        // seconds INTEGER (1 second accuracy)
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.INTEGER,
          false,
          forge.util.hexToBytes("01")
        ),
      ]
    ),
  ];

  // nonce (optional)
  if (nonce) {
    fields.push(
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        nonce.toString("binary")
      )
    );
  }

  return forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    fields
  );
}

/**
 * Format a Date as ASN.1 GeneralizedTime (YYYYMMDDHHmmssZ).
 */
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
 * Create an RFC 3161 TimeStampToken wrapping TSTInfo in a CMS SignedData.
 *
 * The token is a ContentInfo containing SignedData where:
 * - encapContentInfo.eContentType = id-smime-ct-TSTInfo
 * - encapContentInfo.eContent = DER-encoded TSTInfo
 * - The whole thing is signed by the Issuing CA
 */
function buildTimeStampToken(
  tstInfoDer: Buffer,
  issuingCA: ReturnType<typeof getIssuingCA>
): Buffer {
  const cert = issuingCA.certificate;
  const privateKey = issuingCA.privateKey;

  // Compute digest of TSTInfo
  const md = forge.md.sha256.create();
  md.update(tstInfoDer.toString("binary"));
  const tstInfoDigest = md.digest().getBytes();

  // Build authenticated attributes
  const now = new Date();
  const authAttrs = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    0,
    true,
    [
      // content-type attribute
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_CONTENT_TYPE).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SET,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OID,
                false,
                forge.asn1.oidToDer(OID_TST_INFO).getBytes()
              ),
            ]
          ),
        ]
      ),
      // signing-time attribute
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_SIGNING_TIME).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SET,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.UTCTIME,
                false,
                forge.asn1.dateToUtcTime(now)
              ),
            ]
          ),
        ]
      ),
      // message-digest attribute
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_MESSAGE_DIGEST).getBytes()
          ),
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SET,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OCTETSTRING,
                false,
                tstInfoDigest
              ),
            ]
          ),
        ]
      ),
    ]
  );

  // Sign the authenticated attributes
  // For signing, authenticated attributes are encoded as SET OF
  const authAttrsForSigning = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    authAttrs.value as forge.asn1.Asn1[]
  );
  const authAttrsDer = forge.asn1.toDer(authAttrsForSigning).getBytes();

  const signMd = forge.md.sha256.create();
  signMd.update(authAttrsDer);
  const signatureBytes = privateKey.sign(signMd);

  // Build issuer and serialNumber for SignerInfo
  const issuerDN = forge.pki.distinguishedNameToAsn1(cert.issuer);
  const serialHex = cert.serialNumber;

  // Build the SignedData structure
  const signedData = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // version CMSVersion (3 for signed-data with authAttrs)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        forge.util.hexToBytes("03")
      ),
      // digestAlgorithms SET OF AlgorithmIdentifier
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SET,
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
                forge.asn1.oidToDer(OID_SHA256).getBytes()
              ),
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.NULL,
                false,
                ""
              ),
            ]
          ),
        ]
      ),
      // encapContentInfo EncapsulatedContentInfo
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          // eContentType = id-smime-ct-TSTInfo
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_TST_INFO).getBytes()
          ),
          // eContent [0] EXPLICIT OCTET STRING
          forge.asn1.create(
            forge.asn1.Class.CONTEXT_SPECIFIC,
            0,
            true,
            [
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OCTETSTRING,
                false,
                tstInfoDer.toString("binary")
              ),
            ]
          ),
        ]
      ),
      // certificates [0] IMPLICIT CertificateSet
      forge.asn1.create(
        forge.asn1.Class.CONTEXT_SPECIFIC,
        0,
        true,
        [forge.pki.certificateToAsn1(cert)]
      ),
      // signerInfos SET OF SignerInfo
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SET,
        true,
        [
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SEQUENCE,
            true,
            [
              // version (1 = issuerAndSerialNumber)
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.INTEGER,
                false,
                forge.util.hexToBytes("01")
              ),
              // issuerAndSerialNumber
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.SEQUENCE,
                true,
                [
                  issuerDN,
                  forge.asn1.create(
                    forge.asn1.Class.UNIVERSAL,
                    forge.asn1.Type.INTEGER,
                    false,
                    forge.util.hexToBytes(serialHex)
                  ),
                ]
              ),
              // digestAlgorithm
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.SEQUENCE,
                true,
                [
                  forge.asn1.create(
                    forge.asn1.Class.UNIVERSAL,
                    forge.asn1.Type.OID,
                    false,
                    forge.asn1.oidToDer(OID_SHA256).getBytes()
                  ),
                  forge.asn1.create(
                    forge.asn1.Class.UNIVERSAL,
                    forge.asn1.Type.NULL,
                    false,
                    ""
                  ),
                ]
              ),
              // signedAttrs [0] IMPLICIT
              authAttrs,
              // signatureAlgorithm
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
              // signature OCTET STRING
              forge.asn1.create(
                forge.asn1.Class.UNIVERSAL,
                forge.asn1.Type.OCTETSTRING,
                false,
                signatureBytes
              ),
            ]
          ),
        ]
      ),
    ]
  );

  // Wrap in ContentInfo
  const contentInfo = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // contentType = id-signedData
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer(OID_SIGNED_DATA).getBytes()
      ),
      // content [0] EXPLICIT SignedData
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        signedData,
      ]),
    ]
  );

  const der = forge.asn1.toDer(contentInfo).getBytes();
  return Buffer.from(der, "binary");
}

/**
 * Create an RFC 3161 TimeStampResponse for a given SHA-256 hash.
 *
 * @param hashHex - SHA-256 hash in hexadecimal
 * @param nonce - optional nonce from the request
 * @returns DER-encoded TimeStampResp
 */
export function createTimeStampResponse(
  hashHex: string,
  nonce: Buffer | null = null
): Buffer {
  const issuingCA = getIssuingCA();
  const serialNumber = generateTSASerialNumber();
  const genTime = new Date();

  // Build TSTInfo
  const tstInfo = buildTSTInfo(hashHex, serialNumber, genTime, nonce);
  const tstInfoDer = Buffer.from(
    forge.asn1.toDer(tstInfo).getBytes(),
    "binary"
  );

  // Build TimeStampToken (CMS SignedData wrapping TSTInfo)
  const timeStampToken = buildTimeStampToken(tstInfoDer, issuingCA);

  // Build TimeStampResp
  const tsResp = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      // status PKIStatusInfo
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          // status INTEGER { granted(0) }
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.INTEGER,
            false,
            forge.util.hexToBytes("00")
          ),
        ]
      ),
      // timeStampToken ContentInfo
      forge.asn1.fromDer(
        forge.util.createBuffer(timeStampToken.toString("binary"))
      ),
    ]
  );

  return Buffer.from(forge.asn1.toDer(tsResp).getBytes(), "binary");
}

/**
 * Create just the TimeStampToken (without the response wrapper).
 * Used for embedding in PKCS#7 signatures as an unsigned attribute.
 */
export function createTimeStampToken(hashHex: string): Buffer {
  const issuingCA = getIssuingCA();
  const serialNumber = generateTSASerialNumber();
  const genTime = new Date();

  const tstInfo = buildTSTInfo(hashHex, serialNumber, genTime, null);
  const tstInfoDer = Buffer.from(
    forge.asn1.toDer(tstInfo).getBytes(),
    "binary"
  );

  return buildTimeStampToken(tstInfoDer, issuingCA);
}
