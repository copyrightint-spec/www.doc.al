import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    // Kerko dokumentin qe permban kete hash certifikimi ne metadata
    const documents = await prisma.document.findMany({
      where: { status: "COMPLETED" },
      include: {
        signatures: { orderBy: { order: "asc" } },
        timestampEntries: {
          orderBy: { serverTimestamp: "desc" },
        },
      },
    });

    const document = documents.find((d) => {
      const meta = d.metadata as Record<string, unknown> | null;
      const stamp = meta?.docAlStamp as Record<string, unknown> | undefined;
      return stamp?.certificationHash === hash;
    });

    if (!document) {
      return NextResponse.json(
        {
          valid: false,
          error: "Dokumenti nuk u gjet. Ky hash certifikimi nuk eshte i regjistruar.",
        },
        { status: 404 }
      );
    }

    const meta = document.metadata as Record<string, unknown>;
    const stamp = meta.docAlStamp as Record<string, unknown>;

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
        certificationHash: stamp.certificationHash,
        stampedAt: stamp.stampedAt,
        signerCount: document.signatures.length,
        signers: document.signatures.map((s) => ({
          name: s.signerName,
          signedAt: s.signedAt ? s.signedAt.toISOString() : null,
          order: s.order,
        })),
        blockchain: blockchainStatus,
        chainIntegrity,
        fileHash: document.fileHash,
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
