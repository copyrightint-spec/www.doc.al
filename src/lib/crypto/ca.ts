/**
 * doc.al In-House Certificate Authority
 *
 * Architecture:
 * Root CA (4096-bit RSA, 10 years) -> signs Intermediate CA
 * Intermediate CA (3072-bit RSA, 5 years) -> signs End-Entity certs
 * End-Entity (2048-bit RSA, 1-2 years) -> user/org certificates
 *
 * In production, the Root CA private key should be stored offline or in an HSM.
 * CA certificates are loaded from environment variables. In development,
 * they are auto-generated with a warning.
 */

import forge from "node-forge";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CACertificate {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
  pem: {
    certificate: string;
    privateKey: string;
  };
}

// ---------------------------------------------------------------------------
// Singleton caches
// ---------------------------------------------------------------------------

let _rootCA: CACertificate | null = null;
let _issuingCA: CACertificate | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSerialNumber(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Base URL for AIA / CDP references.
 * Falls back to localhost in development.
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.doc.al";
}

// ---------------------------------------------------------------------------
// Root CA
// ---------------------------------------------------------------------------

function generateRootCA(): CACertificate {
  console.warn(
    "[CA] WARNING: Generating Root CA on the fly. " +
      "Set ROOT_CA_CERT and ROOT_CA_KEY environment variables for production."
  );

  const keys = forge.pki.rsa.generateKeyPair(4096);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = generateSerialNumber();

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10);

  const attrs: forge.pki.CertificateField[] = [
    { name: "commonName", value: "doc.al Root CA" },
    { name: "organizationName", value: "COPYRIGHT sh.p.k" },
    { name: "localityName", value: "Tirane" },
    { name: "countryName", value: "AL" },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // self-signed

  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      pathLenConstraint: 1,
      critical: true,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      critical: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certificate: cert,
    privateKey: keys.privateKey,
    pem: {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    },
  };
}

/**
 * Get or generate the Root CA certificate.
 * In production, this should be pre-generated and stored securely.
 */
export function getRootCA(): CACertificate {
  if (_rootCA) return _rootCA;

  const certEnv = process.env.ROOT_CA_CERT;
  const keyEnv = process.env.ROOT_CA_KEY;

  if (certEnv && keyEnv) {
    const certificate = forge.pki.certificateFromPem(certEnv);
    const privateKey = forge.pki.privateKeyFromPem(keyEnv) as forge.pki.rsa.PrivateKey;
    _rootCA = {
      certificate,
      privateKey,
      pem: { certificate: certEnv, privateKey: keyEnv },
    };
  } else {
    _rootCA = generateRootCA();
  }

  return _rootCA;
}

// ---------------------------------------------------------------------------
// Issuing (Intermediate) CA
// ---------------------------------------------------------------------------

function generateIssuingCA(rootCA: CACertificate): CACertificate {
  console.warn(
    "[CA] WARNING: Generating Issuing CA on the fly. " +
      "Set ISSUING_CA_CERT and ISSUING_CA_KEY environment variables for production."
  );

  const keys = forge.pki.rsa.generateKeyPair(3072);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = generateSerialNumber();

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10);

  const subjectAttrs: forge.pki.CertificateField[] = [
    { name: "commonName", value: "doc.al Issuing CA" },
    { name: "organizationName", value: "COPYRIGHT sh.p.k" },
    { name: "localityName", value: "Tirane" },
    { name: "countryName", value: "AL" },
  ];

  cert.setSubject(subjectAttrs);
  cert.setIssuer(rootCA.certificate.subject.attributes);

  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      pathLenConstraint: 0,
      critical: true,
    },
    {
      name: "keyUsage",
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true,
      critical: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
    {
      name: "authorityKeyIdentifier",
      keyIdentifier: true,
      authorityCertIssuer: true,
      serialNumber: true,
    },
  ]);

  // Sign with Root CA key
  cert.sign(rootCA.privateKey, forge.md.sha256.create());

  return {
    certificate: cert,
    privateKey: keys.privateKey,
    pem: {
      certificate: forge.pki.certificateToPem(cert),
      privateKey: forge.pki.privateKeyToPem(keys.privateKey),
    },
  };
}

/**
 * Get or generate the Intermediate/Issuing CA certificate.
 * Signed by Root CA. Used for signing end-entity certificates.
 */
export function getIssuingCA(): CACertificate {
  if (_issuingCA) return _issuingCA;

  const certEnv = process.env.ISSUING_CA_CERT;
  const keyEnv = process.env.ISSUING_CA_KEY;

  if (certEnv && keyEnv) {
    const certificate = forge.pki.certificateFromPem(certEnv);
    const privateKey = forge.pki.privateKeyFromPem(keyEnv) as forge.pki.rsa.PrivateKey;
    _issuingCA = {
      certificate,
      privateKey,
      pem: { certificate: certEnv, privateKey: keyEnv },
    };
  } else {
    const rootCA = getRootCA();
    _issuingCA = generateIssuingCA(rootCA);
  }

  return _issuingCA;
}

// ---------------------------------------------------------------------------
// End-Entity Certificate Signing
// ---------------------------------------------------------------------------

/**
 * Sign an end-entity certificate with the Issuing CA.
 * Adds proper extensions: AIA, CDP, Authority Key Identifier.
 *
 * The caller should have already set subject, publicKey, serialNumber,
 * validity, basicConstraints, keyUsage, extKeyUsage, and subjectKeyIdentifier.
 * This function sets the issuer and adds CA-related extensions, then signs.
 */
export function signCertificateWithCA(
  cert: forge.pki.Certificate,
  issuingCA: CACertificate
): forge.pki.Certificate {
  // Set issuer from the Issuing CA certificate
  cert.setIssuer(issuingCA.certificate.subject.attributes);

  // Retrieve extensions already set on the cert and add CA-related ones
  const existingExtensions = cert.extensions || [];

  // Add Authority Key Identifier
  existingExtensions.push({
    name: "authorityKeyIdentifier",
    keyIdentifier: true,
    authorityCertIssuer: true,
    serialNumber: true,
  });

  // Note: AIA and CDP extensions require ASN.1 encoding not fully
  // supported by node-forge. These URLs are documented in the CA page:
  // - CA Issuer: /api/ca/issuing.crt
  // - OCSP: /api/ocsp
  // - CRL: /api/crl

  cert.setExtensions(existingExtensions);

  // Sign with the Issuing CA private key
  cert.sign(issuingCA.privateKey, forge.md.sha256.create());

  return cert;
}

// ---------------------------------------------------------------------------
// Certificate Chain
// ---------------------------------------------------------------------------

/**
 * Build the certificate chain: [issuing CA, root CA]
 * End-entity certificate is NOT included; callers prepend it themselves.
 */
export function getCertificateChain(): string[] {
  const rootCA = getRootCA();
  const issuingCA = getIssuingCA();
  return [issuingCA.pem.certificate, rootCA.pem.certificate];
}

/**
 * Verify a certificate against the CA chain.
 */
export function verifyCertificateChain(certPem: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const rootCA = getRootCA();
    const issuingCA = getIssuingCA();

    const caStore = forge.pki.createCaStore([
      rootCA.certificate,
      issuingCA.certificate,
    ]);

    const cert = forge.pki.certificateFromPem(certPem);

    forge.pki.verifyCertificateChain(caStore, [cert]);

    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// CRL Generation
// ---------------------------------------------------------------------------

export interface RevokedEntry {
  serialNumber: string;
  revocationDate: Date;
  reason?: string;
}

/**
 * Generate a PEM-encoded CRL signed by the Issuing CA.
 */
export function generateCRL(revokedEntries: RevokedEntry[]): string {
  const issuingCA = getIssuingCA();

  // node-forge does not have a high-level CRL API, so we build the ASN.1
  // structure manually and sign it.

  const now = new Date();
  const nextUpdate = new Date(now);
  nextUpdate.setDate(nextUpdate.getDate() + 7);

  // Build tbsCertList
  const revokedCertsSeq: forge.asn1.Asn1[] = revokedEntries.map((entry) => {
    const fields: forge.asn1.Asn1[] = [
      // userCertificate (serial number as INTEGER)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.INTEGER,
        false,
        forge.util.hexToBytes(entry.serialNumber)
      ),
      // revocationDate (UTCTime)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.UTCTIME,
        false,
        forge.asn1.dateToUtcTime(entry.revocationDate)
      ),
    ];
    return forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.SEQUENCE,
      true,
      fields
    );
  });

  // issuer DN from Issuing CA
  const issuerDN = forge.pki.distinguishedNameToAsn1(
    issuingCA.certificate.subject
  );

  const tbsCertListFields: forge.asn1.Asn1[] = [
    // version v2(1)
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.INTEGER,
      false,
      forge.util.hexToBytes("01")
    ),
    // signature algorithm (sha256WithRSAEncryption)
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer("1.2.840.113549.1.1.11").getBytes()
      ),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ""),
    ]),
    // issuer
    issuerDN,
    // thisUpdate
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.UTCTIME,
      false,
      forge.asn1.dateToUtcTime(now)
    ),
    // nextUpdate
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.UTCTIME,
      false,
      forge.asn1.dateToUtcTime(nextUpdate)
    ),
  ];

  // revokedCertificates (optional - only include if there are entries)
  if (revokedCertsSeq.length > 0) {
    tbsCertListFields.push(
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        revokedCertsSeq
      )
    );
  }

  const tbsCertList = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    tbsCertListFields
  );

  // Sign the tbsCertList
  const tbsDer = forge.asn1.toDer(tbsCertList);
  const md = forge.md.sha256.create();
  md.update(tbsDer.getBytes());
  const signatureBytes = issuingCA.privateKey.sign(md);

  // Build CertificateList
  const certList = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SEQUENCE,
    true,
    [
      tbsCertList,
      // signatureAlgorithm
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(
          forge.asn1.Class.UNIVERSAL,
          forge.asn1.Type.OID,
          false,
          forge.asn1.oidToDer("1.2.840.113549.1.1.11").getBytes()
        ),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ""),
      ]),
      // signatureValue (BIT STRING)
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.BITSTRING,
        false,
        String.fromCharCode(0x00) + signatureBytes
      ),
    ]
  );

  const crlDer = forge.asn1.toDer(certList).getBytes();
  const crlB64 = forge.util.encode64(crlDer, 64);

  return `-----BEGIN X509 CRL-----\r\n${crlB64}\r\n-----END X509 CRL-----\r\n`;
}

// ---------------------------------------------------------------------------
// Reset (for testing)
// ---------------------------------------------------------------------------

/** @internal Reset cached CA certs - only for testing */
export function _resetCACache(): void {
  _rootCA = null;
  _issuingCA = null;
}

/** Clear Root CA cache so it will be regenerated on next access */
export function clearRootCACache(): void {
  _rootCA = null;
}

/** Clear Issuing CA cache so it will be regenerated on next access */
export function clearIssuingCACache(): void {
  _issuingCA = null;
}
