import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Mask a name: "Daniel Kasa" -> "D. K***"
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0][0] + "***";
  }
  return parts[0][0] + ". " + parts[parts.length - 1][0] + "***";
}

// Mask email: "daniel@doc.al" -> "d***@d***.al"
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  return local[0] + "***@" + domainParts[0][0] + "***." + tld;
}

// Mask filename: "kontrate-shitblerje.pdf" -> "kon***.pdf"
function maskFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return fileName.slice(0, 3) + "***";
  const ext = fileName.slice(lastDot);
  const name = fileName.slice(0, lastDot);
  return name.slice(0, Math.min(3, name.length)) + "***" + ext;
}

// Mask document title: "Kontrate Shitblerje Apartamenti" -> "Kontrate Shi***"
function maskTitle(title: string): string {
  if (title.length <= 8) return title.slice(0, 3) + "***";
  return title.slice(0, Math.min(12, title.length)) + "***";
}

// Get document type label from filename extension
function getDocType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "PDF";
    case "doc": case "docx": return "Word";
    case "xls": case "xlsx": return "Excel";
    case "png": case "jpg": case "jpeg": return "Image";
    default: return "File";
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const seqNum = searchParams.get("seq");

    // Single entry lookup by sequence number
    if (seqNum) {
      const entry = await prisma.timestampEntry.findUnique({
        where: { sequenceNumber: parseInt(seqNum) },
        include: {
          document: {
            select: {
              id: true, title: true, fileName: true, fileHash: true, fileSize: true, status: true,
              signatures: {
                select: {
                  id: true, signerName: true, signerEmail: true, signedAt: true, status: true, order: true,
                  timestampEntries: {
                    select: { sequenceNumber: true, fingerprint: true, serverTimestamp: true, otsStatus: true, btcBlockHeight: true },
                    orderBy: { sequenceNumber: "asc" as const },
                    take: 1,
                  },
                },
                orderBy: { order: "asc" as const },
              },
            },
          },
          signature: {
            select: { id: true, signerName: true, signerEmail: true, signedAt: true, status: true },
          },
          previousEntry: {
            select: { id: true, sequenceNumber: true, sequentialFingerprint: true, fingerprint: true },
          },
          nextEntry: {
            select: { id: true, sequenceNumber: true, sequentialFingerprint: true, fingerprint: true },
          },
        },
      });

      if (!entry) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }

      // Build document signatures timeline (masked)
      const documentSignatures = entry.document?.signatures?.map((sig) => ({
        signerName: maskName(sig.signerName),
        signerEmail: maskEmail(sig.signerEmail),
        signedAt: sig.signedAt,
        status: sig.status,
        order: sig.order,
        timestampEntry: sig.timestampEntries[0] ? {
          sequenceNumber: sig.timestampEntries[0].sequenceNumber,
          fingerprint: sig.timestampEntries[0].fingerprint,
          serverTimestamp: sig.timestampEntries[0].serverTimestamp,
          otsStatus: sig.timestampEntries[0].otsStatus,
          btcBlockHeight: sig.timestampEntries[0].btcBlockHeight,
        } : null,
      })) || null;

      // Mask private data
      const maskedData = {
        id: entry.id,
        sequenceNumber: entry.sequenceNumber,
        fingerprint: entry.fingerprint,
        sequentialFingerprint: entry.sequentialFingerprint,
        type: entry.type,
        serverTimestamp: entry.serverTimestamp,
        btcTxId: entry.btcTxId,
        btcBlockHeight: entry.btcBlockHeight,
        btcBlockHash: entry.btcBlockHash,
        otsStatus: entry.otsStatus,
        ipfsCid: entry.ipfsCid || null,
        polygonTxHash: (entry as Record<string, unknown>).polygonTxHash || null,
        polygonBlockNumber: (entry as Record<string, unknown>).polygonBlockNumber || null,
        stamlesStatus: (entry as Record<string, unknown>).stamlesStatus || null,
        stamlesBatchId: (entry as Record<string, unknown>).stamlesBatchId || null,
        document: entry.document ? {
          title: maskTitle(entry.document.title),
          fileName: maskFileName(entry.document.fileName),
          fileHash: entry.document.fileHash,
          fileSize: entry.document.fileSize,
          fileType: getDocType(entry.document.fileName),
          status: entry.document.status,
        } : null,
        documentSignatures,
        signature: entry.signature ? {
          signerName: maskName(entry.signature.signerName),
          signerEmail: maskEmail(entry.signature.signerEmail),
          signedAt: entry.signature.signedAt,
          status: entry.signature.status,
        } : null,
        previousEntry: entry.previousEntry,
        nextEntry: entry.nextEntry,
      };

      return NextResponse.json({ success: true, data: maskedData });
    }

    // List entries with pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (type && ["SINGLE_FILE", "SUBMITTED_HASH", "SIGNATURE"].includes(type)) {
      where.type = type;
    }

    if (search && /^[a-f0-9]+$/i.test(search)) {
      where.fingerprint = { contains: search.toLowerCase() };
    }

    const [entries, total] = await Promise.all([
      prisma.timestampEntry.findMany({
        where,
        orderBy: { sequenceNumber: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          sequenceNumber: true,
          fingerprint: true,
          sequentialFingerprint: true,
          type: true,
          serverTimestamp: true,
          btcTxId: true,
          btcBlockHeight: true,
          btcBlockHash: true,
          otsStatus: true,
          ipfsCid: true,
          polygonTxHash: true,
          polygonBlockNumber: true,
          stamlesStatus: true,
          stamlesBatchId: true,
        },
      }),
      prisma.timestampEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
