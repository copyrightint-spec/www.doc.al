import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOnStamles } from "@/lib/stamles";
import { buildProofMetadata, publishToIPFS } from "@/lib/ipfs";

/**
 * GET /api/cron/check-stamles
 *
 * Cron job that checks all PENDING timestamp entries against STAMLES
 * to see if they have been confirmed on Polygon blockchain.
 * When confirmed, publishes complete proof to IPFS with all blockchain data.
 *
 * Should be called every 5-10 minutes.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Jo i autorizuar" },
        { status: 401 }
      );
    }

    // Find all entries that are not yet confirmed on Polygon
    const pendingEntries = await prisma.timestampEntry.findMany({
      where: {
        OR: [
          { stamlesStatus: "QUEUED" },
          { stamlesStatus: "BATCHED" },
          { stamlesStatus: null },
        ],
      },
      select: {
        id: true,
        fingerprint: true,
        sequentialFingerprint: true,
        sequenceNumber: true,
        serverTimestamp: true,
        stamlesStatus: true,
        ipfsCid: true,
        previousEntryId: true,
        signature: {
          select: {
            signerName: true,
            signerEmail: true,
            signer: {
              select: { kycStatus: true, kycVerifiedAt: true },
            },
          },
        },
        document: {
          select: { id: true, fileHash: true, metadata: true },
        },
      },
      take: 500,
      orderBy: { createdAt: "asc" },
    });

    let checked = 0;
    let confirmed = 0;
    let batched = 0;
    let ipfsPublished = 0;
    const errors: string[] = [];

    for (const entry of pendingEntries) {
      checked++;

      try {
        const result = await verifyOnStamles(entry.fingerprint);

        // If STAMLES doesn't know this hash, re-submit it
        if (!result) {
          try {
            const { submitToStamles } = await import("@/lib/stamles");
            await submitToStamles(
              entry.fingerprint,
              entry.document?.id || entry.id,
              "retry"
            );
            console.log(`[check-stamles] Re-submitted missing hash ${entry.fingerprint.slice(0, 16)}...`);
          } catch (submitErr) {
            errors.push(`Re-submit failed for ${entry.fingerprint.slice(0, 16)}: ${submitErr instanceof Error ? submitErr.message : "unknown"}`);
          }
          continue;
        }

        if ((result.verified || result.status === "CONFIRMED") && result.polygonTxHash) {
          // Get previous entry for chain linking
          const prevEntry = entry.previousEntryId
            ? await prisma.timestampEntry.findUnique({
                where: { id: entry.previousEntryId },
                select: { sequenceNumber: true, fingerprint: true },
              })
            : null;

          // Update DB with Polygon data
          const updateData: Record<string, unknown> = {
            stamlesStatus: "CONFIRMED",
            otsStatus: "CONFIRMED",
            polygonTxHash: result.polygonTxHash,
            polygonBlockNumber: result.polygonBlock || null,
            stamlesBatchId: result.batchNumber?.toString() || null,
          };

          // Publish complete proof to IPFS (only if not already published)
          if (!entry.ipfsCid && entry.signature) {
            try {
              const kycData = entry.signature.signer;
              const proofMetadata = buildProofMetadata({
                documentHash: entry.document?.fileHash || entry.fingerprint,
                signedAt: entry.serverTimestamp.toISOString(),
                sequenceNumber: entry.sequenceNumber,
                signerName: entry.signature.signerName,
                signerEmail: entry.signature.signerEmail,
                fingerprint: entry.fingerprint,
                sequentialFingerprint: entry.sequentialFingerprint,
                previousSequenceNumber: prevEntry?.sequenceNumber ?? null,
                previousFingerprint: prevEntry?.fingerprint ?? null,
                kycVerified: kycData?.kycStatus === "VERIFIED",
                kycVerifiedAt: kycData?.kycVerifiedAt?.toISOString() ?? null,
              });

              // Override blockchain status with confirmed data
              proofMetadata.blockchain = {
                network: "Polygon PoS (Amoy Testnet)",
                system: "STAMLES Merkle Batching",
                status: "CONFIRMED",
              };
              // Add polygon proof data + hash timeline
              const docMeta = (entry.document?.metadata as Record<string, unknown>) || {};
              const existingTimeline = (docMeta.hashTimeline as Record<string, unknown>) || {};

              const fullProof = {
                ...proofMetadata,
                polygonProof: {
                  txHash: result.polygonTxHash,
                  blockNumber: result.polygonBlock,
                  merkleRoot: result.merkleRoot,
                  batchNumber: result.batchNumber,
                  confirmedAt: new Date().toISOString(),
                },
                hashTimeline: Object.keys(existingTimeline).length > 0
                  ? existingTimeline
                  : undefined,
              };

              const ipfsCid = await publishToIPFS(fullProof as typeof proofMetadata);
              if (ipfsCid) {
                updateData.ipfsCid = ipfsCid;
                ipfsPublished++;
              }
            } catch (ipfsErr) {
              console.error(`[CRON:check-stamles] IPFS publish failed for ${entry.fingerprint.slice(0, 16)}:`, ipfsErr);
            }
          }

          await prisma.timestampEntry.update({
            where: { id: entry.id },
            data: updateData,
          });

          // Update document hashTimeline with polygon + IPFS entries
          if (entry.document?.id) {
            try {
              const currentDoc = await prisma.document.findUnique({
                where: { id: entry.document.id },
                select: { metadata: true },
              });
              const currentMeta = (currentDoc?.metadata as Record<string, unknown>) || {};
              const currentHt = (currentMeta.hashTimeline as Record<string, unknown>) || {};
              const nowISO = new Date().toISOString();

              const updatedHt: Record<string, unknown> = {
                ...currentHt,
                polygon: {
                  txHash: result.polygonTxHash,
                  blockNumber: result.polygonBlock,
                  merkleRoot: result.merkleRoot,
                  batchNumber: result.batchNumber,
                  timestamp: nowISO,
                  label: "Polygon Blockchain",
                },
              };

              if (updateData.ipfsCid) {
                updatedHt.ipfs = {
                  cid: updateData.ipfsCid,
                  timestamp: nowISO,
                  label: "IPFS Proof",
                  gatewayUrl: `https://ipfs.io/ipfs/${updateData.ipfsCid}`,
                };
              }

              const updatedMeta = JSON.parse(JSON.stringify({
                ...currentMeta,
                hashTimeline: updatedHt,
              }));

              await prisma.document.update({
                where: { id: entry.document.id },
                data: {
                  metadata: updatedMeta,
                },
              });
            } catch (metaErr) {
              console.error(`[CRON:check-stamles] hashTimeline update failed:`, metaErr);
            }
          }

          confirmed++;
        } else if (result.status === "BATCHED") {
          if (entry.stamlesStatus !== "BATCHED") {
            await prisma.timestampEntry.update({
              where: { id: entry.id },
              data: {
                stamlesStatus: "BATCHED",
                stamlesBatchId: result.batchNumber?.toString() || null,
              },
            });
          }
          batched++;
        }
      } catch (err) {
        errors.push(`${entry.fingerprint.slice(0, 16)}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        checked,
        confirmed,
        batched,
        ipfsPublished,
        pending: checked - confirmed - batched,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[CRON:check-stamles] Error:", err);
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
