import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "info";
  details?: Record<string, string | number | null>;
}

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
        owner: { select: { id: true, name: true, email: true } },
        signatures: {
          orderBy: { order: "asc" },
          include: {
            certificate: { select: { id: true, serialNumber: true, subjectDN: true } },
            timestampEntries: { orderBy: { serverTimestamp: "asc" } },
          },
        },
        timestampEntries: {
          orderBy: { serverTimestamp: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokumenti nuk u gjet" }, { status: 404 });
    }

    // Authorization: only owner or signer can view
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

    // Fetch audit logs for this document
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: "Document", entityId: id },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Fetch email logs for this document + its signatures
    const signatureIds = document.signatures.map((s) => s.id);
    const emailLogs = await prisma.emailLog.findMany({
      where: {
        OR: [
          { entityType: "Document", entityId: id },
          { entityType: "Signature", entityId: { in: signatureIds } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        opens: { orderBy: { openedAt: "asc" }, take: 1 },
        clicks: { orderBy: { clickedAt: "asc" }, take: 1 },
      },
    });

    // Build chronological timeline
    const timeline: TimelineEvent[] = [];

    // 1. Document uploaded
    timeline.push({
      type: "DOCUMENT_UPLOADED",
      title: "Dokumenti u ngarkua",
      description: `Skedari "${document.fileName}" u ngarkua nga ${document.owner.name}`,
      timestamp: document.createdAt.toISOString(),
      status: "success",
      details: {
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileHash: document.fileHash,
      },
    });

    // Process each signature
    for (const sig of document.signatures) {
      // Certificate generated
      if (sig.certificate) {
        timeline.push({
          type: "CERTIFICATE_GENERATED",
          title: "Certifikata u gjenerua",
          description: `Certifikate dixhitale per ${sig.signerName}`,
          timestamp: sig.createdAt.toISOString(),
          status: "success",
          details: {
            serialNumber: sig.certificate.serialNumber,
            subjectDN: sig.certificate.subjectDN,
          },
        });
      }

      // Verification sent (email OTP)
      if (sig.verificationSentAt) {
        timeline.push({
          type: "EMAIL_OTP_SENT",
          title: "Email OTP derguar",
          description: `Kodi i verifikimit u dergua te ${sig.signerEmail}`,
          timestamp: sig.verificationSentAt.toISOString(),
          status: "info",
          details: { signerEmail: sig.signerEmail },
        });
      }

      // Document viewed
      if (sig.viewedAt) {
        timeline.push({
          type: "DOCUMENT_VIEWED",
          title: "Dokumenti u pa",
          description: `${sig.signerName} e pa dokumentin`,
          timestamp: sig.viewedAt.toISOString(),
          status: "info",
          details: { signerName: sig.signerName },
        });
      }

      // Signature placed
      if (sig.signedAt) {
        timeline.push({
          type: "SIGNATURE_PLACED",
          title: "Firma u vendos",
          description: `${sig.signerName} nenshkroi dokumentin`,
          timestamp: sig.signedAt.toISOString(),
          status: "success",
          details: {
            signerName: sig.signerName,
            signerEmail: sig.signerEmail,
          },
        });
      }

      // Signature rejected
      if (sig.status === "REJECTED") {
        timeline.push({
          type: "SIGNATURE_REJECTED",
          title: "Firma u refuzua",
          description: `${sig.signerName} refuzoi te nenshkruaje`,
          timestamp: sig.updatedAt.toISOString(),
          status: "error",
          details: { signerName: sig.signerName },
        });
      }

      // Reminders
      if (sig.lastReminderAt) {
        timeline.push({
          type: "REMINDER_SENT",
          title: "Kujtese e derguar",
          description: `Kujtese u dergua te ${sig.signerEmail}`,
          timestamp: sig.lastReminderAt.toISOString(),
          status: "warning",
          details: { signerEmail: sig.signerEmail },
        });
      }
    }

    // Audit log events (eIDAS, TOTP, etc.)
    for (const log of auditLogs) {
      const meta = (log.metadata || {}) as Record<string, string>;

      if (log.action === "EIDAS_ACCEPTED") {
        timeline.push({
          type: "EIDAS_ACCEPTED",
          title: "eIDAS pranim",
          description: `Kushtet eIDAS u pranuan${log.user ? ` nga ${log.user.name}` : ""}`,
          timestamp: log.createdAt.toISOString(),
          status: "success",
          details: meta,
        });
      } else if (log.action === "TOTP_VERIFIED") {
        timeline.push({
          type: "TOTP_VERIFIED",
          title: "TOTP 2FA verifikuar",
          description: `Verifikimi dy-faktoresh u krye${log.user ? ` nga ${log.user.name}` : ""}`,
          timestamp: log.createdAt.toISOString(),
          status: "success",
          details: meta,
        });
      } else if (log.action === "EMAIL_OTP_VERIFIED") {
        timeline.push({
          type: "EMAIL_OTP_VERIFIED",
          title: "Email OTP verifikuar",
          description: `Kodi OTP u verifikua me sukses${log.user ? ` nga ${log.user.name}` : ""}`,
          timestamp: log.createdAt.toISOString(),
          status: "success",
          details: meta,
        });
      } else if (log.action === "PDF_SIGNED") {
        timeline.push({
          type: "PDF_SIGNED",
          title: "PDF nenshkruar",
          description: `Dokumenti PDF u nenshkrua dixhitalisht`,
          timestamp: log.createdAt.toISOString(),
          status: "success",
          details: { hash: meta.hash || null },
        });
      }
    }

    // Timestamp entries
    for (const ts of document.timestampEntries) {
      // Timestamp created
      timeline.push({
        type: "TIMESTAMP_CREATED",
        title: `Timestamp krijuar (chain #${ts.sequenceNumber})`,
        description: `Regjistrimi ne zinxhirin e kohes #${ts.sequenceNumber}`,
        timestamp: ts.serverTimestamp.toISOString(),
        status: "success",
        details: {
          sequenceNumber: ts.sequenceNumber,
          fingerprint: ts.fingerprint,
        },
      });

      // STAMLES sent
      if (ts.stamlesStatus && ts.stamlesStatus !== "QUEUED") {
        timeline.push({
          type: "STAMLES_SENT",
          title: "STAMLES derguar",
          description: `Prova u dergua ne rrjetin STAMLES${ts.stamlesBatchId ? ` (batch: ${ts.stamlesBatchId})` : ""}`,
          timestamp: ts.serverTimestamp.toISOString(),
          status: ts.stamlesStatus === "CONFIRMED" ? "success" : "warning",
          details: {
            batchId: ts.stamlesBatchId || null,
            status: ts.stamlesStatus,
          },
        });
      }

      // Polygon confirmed
      if (ts.polygonTxHash) {
        timeline.push({
          type: "POLYGON_CONFIRMED",
          title: "Polygon konfirmuar",
          description: `Transaksioni u konfirmua ne blockchain Polygon`,
          timestamp: ts.serverTimestamp.toISOString(),
          status: "success",
          details: {
            txHash: ts.polygonTxHash,
            blockNumber: ts.polygonBlockNumber,
            explorerUrl: `https://polygonscan.com/tx/${ts.polygonTxHash}`,
          },
        });
      }

      // IPFS published
      if (ts.ipfsCid) {
        timeline.push({
          type: "IPFS_PUBLISHED",
          title: "IPFS publikuar",
          description: `Prova u publikua ne IPFS`,
          timestamp: ts.serverTimestamp.toISOString(),
          status: "success",
          details: {
            cid: ts.ipfsCid,
            gatewayUrl: `https://ipfs.io/ipfs/${ts.ipfsCid}`,
          },
        });
      }
    }

    // Email logs
    for (const email of emailLogs) {
      const meta = (email.metadata || {}) as Record<string, string>;

      // Email sent
      if (email.sentAt) {
        timeline.push({
          type: "EMAIL_SENT",
          title: "Email derguar",
          description: `Email u dergua te ${email.to}${meta.templateName ? ` (${meta.templateName})` : ""}`,
          timestamp: email.sentAt.toISOString(),
          status: "success",
          details: {
            to: email.to,
            subject: email.subject,
          },
        });
      }

      // Email opened
      if (email.firstOpenAt) {
        timeline.push({
          type: "EMAIL_OPENED",
          title: "Email hapur",
          description: `${email.to} e hapi emailin`,
          timestamp: email.firstOpenAt.toISOString(),
          status: "info",
          details: {
            to: email.to,
            openCount: email.openCount,
          },
        });
      }

      // Email clicked
      if (email.firstClickAt) {
        timeline.push({
          type: "EMAIL_CLICKED",
          title: "Email klikuar",
          description: `${email.to} klikoi linkun ne email`,
          timestamp: email.firstClickAt.toISOString(),
          status: "info",
          details: {
            to: email.to,
            clickCount: email.clickCount,
          },
        });
      }

      // Email bounced/failed
      if (email.status === "BOUNCED" && email.bouncedAt) {
        timeline.push({
          type: "EMAIL_BOUNCED",
          title: "Email deshtoi",
          description: `Emaili per ${email.to} u kthye`,
          timestamp: email.bouncedAt.toISOString(),
          status: "error",
          details: { to: email.to, error: email.errorMessage || null },
        });
      }
      if (email.status === "FAILED" && email.failedAt) {
        timeline.push({
          type: "EMAIL_FAILED",
          title: "Email deshtoi",
          description: `Dergimi i emailit per ${email.to} deshtoi`,
          timestamp: email.failedAt.toISOString(),
          status: "error",
          details: { to: email.to, error: email.errorMessage || null },
        });
      }
    }

    // Sort chronologically
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: document.id,
          title: document.title,
          fileName: document.fileName,
          fileHash: document.fileHash,
          fileUrl: document.fileUrl,
          fileSize: document.fileSize,
          status: document.status,
          createdAt: document.createdAt.toISOString(),
          owner: document.owner,
        },
        signatures: document.signatures.map((s) => ({
          id: s.id,
          signerName: s.signerName,
          signerEmail: s.signerEmail,
          status: s.status,
          order: s.order,
          signedAt: s.signedAt?.toISOString() || null,
          viewedAt: s.viewedAt?.toISOString() || null,
          createdAt: s.createdAt.toISOString(),
        })),
        timeline,
      },
    });
  } catch (error) {
    console.error("Timeline error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
