import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface HashTimelineStep {
  step: number;
  action: string;
  hash?: string;
  cid?: string;
  timestamp: string;
  label: string;
  status: "completed" | "in-progress" | "pending";
  certificate?: string;
  sequenceNumber?: number;
  fingerprint?: string;
  sequentialFingerprint?: string;
  txHash?: string;
  block?: number;
  explorerUrl?: string;
  gatewayUrl?: string;
}

/**
 * GET /api/documents/[id]/hash-timeline
 *
 * Returns the complete hash timeline for a document,
 * showing every intermediate hash from upload through blockchain confirmation.
 *
 * Auth: session required, user must own the document or be admin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        timestampEntries: {
          orderBy: { serverTimestamp: "asc" },
        },
        signatures: {
          orderBy: { order: "asc" },
          include: {
            certificate: {
              select: { serialNumber: true },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokumenti nuk u gjet" },
        { status: 404 }
      );
    }

    // Authorization: owner or admin
    const isOwner = document.ownerId === session.user.id;
    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Nuk keni te drejte te shikoni kete dokument" },
        { status: 403 }
      );
    }

    const meta = (document.metadata as Record<string, unknown>) || {};
    const ht = (meta.hashTimeline as Record<string, unknown>) || {};

    const timeline: HashTimelineStep[] = [];
    let step = 1;

    // Step 1: Original file upload
    const originalFile = ht.originalFile as
      | { hash: string; timestamp: string; label: string }
      | undefined;
    if (originalFile) {
      timeline.push({
        step: step++,
        action: "UPLOAD",
        hash: originalFile.hash,
        timestamp: originalFile.timestamp,
        label: originalFile.label,
        status: "completed",
      });
    }

    // Step 2: Visual signature
    const visuallySigned = ht.visuallySigned as
      | { hash: string; timestamp: string; label: string }
      | undefined;
    if (visuallySigned) {
      timeline.push({
        step: step++,
        action: "VISUAL_SIGN",
        hash: visuallySigned.hash,
        timestamp: visuallySigned.timestamp,
        label: visuallySigned.label,
        status: "completed",
      });
    }

    // Step 3: PAdES crypto signature
    const cryptoSigned = ht.cryptoSigned as
      | {
          hash: string;
          timestamp: string;
          label: string;
          certificateSerial?: string;
        }
      | undefined;
    if (cryptoSigned) {
      timeline.push({
        step: step++,
        action: "PADES_SIGN",
        hash: cryptoSigned.hash,
        timestamp: cryptoSigned.timestamp,
        label: cryptoSigned.label,
        status: "completed",
        certificate: cryptoSigned.certificateSerial || undefined,
      });
    }

    // Step 4: doc.al chain registration
    const chainRegistered = ht.chainRegistered as
      | {
          sequenceNumber: number;
          fingerprint: string;
          sequentialFingerprint: string;
          timestamp: string;
          label: string;
        }
      | undefined;
    if (chainRegistered) {
      timeline.push({
        step: step++,
        action: "CHAIN",
        hash: chainRegistered.fingerprint,
        timestamp: chainRegistered.timestamp,
        label: `${chainRegistered.label} #${chainRegistered.sequenceNumber}`,
        status: "completed",
        sequenceNumber: chainRegistered.sequenceNumber,
        fingerprint: chainRegistered.fingerprint,
        sequentialFingerprint: chainRegistered.sequentialFingerprint,
      });
    }

    // Step 5: Polygon blockchain (from TimestampEntry)
    const latestTs = document.timestampEntries[0];
    if (latestTs?.polygonTxHash) {
      const polygonData = ht.polygon as
        | { timestamp: string }
        | undefined;
      timeline.push({
        step: step++,
        action: "POLYGON",
        hash: latestTs.polygonTxHash,
        timestamp:
          polygonData?.timestamp || latestTs.serverTimestamp.toISOString(),
        label: "Polygon Blockchain",
        status: "completed",
        txHash: latestTs.polygonTxHash,
        block: latestTs.polygonBlockNumber || undefined,
        explorerUrl: `https://polygonscan.com/tx/${latestTs.polygonTxHash}`,
      });
    } else if (latestTs) {
      // Polygon pending
      timeline.push({
        step: step++,
        action: "POLYGON",
        hash: undefined,
        timestamp: latestTs.serverTimestamp.toISOString(),
        label: "Polygon Blockchain",
        status:
          latestTs.stamlesStatus === "BATCHED" ? "in-progress" : "pending",
      });
    }

    // Step 6: IPFS proof
    if (latestTs?.ipfsCid) {
      const ipfsData = ht.ipfs as
        | { timestamp: string }
        | undefined;
      timeline.push({
        step: step++,
        action: "IPFS",
        cid: latestTs.ipfsCid,
        timestamp:
          ipfsData?.timestamp || latestTs.serverTimestamp.toISOString(),
        label: "IPFS Proof",
        status: "completed",
        gatewayUrl: `https://ipfs.io/ipfs/${latestTs.ipfsCid}`,
      });
    } else if (latestTs) {
      // IPFS pending (published after Polygon confirmation)
      timeline.push({
        step: step++,
        action: "IPFS",
        timestamp: latestTs.serverTimestamp.toISOString(),
        label: "IPFS Proof",
        status: "pending",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        documentHash: document.fileHash,
        timeline,
      },
    });
  } catch (error) {
    console.error("Hash timeline error:", error);
    return NextResponse.json(
      { error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
