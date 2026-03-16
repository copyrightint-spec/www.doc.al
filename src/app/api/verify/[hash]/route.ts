import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Mask signer name for public display: "Daniel Kordhoni" → "D**** K****"
 */
function maskSignerName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 1) return part;
      return part[0] + "****";
    })
    .join(" ");
}

/**
 * API publike per verifikimin e dokumenteve DOC.AL.
 * Nuk kerkon autentifikim - eshte publike per kedo qe skanon QR kodin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    if (!hash || hash.length < 10) {
      return NextResponse.json(
        { error: "Hash i pavlere", valid: false },
        { status: 400 }
      );
    }

    // Strategy 1: Search by certificationHash in metadata (legacy stamp flow)
    const allCompleted = await prisma.document.findMany({
      where: { status: "COMPLETED" },
      include: {
        signatures: { orderBy: { order: "asc" } },
        timestampEntries: {
          orderBy: { serverTimestamp: "desc" },
        },
      },
    });

    let document = allCompleted.find((d) => {
      const meta = d.metadata as Record<string, unknown> | null;
      const stamp = meta?.docAlStamp as Record<string, unknown> | undefined;
      return stamp?.certificationHash === hash;
    });

    // Strategy 2: Search by fileHash (self-sign flow)
    if (!document) {
      document = allCompleted.find((d) => d.fileHash === hash);
    }

    // Strategy 3: Search by timestamp fingerprint
    if (!document) {
      const tsEntry = await prisma.timestampEntry.findFirst({
        where: { fingerprint: hash },
        include: {
          document: {
            include: {
              signatures: { orderBy: { order: "asc" } },
              timestampEntries: { orderBy: { serverTimestamp: "desc" } },
            },
          },
        },
      });
      if (tsEntry?.document) {
        document = tsEntry.document;
      }
    }

    if (!document) {
      return NextResponse.json(
        {
          valid: false,
          error: "Dokumenti nuk u gjet. Ky hash nuk eshte i regjistruar.",
        },
        { status: 404 }
      );
    }

    const meta = (document.metadata as Record<string, unknown>) || {};
    const stamp = (meta.docAlStamp as Record<string, unknown>) || {};

    // Masko titullin per privatesi (trego vetem fillimin dhe fundin)
    const title = document.title;
    const maskedTitle =
      title.length > 8
        ? title.substring(0, 4) + "****" + title.substring(title.length - 4)
        : title.substring(0, 2) + "****";

    // Statusi blockchain
    const latestTimestamp = document.timestampEntries[0];
    const blockchainStatus = latestTimestamp
      ? {
          anchored: latestTimestamp.otsStatus === "CONFIRMED",
          status: latestTimestamp.otsStatus,
          btcBlockHeight: latestTimestamp.btcBlockHeight,
          btcTxId: latestTimestamp.btcTxId,
        }
      : { anchored: false, status: "NO_TIMESTAMP", btcBlockHeight: null, btcTxId: null };

    // Verifiko integritetin e zinxhirit te nenshkrimeve
    const allSigned = document.signatures.every((s) => s.status === "SIGNED");
    const chainIntegrity = allSigned && document.status === "COMPLETED";

    return NextResponse.json({
      valid: true,
      data: {
        documentTitle: maskedTitle,
        certificationHash: stamp.certificationHash || document.fileHash,
        stampedAt: stamp.stampedAt || document.createdAt.toISOString(),
        signerCount: document.signatures.length,
        signers: document.signatures.map((s) => ({
          name: maskSignerName(s.signerName),
          signedAt: s.signedAt ? s.signedAt.toISOString() : null,
          order: s.order,
        })),
        blockchain: blockchainStatus,
        chainIntegrity,
        fileHash: document.fileHash,
        ipfsCid: document.timestampEntries[0]?.ipfsCid || null,
        ipfsUrl: document.timestampEntries[0]?.ipfsCid
          ? `https://ipfs.io/ipfs/${document.timestampEntries[0].ipfsCid}`
          : null,
        documentCreatedAt: document.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Ndodhi nje gabim gjate verifikimit" },
      { status: 500 }
    );
  }
}
