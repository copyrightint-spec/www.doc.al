/**
 * PAdES (PDF Advanced Electronic Signature) Implementation
 *
 * Uses @signpdf library for proper PAdES-compliant digital signatures.
 * Creates /AcroForm, /Sig dictionary, ByteRange, PKCS#7 - all standards-compliant.
 *
 * Standards:
 * - PAdES Baseline (ETSI EN 319 142)
 * - CAdES (ETSI EN 319 122)
 * - PKCS#7/CMS (RFC 5652)
 * - PDF Digital Signatures (ISO 32000-2)
 *
 * ETSI compliance:
 * - SubFilter: ETSI.CAdES.detached
 * - No signingTime in CMS signed attributes (time comes from /M in sig dict)
 * - ESS-signing-certificate-v2 (OID 1.2.840.113549.1.9.16.2.47) in signed attributes
 */

import forge from "node-forge";
import { PDFDocument } from "pdf-lib";
import { Signer } from "@signpdf/utils";
import { prisma } from "@/lib/db";
import { decryptPrivateKey } from "./certificates";

/**
 * Sign a PDF with PAdES-compliant digital signature.
 * Uses @signpdf/placeholder-pdf-lib to add signature placeholder,
 * then @signpdf/signpdf to embed the PKCS#7 signature.
 */
export async function signPdfWithPAdES(
  pdfBuffer: Buffer,
  certificate: {
    publicKey: string;
    encryptedPrivateKey: string;
    certificatePem?: string | null;
  },
  signerName: string,
  reason: string = "Nënshkrim digjital përmes doc.al"
): Promise<Buffer> {
  try {
    // Step 1: Decrypt private key
    const privateKeyPem = decryptPrivateKey(certificate.encryptedPrivateKey);

    // Step 2: Get or reconstruct certificate PEM
    let certPem = certificate.certificatePem;
    if (!certPem) {
      certPem = await reconstructCertificatePem(certificate.publicKey, privateKeyPem);
    }

    // Step 3: Get CA chain
    const caCerts = await getCACertificatePems();

    // Step 4: Create P12/PFX from PEM (required by signer)
    const p12Buffer = createP12FromPem(privateKeyPem, certPem, caCerts);

    // Step 5: Add signature placeholder to PDF
    const pdfWithPlaceholder = await addSignaturePlaceholder(
      pdfBuffer,
      signerName,
      reason
    );

    // Step 6: Sign with @signpdf using our PAdES-compliant custom signer
    const { default: SignPdf } = await import("@signpdf/signpdf");

    const signer = new PAdESCAdESSigner(p12Buffer, { passphrase: "temp" });
    const signedPdf = await SignPdf.sign(pdfWithPlaceholder, signer);

    console.log(`[PAdES] PDF signed successfully by ${signerName}`);
    return Buffer.from(signedPdf);
  } catch (error) {
    console.error("[PAdES] Signing failed:", error);
    throw error;
  }
}

/**
 * Custom PAdES CAdES-compliant signer that extends @signpdf's Signer.
 *
 * Differences from the default P12Signer:
 * 1. No signingTime in authenticated attributes (PAdES baseline forbids it)
 * 2. Includes ESS-signing-certificate-v2 attribute (required by CAdES/PAdES)
 *
 * Since node-forge's _attributeToAsn1 doesn't support custom ASN.1 attribute
 * values, we build the PKCS#7 SignedData ASN.1 structure manually after
 * forge computes the digest, then inject the ESS-signing-certificate-v2
 * attribute before signing.
 */
class PAdESCAdESSigner extends Signer {
  private cert: forge.util.ByteStringBuffer;
  private options: { passphrase: string; asn1StrictParsing: boolean };

  constructor(
    p12Buffer: Buffer,
    additionalOptions: { passphrase?: string; asn1StrictParsing?: boolean } = {}
  ) {
    super();
    this.options = {
      asn1StrictParsing: false,
      passphrase: "",
      ...additionalOptions,
    };
    this.cert = forge.util.createBuffer(p12Buffer.toString("binary"));
  }

  async sign(pdfBuffer: Buffer): Promise<Buffer> {
    if (!(pdfBuffer instanceof Buffer)) {
      throw new Error("PDF expected as Buffer.");
    }

    // Parse P12
    const p12Asn1 = forge.asn1.fromDer(this.cert);
    const p12 = forge.pkcs12.pkcs12FromAsn1(
      p12Asn1,
      this.options.asn1StrictParsing,
      this.options.passphrase
    );

    // Extract certificates and private key
    const certBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag]!;
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag]!;

    const privateKey = keyBags[0].key as forge.pki.rsa.PrivateKey;

    // Find signer certificate (matches private key)
    let signerCert: forge.pki.Certificate | undefined;
    const allCerts: forge.pki.Certificate[] = [];

    for (const bag of certBags) {
      if (bag.cert) {
        allCerts.push(bag.cert);
        const pubKey = bag.cert.publicKey as forge.pki.rsa.PublicKey;
        if (
          privateKey.n.compareTo(pubKey.n) === 0 &&
          privateKey.e.compareTo(pubKey.e) === 0
        ) {
          signerCert = bag.cert;
        }
      }
    }

    if (!signerCert) {
      throw new Error(
        "Failed to find a certificate that matches the private key."
      );
    }

    // Build PKCS#7 SignedData manually for PAdES CAdES compliance
    return this.createPAdESSignedData(
      pdfBuffer,
      privateKey,
      signerCert,
      allCerts
    );
  }

  /**
   * Create PKCS#7 SignedData with PAdES CAdES-compliant signed attributes:
   * - contentType (required)
   * - messageDigest (required, auto-computed)
   * - ESS-signing-certificate-v2 (required by CAdES/PAdES)
   * - NO signingTime (forbidden in PAdES baseline)
   */
  private createPAdESSignedData(
    content: Buffer,
    privateKey: forge.pki.rsa.PrivateKey,
    signerCert: forge.pki.Certificate,
    allCerts: forge.pki.Certificate[]
  ): Buffer {
    const asn1 = forge.asn1;
    const sha256Oid = forge.pki.oids.sha256;

    // 1. Compute message digest of the content (PDF bytes)
    const contentDigest = forge.md.sha256
      .create()
      .update(content.toString("binary"))
      .digest()
      .getBytes();

    // 2. Build ESS-signing-certificate-v2 attribute value
    const essCertV2Value = this.buildESSSigningCertificateV2(signerCert);

    // 3. Build authenticated attributes SET for signing
    // Order: contentType, messageDigest, ESS-signing-certificate-v2
    const authenticatedAttrs = [
      // contentType
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(forge.pki.oids.contentType).getBytes()
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            false,
            asn1.oidToDer(forge.pki.oids.data).getBytes()
          ),
        ]),
      ]),
      // messageDigest
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(forge.pki.oids.messageDigest).getBytes()
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OCTETSTRING,
            false,
            contentDigest
          ),
        ]),
      ]),
      // ESS-signing-certificate-v2 (OID 1.2.840.113549.1.9.16.2.47)
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer("1.2.840.113549.1.9.16.2.47").getBytes()
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
          essCertV2Value,
        ]),
      ]),
    ];

    // 4. Create SET OF attributes for signing (DER-encoded with SET tag)
    const attrsSet = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SET,
      true,
      authenticatedAttrs
    );
    const attrsBytes = asn1.toDer(attrsSet).getBytes();

    // 5. Sign the attributes (hash then sign with RSASSA-PKCS1-v1_5)
    const attrMd = forge.md.sha256.create();
    attrMd.update(attrsBytes);
    const signature = privateKey.sign(attrMd);

    // 6. Build the [0] IMPLICIT authenticated attributes for the SignerInfo
    const authAttrsImplicit = asn1.create(
      asn1.Class.CONTEXT_SPECIFIC,
      0,
      true,
      authenticatedAttrs
    );

    // 7. Build SignerInfo
    const issuerAttrs = signerCert.issuer.attributes;
    const issuerAsn1 = forge.pki.distinguishedNameToAsn1({
      attributes: issuerAttrs,
    } as any);
    const serialHex = signerCert.serialNumber;
    const serialBytes = forge.util.hexToBytes(serialHex);

    const signerInfo = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        // version
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.INTEGER,
          false,
          asn1.integerToDer(1).getBytes()
        ),
        // issuerAndSerialNumber
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          issuerAsn1,
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.INTEGER,
            false,
            serialBytes
          ),
        ]),
        // digestAlgorithm
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            false,
            asn1.oidToDer(sha256Oid).getBytes()
          ),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""),
        ]),
        // authenticatedAttributes [0] IMPLICIT
        authAttrsImplicit,
        // digestEncryptionAlgorithm (rsaEncryption)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            false,
            asn1.oidToDer(forge.pki.oids.rsaEncryption).getBytes()
          ),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""),
        ]),
        // encryptedDigest (signature)
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OCTETSTRING,
          false,
          signature
        ),
      ]
    );

    // 8. Build certificate SET
    const certSequences = allCerts.map((cert) =>
      forge.pki.certificateToAsn1(cert)
    );

    // 9. Build complete SignedData
    const signedData = asn1.create(
      asn1.Class.UNIVERSAL,
      asn1.Type.SEQUENCE,
      true,
      [
        // contentType OID (signedData)
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          false,
          asn1.oidToDer(forge.pki.oids.signedData).getBytes()
        ),
        // [0] EXPLICIT content
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, true, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
            // version
            asn1.create(
              asn1.Class.UNIVERSAL,
              asn1.Type.INTEGER,
              false,
              asn1.integerToDer(1).getBytes()
            ),
            // digestAlgorithms SET
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.OID,
                  false,
                  asn1.oidToDer(sha256Oid).getBytes()
                ),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, ""),
              ]),
            ]),
            // contentInfo (data, no content for detached)
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
              asn1.create(
                asn1.Class.UNIVERSAL,
                asn1.Type.OID,
                false,
                asn1.oidToDer(forge.pki.oids.data).getBytes()
              ),
            ]),
            // certificates [0] IMPLICIT
            asn1.create(
              asn1.Class.CONTEXT_SPECIFIC,
              0,
              true,
              certSequences
            ),
            // signerInfos SET
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, [
              signerInfo,
            ]),
          ]),
        ]),
      ]
    );

    return Buffer.from(asn1.toDer(signedData).getBytes(), "binary");
  }

  /**
   * Build ESS-signing-certificate-v2 ASN.1 value.
   *
   * SigningCertificateV2 ::= SEQUENCE {
   *   certs SEQUENCE OF ESSCertIDv2
   * }
   *
   * ESSCertIDv2 ::= SEQUENCE {
   *   hashAlgorithm AlgorithmIdentifier DEFAULT {sha256},
   *   certHash OCTET STRING
   * }
   *
   * When hashAlgorithm is sha256 (the default), it SHOULD be omitted per RFC 5035.
   */
  private buildESSSigningCertificateV2(
    signerCert: forge.pki.Certificate
  ): forge.asn1.Asn1 {
    const asn1 = forge.asn1;

    // Compute SHA-256 hash of the DER-encoded signer certificate
    const certDer = asn1
      .toDer(forge.pki.certificateToAsn1(signerCert))
      .getBytes();
    const certHash = forge.md.sha256.create().update(certDer).digest().getBytes();

    // Build SigningCertificateV2
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // certs: SEQUENCE OF ESSCertIDv2
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        // ESSCertIDv2 (single entry for signer cert)
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
          // hashAlgorithm DEFAULT sha256 - omitted since sha256 is default
          // certHash: OCTET STRING
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OCTETSTRING,
            false,
            certHash
          ),
        ]),
      ]),
    ]);
  }
}

/**
 * Add a signature placeholder to the PDF using pdf-lib.
 * This creates the /AcroForm, /Sig dict, and ByteRange placeholder
 * that @signpdf will fill in with the actual PKCS#7 signature.
 */
async function addSignaturePlaceholder(
  pdfBuffer: Buffer,
  signerName: string,
  reason: string
): Promise<Buffer> {
  const {
    pdflibAddPlaceholder,
  } = await import("@signpdf/placeholder-pdf-lib");

  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  // Add signature placeholder with ETSI CAdES subfilter for PAdES compliance
  pdflibAddPlaceholder({
    pdfDoc,
    reason,
    name: signerName,
    location: "Tirane, AL",
    contactInfo: "https://www.doc.al",
    signatureLength: 16384, // 16KB for PKCS#7 + timestamp
    subFilter: "ETSI.CAdES.detached",
    widgetRect: [0, 0, 0, 0], // Invisible widget (visual stamp is separate)
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(pdfBytes);
}

/**
 * Create a PKCS#12 (PFX) buffer from PEM certificate and key.
 * Required by the PAdES signer.
 */
function createP12FromPem(
  privateKeyPem: string,
  certificatePem: string,
  caCertPems: string[]
): Buffer {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(certificatePem);

  const caCerts = caCertPems
    .map((pem) => {
      try {
        return forge.pki.certificateFromPem(pem);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as forge.pki.Certificate[];

  // Create PKCS#12 with certificate chain
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    privateKey,
    [certificate, ...caCerts],
    "temp", // passphrase
    {
      algorithm: "3des",
      friendlyName: certificate.subject.getField("CN")?.value || "doc.al",
    }
  );

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, "binary");
}

/**
 * Reconstruct certificate PEM from public key (for older certs without stored PEM).
 */
async function reconstructCertificatePem(
  publicKeyPem: string,
  privateKeyPem: string
): Promise<string> {
  try {
    const { getIssuingCA } = await import("./ca");
    const issuingCA = await getIssuingCA();

    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const caKey = forge.pki.privateKeyFromPem(issuingCA.pem.privateKey);
    const caCert = forge.pki.certificateFromPem(issuingCA.pem.certificate);

    // Create a temporary certificate signed by the Issuing CA
    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notAfter.getFullYear() + 2
    );

    cert.setSubject(caCert.subject.attributes);
    cert.setIssuer(caCert.subject.attributes);

    cert.setExtensions([
      { name: "basicConstraints", cA: false, critical: true },
      {
        name: "keyUsage",
        digitalSignature: true,
        nonRepudiation: true,
        critical: true,
      },
    ]);

    cert.sign(caKey, forge.md.sha256.create());
    return forge.pki.certificateToPem(cert);
  } catch {
    // Fallback: self-sign
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    const cert = forge.pki.createCertificate();
    cert.publicKey = publicKey;
    cert.serialNumber = forge.util.bytesToHex(forge.random.getBytesSync(16));
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(
      cert.validity.notAfter.getFullYear() + 2
    );

    cert.setSubject([{ name: "commonName", value: "doc.al User" }]);
    cert.setIssuer([{ name: "commonName", value: "doc.al User" }]);
    cert.sign(privateKey, forge.md.sha256.create());
    return forge.pki.certificateToPem(cert);
  }
}

/**
 * Get CA certificate PEMs for the chain.
 */
async function getCACertificatePems(): Promise<string[]> {
  try {
    const { getRootCA, getIssuingCA } = await import("./ca");
    const [rootCA, issuingCA] = await Promise.all([
      getRootCA(),
      getIssuingCA(),
    ]);
    return [issuingCA.pem.certificate, rootCA.pem.certificate];
  } catch {
    return [];
  }
}

/**
 * Store certificate PEM for future use.
 */
export async function storeCertificatePem(
  certificateId: string,
  pem: string
): Promise<void> {
  try {
    await prisma.certificate.update({
      where: { id: certificateId },
      data: { certificatePem: pem },
    });
  } catch {
    // Non-critical
  }
}
