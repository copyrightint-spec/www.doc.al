/**
 * PAdES (PDF Advanced Electronic Signature) Implementation
 *
 * Creates a proper PAdES-compliant digital signature embedded in PDF structure:
 * - /AcroForm with signature field
 * - /Sig dictionary with /Filter /Adobe.PPKLite, /SubFilter /adbe.pkcs7.detached
 * - /ByteRange covering the entire PDF (excluding /Contents value)
 * - /Contents with hex-encoded PKCS#7 DER signature
 *
 * Standards:
 * - PAdES (ETSI EN 319 142)
 * - PKCS#7/CMS (RFC 5652)
 * - PDF Digital Signatures (ISO 32000-2)
 */

import forge from "node-forge";
import { prisma } from "@/lib/db";
import { decryptPrivateKey } from "./certificates";
import { createTimeStampToken } from "./tsa";

// Size of PKCS#7 placeholder in hex chars (16384 bytes = 32768 hex chars)
// Increased to accommodate the embedded RFC 3161 timestamp token
const SIGNATURE_MAX_LENGTH = 16384;

/**
 * Embed a PAdES-compliant digital signature into a PDF document.
 *
 * The resulting PDF contains a real /Sig dictionary with ByteRange and PKCS#7
 * that is verifiable in Adobe Reader, Foxit, and other PDF viewers.
 */
export async function embedPAdESSignature(
  pdfBuffer: Buffer,
  certificateId: string,
  signerName: string,
  reason: string = "Nenshkrim dixhital permes doc.al",
  location: string = "doc.al Platform"
): Promise<Buffer> {
  // Get certificate and private key from DB
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
  });

  if (!cert || cert.revoked) {
    throw new Error("Certificate not found or revoked");
  }

  const privateKeyPem = decryptPrivateKey(cert.encryptedPrivateKey);

  // Get certificate PEM
  let certificatePem: string;
  if (cert.certificatePem) {
    certificatePem = cert.certificatePem;
  } else {
    // Fallback: reconstruct certificate
    const publicKey = forge.pki.publicKeyFromPem(cert.publicKey);
    const tempCert = forge.pki.createCertificate();
    tempCert.publicKey = publicKey;
    tempCert.serialNumber = cert.serialNumber;
    tempCert.validity.notBefore = cert.validFrom;
    tempCert.validity.notAfter = cert.validTo;

    const parseDN = (dn: string) => {
      return dn
        .split(", ")
        .map((part) => {
          const [key, ...rest] = part.split("=");
          return { shortName: key.trim(), value: rest.join("=").trim() };
        })
        .filter(
          (a) => a.shortName && a.value
        ) as forge.pki.CertificateField[];
    };

    tempCert.setSubject(parseDN(cert.subjectDN));
    tempCert.setIssuer(parseDN(cert.issuerDN));

    try {
      const { getIssuingCA } = await import("./ca");
      const issuingCA = getIssuingCA();
      tempCert.sign(issuingCA.privateKey, forge.md.sha256.create());
    } catch {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      tempCert.sign(privateKey, forge.md.sha256.create());
    }

    certificatePem = forge.pki.certificateToPem(tempCert);
  }

  // Get CA chain
  let caCerts: string[] = [];
  try {
    const { getCertificateChain } = await import("./ca");
    caCerts = getCertificateChain();
  } catch {
    // CA not available
  }

  return signPdfWithPAdES(
    pdfBuffer,
    {
      publicKey: cert.publicKey,
      encryptedPrivateKey: cert.encryptedPrivateKey,
      certificatePem,
      privateKeyPem,
      caCerts,
    },
    signerName,
    reason,
    location
  );
}

/**
 * Core PAdES signing function.
 *
 * Algorithm:
 * 1. Parse PDF to find xref and trailer
 * 2. Create signature dictionary object and signature field object
 * 3. Add /AcroForm to the catalog via an incremental update
 * 4. Write incremental update with placeholder /Contents
 * 5. Compute ByteRange hash (SHA-256)
 * 6. Create PKCS#7 SignedData
 * 7. Insert PKCS#7 into /Contents placeholder
 */
async function signPdfWithPAdES(
  pdfBuffer: Buffer,
  certificate: {
    publicKey: string;
    encryptedPrivateKey: string;
    certificatePem?: string;
    privateKeyPem?: string;
    caCerts?: string[];
  },
  signerName: string,
  reason: string = "Nenshkrim Elektronik",
  location: string = "doc.al Platform"
): Promise<Buffer> {
  const pdf = pdfBuffer;

  // --- Step 1: Parse the existing PDF to find key structures ---
  const pdfStr = pdf.toString("binary");

  // Find the last startxref
  const startxrefIdx = pdfStr.lastIndexOf("startxref");
  if (startxrefIdx === -1) {
    throw new Error("Invalid PDF: missing startxref");
  }

  // Extract xref offset
  const afterStartxref = pdfStr.substring(
    startxrefIdx + "startxref".length,
    startxrefIdx + "startxref".length + 30
  );
  const xrefOffset = parseInt(afterStartxref.trim(), 10);

  // Find the trailer dictionary to get /Root and /Size
  const rootRef = extractRef(pdfStr, "/Root");
  const infoRef = extractRef(pdfStr, "/Info");
  const existingSize = extractSize(pdfStr);

  if (!rootRef) {
    throw new Error("Invalid PDF: missing /Root reference");
  }

  // --- Step 2: Build new objects for incremental update ---
  // We need at least 3 new objects:
  //   newObj+0: Signature dictionary (/Sig)
  //   newObj+1: Signature field (widget annotation)
  //   Plus we update the catalog (Root) to add /AcroForm

  const newObjStart = existingSize; // Next available object number
  const sigDictObjNum = newObjStart;
  const sigFieldObjNum = newObjStart + 1;
  const newCatalogObjNum = newObjStart + 2;
  const newSize = newObjStart + 3;

  // Format date for PDF
  const now = new Date();
  const dateStr = formatPdfDate(now);

  // Contents placeholder: hex-encoded zeros
  const contentsPlaceholderHex = "0".repeat(SIGNATURE_MAX_LENGTH * 2);

  // We need to build the incremental update section.
  // The ByteRange placeholder will be filled with actual values after we know offsets.
  // Use a fixed-width placeholder so replacing it doesn't change offsets.
  const byteRangePlaceholder = "/ByteRange [0000000000 0000000000 0000000000 0000000000]";

  // Get first page reference for the annotation
  const pageRef = extractFirstPageRef(pdfStr);

  // Build signature dictionary object
  const sigDictObj = [
    `${sigDictObjNum} 0 obj\n`,
    `<<\n`,
    `/Type /Sig\n`,
    `/Filter /Adobe.PPKLite\n`,
    `/SubFilter /adbe.pkcs7.detached\n`,
    `${byteRangePlaceholder}\n`,
    `/Contents <${contentsPlaceholderHex}>\n`,
    `/Name (${escapePdfString(signerName)})\n`,
    `/Reason (${escapePdfString(reason)})\n`,
    `/Location (${escapePdfString(location)})\n`,
    `/M (${dateStr})\n`,
    `/ContactInfo (https://www.doc.al)\n`,
    `>>\n`,
    `endobj\n`,
  ].join("");

  // Build signature field / widget annotation object
  const sigFieldObj = [
    `${sigFieldObjNum} 0 obj\n`,
    `<<\n`,
    `/Type /Annot\n`,
    `/Subtype /Widget\n`,
    `/FT /Sig\n`,
    `/T (Signature1)\n`,
    `/V ${sigDictObjNum} 0 R\n`,
    `/F 132\n`,
    `/Rect [0 0 0 0]\n`,
    pageRef ? `/P ${pageRef}\n` : "",
    `>>\n`,
    `endobj\n`,
  ].join("");

  // Build new catalog (copy of root with /AcroForm added)
  const catalogRootNum = parseInt(rootRef.split(" ")[0], 10);
  const existingCatalogDict = extractObjectDict(pdfStr, catalogRootNum);

  // Remove existing /AcroForm if present, we'll add our own
  let catalogEntries = existingCatalogDict
    .replace(/\/AcroForm\s+\d+\s+\d+\s+R/g, "");
  // Remove inline /AcroForm <<...>> (handle nested <<>>)
  catalogEntries = removeInlineDict(catalogEntries, "/AcroForm");

  // Build the new catalog object
  const newCatalogObj = [
    `${newCatalogObjNum} 0 obj\n`,
    `<<\n`,
    catalogEntries,
    `/AcroForm <<\n`,
    `  /SigFlags 3\n`,
    `  /Fields [${sigFieldObjNum} 0 R]\n`,
    `>>\n`,
    `>>\n`,
    `endobj\n`,
  ].join("");

  // --- Step 3: Build the incremental update ---
  // Ensure PDF ends properly before our update
  let baseEnd = pdf.length;
  // Find the last %%EOF
  const lastEof = pdfStr.lastIndexOf("%%EOF");
  if (lastEof !== -1) {
    baseEnd = lastEof + "%%EOF".length;
    // Include trailing newline if present
    if (baseEnd < pdf.length && (pdf[baseEnd] === 0x0a || pdf[baseEnd] === 0x0d)) {
      baseEnd++;
      if (baseEnd < pdf.length && pdf[baseEnd] === 0x0a) {
        baseEnd++;
      }
    }
  }

  const basePdf = pdf.subarray(0, baseEnd);

  // Build the incremental section
  const newObjects = sigDictObj + sigFieldObj + newCatalogObj;

  // Build xref table for the new objects
  const sigDictOffset = basePdf.length;
  const sigFieldOffset = sigDictOffset + Buffer.byteLength(sigDictObj, "binary");
  const newCatalogOffset = sigFieldOffset + Buffer.byteLength(sigFieldObj, "binary");

  // The xref keyword offset in the final file
  // We add a \n before "xref" to separate from the last object
  const xrefKeywordOffset = basePdf.length + Buffer.byteLength(newObjects, "binary") + 1; // +1 for \n

  const incrementalUpdate = [
    newObjects,
    `\nxref\n`,
    `0 1\n`,
    `0000000000 65535 f \n`,
    `${sigDictObjNum} 3\n`,
    `${padOffset(sigDictOffset)} 00000 n \n`,
    `${padOffset(sigFieldOffset)} 00000 n \n`,
    `${padOffset(newCatalogOffset)} 00000 n \n`,
    `trailer\n`,
    `<<\n`,
    `/Size ${newSize}\n`,
    `/Root ${newCatalogObjNum} 0 R\n`,
    infoRef ? `/Info ${infoRef}\n` : "",
    `/Prev ${xrefOffset}\n`,
    `>>\n`,
    `startxref\n`,
    `${xrefKeywordOffset}\n`,
    `%%EOF\n`,
  ].join("");
  const fullPdf = Buffer.concat([
    basePdf,
    Buffer.from(incrementalUpdate, "binary"),
  ]);

  // --- Step 4: Find the /Contents placeholder and compute ByteRange ---
  const fullPdfStr = fullPdf.toString("binary");

  // Find the /Contents < position in our signature dictionary
  const contentsTag = `/Contents <${contentsPlaceholderHex}>`;
  const contentsIdx = fullPdfStr.lastIndexOf(contentsTag);
  if (contentsIdx === -1) {
    throw new Error("Failed to locate /Contents placeholder");
  }

  // The actual hex content starts after "/Contents <" and ends before ">"
  const sigStart = contentsIdx + "/Contents <".length;
  const sigEnd = sigStart + contentsPlaceholderHex.length;

  // ByteRange: [0, sigStart, sigEnd, totalLength - sigEnd]
  const byteRange = [0, sigStart, sigEnd, fullPdf.length - sigEnd];

  // --- Step 5: Insert ByteRange values ---
  const byteRangeStr = `/ByteRange [${padByteRange(byteRange[0])} ${padByteRange(byteRange[1])} ${padByteRange(byteRange[2])} ${padByteRange(byteRange[3])}]`;

  // Replace the placeholder
  const byteRangeIdx = fullPdfStr.indexOf(byteRangePlaceholder);
  if (byteRangeIdx === -1) {
    throw new Error("Failed to locate ByteRange placeholder");
  }

  // Create the PDF with ByteRange filled in
  const pdfWithByteRange = Buffer.from(fullPdf);
  pdfWithByteRange.write(byteRangeStr, byteRangeIdx, byteRangeStr.length, "binary");

  // --- Step 6: Hash the ByteRange portions ---
  const hashBuf1 = pdfWithByteRange.subarray(byteRange[0], byteRange[0] + byteRange[1]);
  const hashBuf2 = pdfWithByteRange.subarray(byteRange[2], byteRange[2] + byteRange[3]);

  const hashData = Buffer.concat([hashBuf1, hashBuf2]);

  // --- Step 7: Create PKCS#7 signature ---
  const privateKeyPem =
    certificate.privateKeyPem || decryptPrivateKey(certificate.encryptedPrivateKey);

  const pkcs7Der = createPKCS7Signature(
    hashData,
    privateKeyPem,
    certificate.certificatePem || "",
    certificate.caCerts || []
  );

  // --- Step 8: Hex-encode and insert into /Contents ---
  let sigHex = pkcs7Der.toString("hex").toUpperCase();

  // Pad with zeros to fill the placeholder exactly
  if (sigHex.length > SIGNATURE_MAX_LENGTH * 2) {
    throw new Error(
      `PKCS#7 signature too large: ${sigHex.length} hex chars, max ${SIGNATURE_MAX_LENGTH * 2}`
    );
  }
  sigHex = sigHex.padEnd(SIGNATURE_MAX_LENGTH * 2, "0");

  // Write the signature hex into the placeholder
  const signedPdf = Buffer.from(pdfWithByteRange);
  signedPdf.write(sigHex, sigStart, sigHex.length, "binary");

  return signedPdf;
}

// ---------------------------------------------------------------------------
// Helper: Create PKCS#7 SignedData (detached)
// ---------------------------------------------------------------------------

function createPKCS7Signature(
  dataToSign: Buffer,
  privateKeyPem: string,
  certificatePem: string,
  caCertificatePems: string[] = []
): Buffer {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.certificateFromPem(certificatePem);

  // Create PKCS#7 signed data
  const p7 = forge.pkcs7.createSignedData();

  // Set content (the data that was hashed - for detached, this is used to compute digest)
  p7.content = forge.util.createBuffer(dataToSign.toString("binary"));

  // Add signer certificate
  p7.addCertificate(certificate);

  // Add CA certificates to the chain
  for (const caPem of caCertificatePems) {
    try {
      p7.addCertificate(forge.pki.certificateFromPem(caPem));
    } catch {
      // Skip invalid CA certs
    }
  }

  // Add signer with authenticated attributes
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.signingTime,
        // @ts-expect-error forge types expect string but Date works at runtime
        value: new Date(),
      },
      {
        type: forge.pki.oids.messageDigest,
        // Auto-calculated by forge
      },
    ],
  });

  // Sign (detached - content not included in output)
  p7.sign({ detached: true });

  // Convert to ASN.1
  const asn1 = p7.toAsn1();

  // Embed RFC 3161 timestamp token as an unsigned attribute
  // OID 1.2.840.113549.1.9.16.2.14 = id-smime-aa-signatureTimeStampToken
  try {
    embedTimestampToken(asn1);
  } catch (err) {
    // If timestamp embedding fails, continue without it
    console.warn("[PAdES] Failed to embed timestamp token:", err);
  }

  const der = forge.asn1.toDer(asn1);
  return Buffer.from(der.getBytes(), "binary");
}

/**
 * Embed an RFC 3161 timestamp token into the PKCS#7 SignedData as an
 * unsigned attribute (id-smime-aa-signatureTimeStampToken).
 *
 * The timestamp is computed over the signature value from the SignerInfo,
 * proving when the signature was created.
 */
function embedTimestampToken(pkcs7Asn1: forge.asn1.Asn1): void {
  // Navigate: ContentInfo -> [0] SignedData -> signerInfos (last element) -> first SignerInfo
  const contentInfoValue = pkcs7Asn1.value as forge.asn1.Asn1[];

  // content [0] EXPLICIT SignedData
  const signedDataWrapper = contentInfoValue[1] as forge.asn1.Asn1;
  const signedData = (signedDataWrapper.value as forge.asn1.Asn1[])[0] as forge.asn1.Asn1;
  const signedDataValue = signedData.value as forge.asn1.Asn1[];

  // signerInfos is the last SET in SignedData
  const signerInfosSet = signedDataValue[signedDataValue.length - 1] as forge.asn1.Asn1;
  const signerInfo = (signerInfosSet.value as forge.asn1.Asn1[])[0] as forge.asn1.Asn1;
  const signerInfoValue = signerInfo.value as forge.asn1.Asn1[];

  // The signature is the last OCTET STRING in SignerInfo
  let signatureValue: string | null = null;
  for (let i = signerInfoValue.length - 1; i >= 0; i--) {
    const elem = signerInfoValue[i] as forge.asn1.Asn1;
    if (
      elem.tagClass === forge.asn1.Class.UNIVERSAL &&
      elem.type === forge.asn1.Type.OCTETSTRING
    ) {
      signatureValue = elem.value as string;
      break;
    }
  }

  if (!signatureValue) {
    throw new Error("Could not find signature value in SignerInfo");
  }

  // Hash the signature value with SHA-256
  const md = forge.md.sha256.create();
  md.update(signatureValue);
  const signatureHash = md.digest().toHex();

  // Create the timestamp token over the signature hash
  const tsToken = createTimeStampToken(signatureHash);

  // Parse the timestamp token back to ASN.1
  const tsTokenAsn1 = forge.asn1.fromDer(
    forge.util.createBuffer(tsToken.toString("binary"))
  );

  // Build the unsigned attribute:
  // unsignedAttrs [1] IMPLICIT SET OF Attribute
  // Attribute ::= SEQUENCE { type OID, values SET OF ANY }
  const OID_SIGNATURE_TIMESTAMP = "1.2.840.113549.1.9.16.2.14";

  const unsignedAttrs = forge.asn1.create(
    forge.asn1.Class.CONTEXT_SPECIFIC,
    1,
    true,
    [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.SEQUENCE,
        true,
        [
          // attribute type OID
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.OID,
            false,
            forge.asn1.oidToDer(OID_SIGNATURE_TIMESTAMP).getBytes()
          ),
          // attribute values SET
          forge.asn1.create(
            forge.asn1.Class.UNIVERSAL,
            forge.asn1.Type.SET,
            true,
            [tsTokenAsn1]
          ),
        ]
      ),
    ]
  );

  // Append unsigned attributes to the SignerInfo
  signerInfoValue.push(unsignedAttrs);
}

// ---------------------------------------------------------------------------
// PDF parsing helpers
// ---------------------------------------------------------------------------

/**
 * Extract an indirect reference like "3 0 R" for a given key from the PDF trailer/catalog.
 */
function extractRef(pdfStr: string, key: string): string | null {
  // Search backwards through trailers (last one wins for incremental updates)
  const trailerPattern = new RegExp(
    `${key.replace("/", "\\/")}\\s+(\\d+)\\s+(\\d+)\\s+R`,
    "g"
  );
  let match: RegExpExecArray | null;
  let lastMatch: RegExpExecArray | null = null;
  while ((match = trailerPattern.exec(pdfStr)) !== null) {
    lastMatch = match;
  }
  if (lastMatch) {
    return `${lastMatch[1]} ${lastMatch[2]} R`;
  }
  return null;
}

/**
 * Extract /Size from the last trailer.
 */
function extractSize(pdfStr: string): number {
  const sizePattern = /\/Size\s+(\d+)/g;
  let match: RegExpExecArray | null;
  let lastMatch: RegExpExecArray | null = null;
  while ((match = sizePattern.exec(pdfStr)) !== null) {
    lastMatch = match;
  }
  if (lastMatch) {
    return parseInt(lastMatch[1], 10);
  }
  return 10; // fallback
}

/**
 * Extract the first page object reference from the PDF.
 */
function extractFirstPageRef(pdfStr: string): string | null {
  // Look for /Pages dictionary with /Kids array
  const kidsMatch = pdfStr.match(/\/Kids\s*\[\s*(\d+)\s+(\d+)\s+R/);
  if (kidsMatch) {
    return `${kidsMatch[1]} ${kidsMatch[2]} R`;
  }
  return null;
}

/**
 * Extract the dictionary contents of a given object number.
 * Returns the content between the outermost << and >> (handling nesting).
 */
function extractObjectDict(pdfStr: string, objNum: number): string {
  // Find all occurrences (last one wins for incremental updates)
  const objHeader = new RegExp(`${objNum}\\s+0\\s+obj\\s*`, "g");
  let headerMatch: RegExpExecArray | null;
  let lastHeaderEnd = -1;
  while ((headerMatch = objHeader.exec(pdfStr)) !== null) {
    lastHeaderEnd = headerMatch.index + headerMatch[0].length;
  }

  if (lastHeaderEnd === -1 || pdfStr.substring(lastHeaderEnd, lastHeaderEnd + 2) !== "<<") {
    return `/Type /Catalog\n`;
  }

  // Walk forward from <<, counting nesting depth
  let depth = 0;
  let i = lastHeaderEnd;
  let start = -1;
  while (i < pdfStr.length - 1) {
    if (pdfStr[i] === "<" && pdfStr[i + 1] === "<") {
      if (depth === 0) start = i + 2;
      depth++;
      i += 2;
    } else if (pdfStr[i] === ">" && pdfStr[i + 1] === ">") {
      depth--;
      if (depth === 0) {
        return pdfStr.substring(start, i).trim();
      }
      i += 2;
    } else {
      i++;
    }
  }

  return `/Type /Catalog\n`;
}

/**
 * Remove an inline dictionary entry like /Key <<...>> from a string,
 * correctly handling nested <<>> pairs.
 */
function removeInlineDict(str: string, key: string): string {
  const idx = str.indexOf(key);
  if (idx === -1) return str;

  // Find the << after the key
  const afterKey = str.indexOf("<<", idx + key.length);
  if (afterKey === -1) return str;

  // Walk forward counting nesting
  let depth = 0;
  let i = afterKey;
  while (i < str.length - 1) {
    if (str[i] === "<" && str[i + 1] === "<") {
      depth++;
      i += 2;
    } else if (str[i] === ">" && str[i + 1] === ">") {
      depth--;
      if (depth === 0) {
        // Remove from key start to end of >>
        return str.substring(0, idx) + str.substring(i + 2);
      }
      i += 2;
    } else {
      i++;
    }
  }
  return str;
}

/**
 * Format a Date as a PDF date string: D:YYYYMMDDHHmmss+00'00'
 */
function formatPdfDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `D:${y}${m}${d}${h}${min}${s}+00'00'`;
}

/**
 * Escape special characters for PDF string literals.
 */
function escapePdfString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Pad an offset to 10 digits for xref table.
 */
function padOffset(offset: number): string {
  return String(offset).padStart(10, "0");
}

/**
 * Pad a ByteRange value to 10 digits (fixed width so replacement doesn't shift offsets).
 */
function padByteRange(value: number): string {
  return String(value).padStart(10, "0");
}
