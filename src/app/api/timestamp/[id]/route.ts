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
      include: {
        document: { select: { id: true, title: true, fileName: true } },
        signature: {
          select: { id: true, signerName: true, signerEmail: true, signedAt: true },
        },
        previousEntry: {
          select: {
            id: true,
            sequenceNumber: true,
            sequentialFingerprint: true,
          },
        },
        nextEntry: {
          select: {
            id: true,
            sequenceNumber: true,
          },
        },
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
        sequentialFingerprint: entry.sequentialFingerprint,
        type: entry.type,
        serverTimestamp: entry.serverTimestamp.toISOString(),
        btcTxId: entry.btcTxId,
        btcBlockHeight: entry.btcBlockHeight,
        btcBlockHash: entry.btcBlockHash,
        otsStatus: entry.otsStatus,
        document: entry.document,
        signature: entry.signature,
        previousEntry: entry.previousEntry,
        nextEntry: entry.nextEntry,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
