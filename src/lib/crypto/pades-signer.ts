/**
 * PAdES (PDF Advanced Electronic Signature) Implementation
 *
 * Uses @signpdf library for proper PAdES-compliant digital signatures.
 * Creates /AcroForm, /Sig dictionary, ByteRange, PKCS#7 - all standards-compliant.
 *
 * Standards:
 * - PAdES (ETSI EN 319 142)
 * - PKCS#7/CMS (RFC 5652)
 * - PDF Digital Signatures (ISO 32000-2)
 */

import forge from "node-forge";
import { PDFDocument, PDFName, PDFArray, PDFHexString, PDFString } from "pdf-lib";
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
  reason: string = "Nenshkrim dixhital permes doc.al"
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

    // Step 4: Create P12/PFX from PEM (required by @signpdf)
    const p12Buffer = createP12FromPem(privateKeyPem, certPem, caCerts);

    // Step 5: Add signature placeholder to PDF
    const pdfWithPlaceholder = await addSignaturePlaceholder(
      pdfBuffer,
      signerName,
      reason
    );

    // Step 6: Sign with @signpdf
    const { default: SignPdf } = await import("@signpdf/signpdf");
    const { P12Signer } = await import("@signpdf/signer-p12");

    const signer = new P12Signer(p12Buffer, { passphrase: "temp" });
    const signedPdf = await SignPdf.sign(pdfWithPlaceholder, signer);

    console.log(`[PAdES] PDF signed successfully by ${signerName}`);
    return Buffer.from(signedPdf);
  } catch (error) {
    console.error("[PAdES] Signing failed:", error);
    throw error;
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

  // Add signature placeholder
  pdflibAddPlaceholder({
    pdfDoc,
    reason,
    name: signerName,
    location: "Tirane, AL",
    contactInfo: "https://www.doc.al",
    signatureLength: 16384, // 16KB for PKCS#7 + timestamp
    subFilter: "adbe.pkcs7.detached",
    widgetRect: [0, 0, 0, 0], // Invisible widget (visual stamp is separate)
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(pdfBytes);
}

/**
 * Create a PKCS#12 (PFX) buffer from PEM certificate and key.
 * Required by @signpdf/signer-p12.
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
