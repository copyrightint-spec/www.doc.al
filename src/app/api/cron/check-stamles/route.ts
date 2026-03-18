import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOnStamles } from "@/lib/stamles";

/**
 * GET /api/cron/check-stamles
 *
 * Cron job that checks all PENDING timestamp entries against STAMLES
 * to see if they have been confirmed on Polygon blockchain.
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
        stamlesStatus: true,
      },
      take: 100, // Process in batches of 100
      orderBy: { createdAt: "asc" },
    });

    let checked = 0;
    let confirmed = 0;
    let batched = 0;
    const errors: string[] = [];

    for (const entry of pendingEntries) {
      checked++;

      try {
        const result = await verifyOnStamles(entry.fingerprint);

        if (!result) continue;

        if (result.verified && result.polygonTxHash) {
          // Confirmed on Polygon blockchain
          await prisma.timestampEntry.update({
            where: { id: entry.id },
            data: {
              stamlesStatus: "CONFIRMED",
              otsStatus: "CONFIRMED",
              polygonTxHash: result.polygonTxHash,
              polygonBlockNumber: result.polygonBlock || null,
              stamlesBatchId: result.batchNumber?.toString() || null,
            },
          });
          confirmed++;
        } else if (result.status === "BATCHED") {
          // In a batch but not yet on-chain
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
        // If still QUEUED, no update needed
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
