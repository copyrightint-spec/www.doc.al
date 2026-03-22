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

    // Strategy 1: Search by fileHash (most common - self-sign flow)
    let document = await prisma.document.findFirst({
      where: { fileHash: hash, status: "COMPLETED" },
      include: {
        signatures: { orderBy: { order: "asc" } },
        timestampEntries: { orderBy: { serverTimestamp: "desc" } },
      },
    });

    // Strategy 2: Search by certificationHash in metadata (legacy stamp flow)
    if (!document) {
      document = await prisma.document.findFirst({
        where: {
          status: "COMPLETED",
          metadata: { path: ["docAlStamp", "certificationHash"], equals: hash },
        },
        include: {
          signatures: { orderBy: { order: "asc" } },
          timestampEntries: { orderBy: { serverTimestamp: "desc" } },
        },
      });
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

    // Strategy 4: Search by originalFileHash in metadata (QR code hash)
    if (!document) {
      const docByOrigHash = await prisma.document.findFirst({
        where: {
          status: "COMPLETED",
          metadata: { path: ["originalFileHash"], equals: hash },
        },
        include: {
          signatures: { orderBy: { order: "asc" } },
          timestampEntries: { orderBy: { serverTimestamp: "desc" } },
        },
      });
      if (docByOrigHash) {
        document = docByOrigHash;
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
    const ht = (meta.hashTimeline as Record<string, unknown>) || {};

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

    // Build public hash timeline (no sensitive data)
    const hashTimeline: Array<{
      step: number;
      action: string;
      hash?: string;
      cid?: string;
      timestamp: string;
      label: string;
      status: "completed" | "in-progress" | "pending";
    }> = [];
    let htStep = 1;

    const originalFile = ht.originalFile as { hash: string; timestamp: string; label: string } | undefined;
    if (originalFile) {
      hashTimeline.push({
        step: htStep++,
        action: "UPLOAD",
        hash: originalFile.hash,
        timestamp: originalFile.timestamp,
        label: originalFile.label,
        status: "completed",
      });
    }

    const visuallySigned = ht.visuallySigned as { hash: string; timestamp: string; label: string } | undefined;
    if (visuallySigned) {
      hashTimeline.push({
        step: htStep++,
        action: "VISUAL_SIGN",
        hash: visuallySigned.hash,
        timestamp: visuallySigned.timestamp,
        label: visuallySigned.label,
        status: "completed",
      });
    }

    const cryptoSigned = ht.cryptoSigned as { hash: string; timestamp: string; label: string } | undefined;
    if (cryptoSigned) {
      hashTimeline.push({
        step: htStep++,
        action: "PADES_SIGN",
        hash: cryptoSigned.hash,
        timestamp: cryptoSigned.timestamp,
        label: cryptoSigned.label,
        status: "completed",
      });
    }

    const chainRegistered = ht.chainRegistered as { sequenceNumber: number; fingerprint: string; timestamp: string; label: string } | undefined;
    if (chainRegistered) {
      hashTimeline.push({
        step: htStep++,
        action: "CHAIN",
        hash: chainRegistered.fingerprint,
        timestamp: chainRegistered.timestamp,
        label: `${chainRegistered.label} #${chainRegistered.sequenceNumber}`,
        status: "completed",
      });
    }

    if (latestTimestamp?.polygonTxHash) {
      hashTimeline.push({
        step: htStep++,
        action: "POLYGON",
        hash: latestTimestamp.polygonTxHash,
        timestamp: latestTimestamp.serverTimestamp.toISOString(),
        label: "Polygon Blockchain",
        status: "completed",
      });
    } else if (latestTimestamp) {
      hashTimeline.push({
        step: htStep++,
        action: "POLYGON",
        timestamp: latestTimestamp.serverTimestamp.toISOString(),
        label: "Polygon Blockchain",
        status: latestTimestamp.stamlesStatus === "BATCHED" ? "in-progress" : "pending",
      });
    }

    if (latestTimestamp?.ipfsCid) {
      hashTimeline.push({
        step: htStep++,
        action: "IPFS",
        cid: latestTimestamp.ipfsCid,
        timestamp: latestTimestamp.serverTimestamp.toISOString(),
        label: "IPFS Proof",
        status: "completed",
      });
    } else if (latestTimestamp) {
      hashTimeline.push({
        step: htStep++,
        action: "IPFS",
        timestamp: latestTimestamp.serverTimestamp.toISOString(),
        label: "IPFS Proof",
        status: "pending",
      });
    }

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
        hashTimeline: hashTimeline.length > 0 ? hashTimeline : undefined,
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
