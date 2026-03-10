import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entry = await prisma.timestampEntry.findUnique({
      where: { id },
      select: {
        id: true,
        sequenceNumber: true,
        fingerprint: true,
        otsStatus: true,
        btcTxId: true,
        btcBlockHeight: true,
        btcBlockHash: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: "Timestamp nuk u gjet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        sequenceNumber: entry.sequenceNumber,
        fingerprint: entry.fingerprint,
        otsStatus: entry.otsStatus,
        btcTxId: entry.btcTxId,
        btcBlockHeight: entry.btcBlockHeight,
        btcBlockHash: entry.btcBlockHash,
        confirmed: entry.otsStatus === "CONFIRMED",
        message:
          entry.otsStatus === "CONFIRMED"
            ? `Konfirmuar ne BTC Block #${entry.btcBlockHeight}`
            : "Ne pritje te konfirmimit ne Bitcoin blockchain...",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
