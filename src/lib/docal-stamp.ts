import crypto from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

export interface DocAlStampResult {
  certificationHash: string;
  verificationUrl: string;
  qrCodeDataUri: string;
  stampedAt: string;
  signers: { name: string; email: string; signedAt: string | null }[];
}

/**
 * Gjeneron vulen perfundimtare DOC.AL per nje dokument te perfunduar.
 * Kerkon qe te gjitha nenshkrimet te kene statusin "SIGNED".
 */
export async function generateDocAlStamp(
  documentId: string
): Promise<DocAlStampResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      signatures: { orderBy: { order: "asc" } },
      timestampEntries: { orderBy: { serverTimestamp: "desc" }, take: 1 },
    },
  });

  if (!document) {
    throw new Error("Dokumenti nuk u gjet");
  }

  if (document.signatures.length === 0) {
    throw new Error("Dokumenti nuk ka nenshkrime");
  }

  // Verifiko qe te gjitha nenshkrimet jane te perfunduara
  const allSigned = document.signatures.every((s) => s.status === "SIGNED");
  if (!allSigned) {
    throw new Error(
      "Jo te gjitha nenshkrimet jane te perfunduara"
    );
  }

  // Kontrollo nese vula ekziston tashme ne metadata
  const existingMeta = document.metadata as Record<string, unknown> | null;
  if (existingMeta?.docAlStamp) {
    const stamp = existingMeta.docAlStamp as Record<string, unknown>;
    return {
      certificationHash: stamp.certificationHash as string,
      verificationUrl: stamp.verificationUrl as string,
      qrCodeDataUri: stamp.qrCodeDataUri as string,
      stampedAt: stamp.stampedAt as string,
      signers: document.signatures.map((s) => ({
        name: s.signerName,
        email: s.signerEmail,
        signedAt: s.signedAt ? s.signedAt.toISOString() : null,
      })),
    };
  }

  // Krijo hash-in e certifikimit
  const serverTimestamp = new Date().toISOString();

  const signatureHashes = document.signatures
    .map((s) => s.id + (s.signedAt?.toISOString() || ""))
    .sort();

  const certPayload = [
    document.fileHash,
    ...signatureHashes,
    serverTimestamp,
    "DOC.AL-CERTIFIED",
  ].join("|");

  const certificationHash = crypto
    .createHash("sha256")
    .update(certPayload)
    .digest("hex");

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://www.doc.al";
  const verificationUrl = `${baseUrl}/verify/${certificationHash}`;

  // Gjenero QR code
  const qrCodeDataUri = await QRCode.toDataURL(verificationUrl, {
    width: 300,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });

  const stampData = {
    certificationHash,
    verificationUrl,
    qrCodeDataUri,
    stampedAt: serverTimestamp,
  };

  // Ruaj ne metadata te dokumentit
  const updatedMetadata = {
    ...(existingMeta || {}),
    docAlStamp: stampData,
  };

  await prisma.document.update({
    where: { id: documentId },
    data: { metadata: updatedMetadata },
  });

  // Regjistro ne audit log
  await prisma.auditLog.create({
    data: {
      action: "DOCAL_STAMP_GENERATED",
      entityType: "Document",
      entityId: documentId,
      metadata: {
        certificationHash,
        signerCount: document.signatures.length,
      },
    },
  });

  return {
    certificationHash,
    verificationUrl,
    qrCodeDataUri,
    stampedAt: serverTimestamp,
    signers: document.signatures.map((s) => ({
      name: s.signerName,
      email: s.signerEmail,
      signedAt: s.signedAt ? s.signedAt.toISOString() : null,
    })),
  };
}
