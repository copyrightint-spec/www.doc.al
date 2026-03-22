import forge from "node-forge";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { CertificateType } from "@/generated/prisma/enums";
import { getIssuingCA, signCertificateWithCA } from "./ca";

function getEncryptionKey(): string {
  const key = process.env.CERTIFICATE_ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CERTIFICATE_ENCRYPTION_KEY environment variable is required");
    }
    return "dev-only-key-not-for-production-32";
  }
  return key;
}

let _encryptionKey: string | null = null;
function encryptionKey(): string {
  if (!_encryptionKey) _encryptionKey = getEncryptionKey();
  return _encryptionKey;
}

/**
 * Encrypt private key with AES-256
 */
function encryptPrivateKey(privateKeyPem: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey(), "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(privateKeyPem, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt private key
 */
export function decryptPrivateKey(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(encryptionKey(), "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generate an X.509 certificate for a user, signed by the doc.al Issuing CA
 */
export async function generateUserCertificate(
  userId: string,
  options: {
    commonName: string;
    organization?: string;
    country?: string;
    validityYears?: number;
    type?: CertificateType;
  }
): Promise<{
  certificateId: string;
  serialNumber: string;
  publicKeyPem: string;
  certificatePem: string;
}> {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  const serialNumber = crypto.randomBytes(16).toString("hex");
  cert.serialNumber = serialNumber;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(
    cert.validity.notAfter.getFullYear() + (options.validityYears || 2)
  );

  const attrs: forge.pki.CertificateField[] = [
    { name: "commonName", value: options.commonName },
    { name: "countryName", value: options.country || "AL" },
    { type: "2.5.4.5", value: userId },
  ];

  if (options.organization) {
    attrs.push({ name: "organizationName", value: options.organization } as forge.pki.CertificateField);
  }

  cert.setSubject(attrs);

  // Set end-entity extensions (CA-related extensions added by signCertificateWithCA)
  cert.setExtensions([
    { name: "basicConstraints", cA: false, critical: true },
    {
      name: "keyUsage",
      digitalSignature: true,
      nonRepudiation: true,
      critical: true,
    },
    {
      name: "extKeyUsage",
      emailProtection: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
  ]);

  // Sign with the Issuing CA (proper CA chain)
  const issuingCA = getIssuingCA();
  signCertificateWithCA(cert, issuingCA);

  const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certificatePem = forge.pki.certificateToPem(cert);

  const subjectDN = cert.subject.attributes
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(", ");

  const issuerDN = cert.issuer.attributes
    .map((a) => `${a.shortName || a.name}=${a.value}`)
    .join(", ");

  const dbCert = await prisma.certificate.create({
    data: {
      serialNumber,
      subjectDN,
      issuerDN,
      publicKey: publicKeyPem,
      certificatePem,
      encryptedPrivateKey: encryptPrivateKey(privateKeyPem),
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      type: options.type || "PERSONAL",
      userId,
    },
  });

  return {
    certificateId: dbCert.id,
    serialNumber,
    publicKeyPem,
    certificatePem,
  };
}

/**
 * Sign data with a certificate's private key
 */
export async function signWithCertificate(
  certificateId: string,
  data: Buffer
): Promise<{
  signature: string;
  certificateInfo: {
    serialNumber: string;
    subjectDN: string;
    issuerDN: string;
    validFrom: Date;
    validTo: Date;
  };
}> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
  });

  if (!cert) throw new Error("Certifikata nuk u gjet");
  if (cert.revoked) throw new Error("Certifikata eshte revokuar");
  if (cert.validTo < new Date()) throw new Error("Certifikata ka skaduar");

  const privateKeyPem = decryptPrivateKey(cert.encryptedPrivateKey);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const md = forge.md.sha256.create();
  md.update(data.toString("binary"));
  const signature = privateKey.sign(md);

  return {
    signature: forge.util.encode64(signature),
    certificateInfo: {
      serialNumber: cert.serialNumber,
      subjectDN: cert.subjectDN,
      issuerDN: cert.issuerDN,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
    },
  };
}

/**
 * Verify a signature
 */
export function verifySignature(
  publicKeyPem: string,
  data: Buffer,
  signatureBase64: string
): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const md = forge.md.sha256.create();
    md.update(data.toString("binary"));
    const signature = forge.util.decode64(signatureBase64);
    return publicKey.verify(md.digest().bytes(), signature);
  } catch {
    return false;
  }
}

/**
 * Export certificate as PKCS#12 (.p12/.pfx) with password protection
 */
export async function exportCertificateP12(
  certificateId: string,
  password: string
): Promise<Buffer> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
  });

  if (!cert) throw new Error("Certifikata nuk u gjet");

  const privateKeyPem = decryptPrivateKey(cert.encryptedPrivateKey);
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  // Reconstruct cert from public key and subject info
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forge.pki.publicKeyFromPem(cert.publicKey);
  certificate.serialNumber = cert.serialNumber;
  certificate.validity.notBefore = cert.validFrom;
  certificate.validity.notAfter = cert.validTo;

  const subjectAttrs = cert.subjectDN.split(", ").map((attr) => {
    const [name, value] = attr.split("=");
    return { shortName: name, value };
  });
  certificate.setSubject(subjectAttrs);

  const issuerAttrs = cert.issuerDN.split(", ").map((attr) => {
    const [name, value] = attr.split("=");
    return { shortName: name, value };
  });
  certificate.setIssuer(issuerAttrs);

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [certificate], password, {
    algorithm: "3des",
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  return Buffer.from(p12Der, "binary");
}
