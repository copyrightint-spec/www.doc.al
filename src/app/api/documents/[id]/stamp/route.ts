import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDocAlStamp } from "@/lib/docal-stamp";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Jo i autorizuar" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Merr dokumentin me nenshkrime dhe timestamps
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        signatures: { orderBy: { order: "asc" } },
        timestampEntries: {
          orderBy: { serverTimestamp: "desc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Dokumenti nuk u gjet" },
        { status: 404 }
      );
    }

    // Kontrollo autorizimin: pronari ose nje nenshkrues
    const isOwner = document.ownerId === session.user.id;
    const isSigner = document.signatures.some(
      (s) => s.signerId === session.user.id || s.signerEmail === session.user.email
    );

    if (!isOwner && !isSigner) {
      return NextResponse.json(
        { error: "Nuk keni te drejte te shikoni kete dokument" },
        { status: 403 }
      );
    }

    // Vetem dokumentat COMPLETED mund te vuloset
    if (document.status !== "COMPLETED") {
      return NextResponse.json(
        {
          error: "Dokumenti nuk eshte i perfunduar. Vetem dokumentat e perfunduara mund te vuloset.",
        },
        { status: 400 }
      );
    }

    // Gjenero ose merr vulen ekzistuese
    const stamp = await generateDocAlStamp(id);

    // Kontrollo statusin blockchain nga timestamps
    const latestTimestamp = document.timestampEntries[0];
    const btcStatus = latestTimestamp
      ? {
          status: latestTimestamp.otsStatus,
          btcBlockHeight: latestTimestamp.btcBlockHeight,
          btcTxId: latestTimestamp.btcTxId,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        certificationHash: stamp.certificationHash,
        verificationUrl: stamp.verificationUrl,
        qrCodeDataUri: stamp.qrCodeDataUri,
        stampedAt: stamp.stampedAt,
        document: {
          title: document.title,
          fileName: document.fileName,
          fileHash: document.fileHash,
        },
        signers: document.signatures.map((s) => ({
          name: s.signerName,
          email: s.signerEmail,
          signedAt: s.signedAt ? s.signedAt.toISOString() : null,
          order: s.order,
        })),
        blockchain: btcStatus,
      },
    });
  } catch (error) {
    console.error("Stamp generation error:", error);
    const message =
      error instanceof Error ? error.message : "Ndodhi nje gabim";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
