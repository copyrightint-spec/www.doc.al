import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  status: "success" | "warning" | "error" | "info" | "pending";
  details: Record<string, string | number | boolean | null>;
  links?: { label: string; href: string }[];
}

/**
 * GET /api/admin/audit/timeline
 *
 * Query params (one required):
 *   - documentId: Document ID
 *   - signatureId: Signature ID
 *   - hash: Document file hash
 *   - sequenceNumber: TimestampEntry sequence number
 *   - email: User/signer email
 *
 * Returns a comprehensive chronological timeline of all events.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const documentId = searchParams.get("documentId");
  const signatureId = searchParams.get("signatureId");
  const hash = searchParams.get("hash");
  const sequenceNumber = searchParams.get("sequenceNumber");
  const email = searchParams.get("email");

  try {
    let resolvedDocumentId: string | null = null;
    let resolvedSignatureId: string | null = null;
    let entityType = "Dokument";
    let entityTitle = "";
    let entityId = "";

    // Resolve the entity
    if (documentId) {
      resolvedDocumentId = documentId;
      entityId = documentId;
    } else if (signatureId) {
      resolvedSignatureId = signatureId;
      entityId = signatureId;
      entityType = "Nenshkrim";
      // Also resolve the document
      const sig = await prisma.signature.findUnique({
        where: { id: signatureId },
        select: { documentId: true, signerName: true },
      });
      if (sig) {
        resolvedDocumentId = sig.documentId;
        entityTitle = `Nenshkrimi nga ${sig.signerName}`;
      }
    } else if (hash) {
      const doc = await prisma.document.findFirst({
        where: { fileHash: hash },
        select: { id: true, title: true },
      });
      if (doc) {
        resolvedDocumentId = doc.id;
        entityId = doc.id;
        entityTitle = doc.title;
      } else {
        return NextResponse.json({ success: true, data: null });
      }
    } else if (sequenceNumber) {
      const ts = await prisma.timestampEntry.findUnique({
        where: { sequenceNumber: parseInt(sequenceNumber) },
        select: { id: true, documentId: true, signatureId: true },
      });
      if (ts) {
        resolvedDocumentId = ts.documentId;
        resolvedSignatureId = ts.signatureId;
        entityId = ts.id;
        entityType = "Timestamp";
      } else {
        return NextResponse.json({ success: true, data: null });
      }
    } else if (email) {
      // Find by email - get latest signature or document for this email
      const sig = await prisma.signature.findFirst({
        where: { signerEmail: email },
        orderBy: { createdAt: "desc" },
        select: { id: true, documentId: true, signerName: true },
      });
      if (sig) {
        resolvedDocumentId = sig.documentId;
        resolvedSignatureId = sig.id;
        entityId = sig.documentId;
        entityType = "Dokument";
        entityTitle = `Dokumenti me nenshkrues ${sig.signerName} (${email})`;
      } else {
        return NextResponse.json({ success: true, data: null });
      }
    } else {
      return NextResponse.json(
        { error: "Duhet te jepni nje parameter kerkimi (documentId, signatureId, hash, sequenceNumber, ose email)" },
        { status: 400 }
      );
    }

    const events: TimelineEvent[] = [];

    // 1. Fetch document data
    let document = null;
    if (resolvedDocumentId) {
      document = await prisma.document.findUnique({
        where: { id: resolvedDocumentId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          signatures: {
            include: {
              signer: { select: { id: true, name: true, email: true, kycStatus: true } },
              certificate: { select: { id: true, serialNumber: true, type: true, subjectDN: true } },
              timestampEntries: {
                include: {
                  previousEntry: { select: { id: true, sequenceNumber: true, fingerprint: true } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          timestampEntries: {
            include: {
              previousEntry: { select: { id: true, sequenceNumber: true, fingerprint: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (document) {
        if (!entityTitle) entityTitle = document.title;
        if (!entityId) entityId = document.id;

        // Event: Document uploaded
        events.push({
          id: `doc-uploaded-${document.id}`,
          timestamp: document.createdAt.toISOString(),
          type: "DOCUMENT_UPLOADED",
          title: "Dokumenti u ngarkua",
          status: "success",
          details: {
            titulli: document.title,
            skedari: document.fileName,
            hash: document.fileHash,
            madhesia: `${(document.fileSize / 1024).toFixed(1)} KB`,
            pronari: document.owner.name || document.owner.email,
          },
        });
      }
    }

    // 2. Process signatures
    const signaturesSource = resolvedSignatureId
      ? document?.signatures?.filter((s) => s.id === resolvedSignatureId) || []
      : document?.signatures || [];

    for (const sig of signaturesSource) {
      // Certificate generated
      if (sig.certificate) {
        events.push({
          id: `cert-gen-${sig.certificate.id}`,
          timestamp: sig.createdAt.toISOString(),
          type: "CERTIFICATE_GENERATED",
          title: "Certifikata u gjenerua",
          status: "success",
          details: {
            serial: sig.certificate.serialNumber,
            tipi: sig.certificate.type,
            subjekti: sig.certificate.subjectDN,
          },
          links: [
            { label: "Shiko certifikaten", href: `/admin/certificates` },
          ],
        });
      }

      // Signature placed
      events.push({
        id: `sig-placed-${sig.id}`,
        timestamp: sig.createdAt.toISOString(),
        type: "SIGNATURE_PLACED",
        title: "Nenshkrimi u vendos",
        status: sig.status === "SIGNED" ? "success" : sig.status === "REJECTED" ? "error" : "pending",
        details: {
          nenshkruesi: sig.signerName,
          email: sig.signerEmail,
          statusi: sig.status,
          metoda: sig.notificationChannel,
          renditja: sig.order,
        },
      });

      // eIDAS consent (from audit log)
      // Verification sent
      if (sig.verificationSentAt) {
        events.push({
          id: `otp-sent-${sig.id}`,
          timestamp: sig.verificationSentAt.toISOString(),
          type: "EMAIL_OTP_SENT",
          title: "OTP u dergua me email",
          status: "success",
          details: {
            email: sig.signerEmail,
            kanali: sig.notificationChannel,
          },
        });
      }

      // KYC status at time of signing
      if (sig.signer) {
        events.push({
          id: `kyc-${sig.id}`,
          timestamp: sig.createdAt.toISOString(),
          type: "KYC_STATUS",
          title: "Statusi KYC ne momentin e nenshkrimit",
          status: sig.signer.kycStatus === "VERIFIED" ? "success" : sig.signer.kycStatus === "REJECTED" ? "error" : "warning",
          details: {
            perdoruesi: sig.signer.name || sig.signer.email,
            statusiKYC: sig.signer.kycStatus,
          },
        });
      }

      // PDF signed
      if (sig.signedAt) {
        events.push({
          id: `pdf-signed-${sig.id}`,
          timestamp: sig.signedAt.toISOString(),
          type: "PDF_SIGNED",
          title: "PDF u nenshkrua dixhitalisht",
          status: "success",
          details: {
            nenshkruesi: sig.signerName,
            data: sig.signedAt.toISOString(),
          },
        });
      }

      // Timestamp entries for this signature
      for (const ts of sig.timestampEntries) {
        // Timestamp created
        events.push({
          id: `ts-created-${ts.id}`,
          timestamp: ts.serverTimestamp.toISOString(),
          type: "TIMESTAMP_CREATED",
          title: `Vulecohore u krijua (#${ts.sequenceNumber})`,
          status: "success",
          details: {
            sekuenca: ts.sequenceNumber,
            gjurmaPrezgjedhur: ts.fingerprint.substring(0, 32) + "...",
            tipi: ts.type,
          },
        });

        // Sequential chain
        if (ts.previousEntry) {
          events.push({
            id: `chain-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "SEQUENTIAL_CHAIN",
            title: "Lidhja zinxhirore sekuenciale",
            status: "info",
            details: {
              ngaSekuenca: ts.previousEntry.sequenceNumber,
              neSekuencen: ts.sequenceNumber,
              gjurmaParaardhese: ts.previousEntry.fingerprint.substring(0, 32) + "...",
            },
          });
        }

        // STAMLES submitted
        if (ts.stamlesStatus && ts.stamlesStatus !== "QUEUED") {
          events.push({
            id: `stamles-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "STAMLES_SUBMITTED",
            title: "Hash u dergua ne STAMLES",
            status: ts.stamlesStatus === "CONFIRMED" ? "success" : "warning",
            details: {
              statusi: ts.stamlesStatus,
              batchId: ts.stamlesBatchId || "-",
            },
          });
        }

        // Polygon confirmed
        if (ts.polygonTxHash) {
          events.push({
            id: `polygon-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "POLYGON_CONFIRMED",
            title: "Transaksioni u konfirmua ne Polygon",
            status: "success",
            details: {
              txHash: ts.polygonTxHash,
              blloku: ts.polygonBlockNumber || "-",
            },
            links: [
              { label: "Shiko ne Polygonscan", href: `https://polygonscan.com/tx/${ts.polygonTxHash}` },
            ],
          });
        }

        // IPFS published
        if (ts.ipfsCid) {
          events.push({
            id: `ipfs-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "IPFS_PUBLISHED",
            title: "U publikua ne IPFS",
            status: "success",
            details: {
              CID: ts.ipfsCid,
            },
            links: [
              { label: "Shiko ne IPFS", href: `https://ipfs.io/ipfs/${ts.ipfsCid}` },
            ],
          });
        }
      }
    }

    // 3. Document-level timestamp entries (not associated with a signature)
    if (document?.timestampEntries) {
      for (const ts of document.timestampEntries) {
        // Skip if already processed via a signature
        if (ts.signatureId && signaturesSource.some((s) => s.id === ts.signatureId)) continue;

        events.push({
          id: `ts-doc-${ts.id}`,
          timestamp: ts.serverTimestamp.toISOString(),
          type: "TIMESTAMP_CREATED",
          title: `Vulecohore dokumenti (#${ts.sequenceNumber})`,
          status: "success",
          details: {
            sekuenca: ts.sequenceNumber,
            gjurma: ts.fingerprint.substring(0, 32) + "...",
            tipi: ts.type,
          },
        });

        if (ts.polygonTxHash) {
          events.push({
            id: `polygon-doc-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "POLYGON_CONFIRMED",
            title: "Transaksioni u konfirmua ne Polygon",
            status: "success",
            details: {
              txHash: ts.polygonTxHash,
              blloku: ts.polygonBlockNumber || "-",
            },
            links: [
              { label: "Shiko ne Polygonscan", href: `https://polygonscan.com/tx/${ts.polygonTxHash}` },
            ],
          });
        }

        if (ts.ipfsCid) {
          events.push({
            id: `ipfs-doc-${ts.id}`,
            timestamp: ts.serverTimestamp.toISOString(),
            type: "IPFS_PUBLISHED",
            title: "U publikua ne IPFS",
            status: "success",
            details: { CID: ts.ipfsCid },
            links: [
              { label: "Shiko ne IPFS", href: `https://ipfs.io/ipfs/${ts.ipfsCid}` },
            ],
          });
        }
      }
    }

    // 4. Fetch audit log entries for this entity
    const auditLogWhere: Record<string, unknown>[] = [];
    if (resolvedDocumentId) {
      auditLogWhere.push({ entityType: "Document", entityId: resolvedDocumentId });
    }
    if (resolvedSignatureId) {
      auditLogWhere.push({ entityType: "Signature", entityId: resolvedSignatureId });
    }
    // Also look for related entity types
    if (resolvedDocumentId) {
      auditLogWhere.push({ entityType: "TimestampEntry", metadata: { path: ["documentId"], equals: resolvedDocumentId } });
    }
    // Look for User-level audit events (OTP/TOTP/2FA) linked to signers of this document
    if (signaturesSource.length > 0) {
      const signerUserIds = signaturesSource
        .map((s) => s.signerId)
        .filter((id): id is string => !!id);
      if (signerUserIds.length > 0) {
        auditLogWhere.push({
          entityType: "User",
          entityId: { in: signerUserIds },
          action: {
            in: [
              "SIGNING_OTP_SENT",
              "SIGNING_OTP_VERIFIED",
              "SIGNING_OTP_FAILED",
              "SIGNING_TOTP_VERIFIED",
              "SIGNING_TOTP_FAILED",
              "TOTP_ENABLED",
            ],
          },
        });
      }
    }

    if (auditLogWhere.length > 0) {
      const auditLogs = await prisma.auditLog.findMany({
        where: { OR: auditLogWhere },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
        take: 200,
      });

      for (const log of auditLogs) {
        // Map audit actions to timeline events
        let type = "DOCUMENT_UPLOADED";
        let title = log.action;
        let status: TimelineEvent["status"] = "info";

        const actionUpper = log.action.toUpperCase();
        if (actionUpper.includes("CONSENT") || actionUpper.includes("EIDAS")) {
          type = "EIDAS_CONSENT";
          title = "Pelqimi eIDAS u pranua";
          status = "success";
        } else if (actionUpper === "SIGNING_OTP_SENT") {
          type = "EMAIL_OTP_SENT";
          title = "OTP u dergua me email per nenshkrim";
          status = "success";
        } else if (actionUpper === "SIGNING_OTP_VERIFIED") {
          type = "EMAIL_OTP_VERIFIED";
          title = "OTP email u verifikua me sukses";
          status = "success";
        } else if (actionUpper === "SIGNING_OTP_FAILED") {
          type = "EMAIL_OTP_VERIFIED";
          title = "OTP email verifikimi deshtoi";
          status = "error";
        } else if (actionUpper === "SIGNING_TOTP_VERIFIED") {
          type = "TOTP_VERIFIED";
          title = "TOTP 2FA u verifikua me sukses";
          status = "success";
        } else if (actionUpper === "SIGNING_TOTP_FAILED") {
          type = "TOTP_VERIFIED";
          title = "TOTP 2FA verifikimi deshtoi";
          status = "error";
        } else if (actionUpper === "TOTP_ENABLED") {
          type = "TOTP_SETUP";
          title = "TOTP 2FA u aktivizua";
          status = "success";
        } else if (actionUpper.includes("OTP") && actionUpper.includes("VERIFY")) {
          type = "EMAIL_OTP_VERIFIED";
          title = "OTP u verifikua me sukses";
          status = "success";
        } else if (actionUpper.includes("TOTP") && actionUpper.includes("VERIFY")) {
          type = "TOTP_VERIFIED";
          title = "TOTP 2FA u verifikua";
          status = "success";
        } else if (actionUpper.includes("S3") || actionUpper.includes("UPLOAD")) {
          type = "S3_UPLOAD";
          title = "Skedari u ngarkua ne S3";
          status = "success";
        } else if (actionUpper.includes("EMAIL_SENT")) {
          type = "EMAIL_SENT";
          title = "Email u dergua";
          status = "success";
        } else if (actionUpper.includes("EMAIL_OPENED")) {
          type = "EMAIL_OPENED";
          title = "Email u hap";
          status = "info";
        } else if (actionUpper.includes("EMAIL_LINK_CLICKED")) {
          type = "EMAIL_CLICKED";
          title = "Link ne email u klikua";
          status = "info";
        } else if (actionUpper.includes("SIGN")) {
          type = "PDF_SIGNED";
          title = log.action;
          status = "success";
        }

        // Avoid duplicating events we already have from structured data
        const isDuplicate = events.some(
          (e) => Math.abs(new Date(e.timestamp).getTime() - log.createdAt.getTime()) < 2000
            && e.type === type
        );
        if (isDuplicate) continue;

        const details: Record<string, string | null> = {
          veprimi: log.action,
          IP: log.ipAddress,
        };

        if (log.user) {
          details.perdoruesi = log.user.name || log.user.email;
        }

        // Add metadata fields
        if (log.metadata && typeof log.metadata === "object") {
          const meta = log.metadata as Record<string, unknown>;
          for (const [k, v] of Object.entries(meta)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
              details[k] = String(v);
            }
          }
        }

        events.push({
          id: `audit-${log.id}`,
          timestamp: log.createdAt.toISOString(),
          type,
          title,
          status,
          details,
        });
      }
    }

    // 5. Fetch email logs
    if (resolvedDocumentId || resolvedSignatureId) {
      const emailWhere: Record<string, unknown>[] = [];
      if (resolvedDocumentId) {
        emailWhere.push({ entityType: "Document", entityId: resolvedDocumentId });
      }
      if (resolvedSignatureId) {
        emailWhere.push({ entityType: "Signature", entityId: resolvedSignatureId });
      }

      const emailLogs = await prisma.emailLog.findMany({
        where: { OR: emailWhere },
        orderBy: { createdAt: "asc" },
        include: {
          opens: { orderBy: { openedAt: "asc" }, take: 50 },
          clicks: { orderBy: { clickedAt: "asc" }, take: 50 },
        },
        take: 50,
      });

      for (const eLog of emailLogs) {
        // Extract trackingCode from metadata if available
        const emailMeta = eLog.metadata && typeof eLog.metadata === "object"
          ? (eLog.metadata as Record<string, unknown>)
          : {};
        const trackingCode = typeof emailMeta.trackingCode === "string"
          ? emailMeta.trackingCode
          : null;

        // Email sent event
        events.push({
          id: `email-${eLog.id}`,
          timestamp: (eLog.sentAt || eLog.createdAt).toISOString(),
          type: "EMAIL_SENT",
          title: `Email u dergua: ${trackingCode ? `[DOC-${trackingCode}] ` : ""}${eLog.subject}`,
          status: eLog.status === "DELIVERED" || eLog.status === "OPENED"
            ? "success"
            : eLog.status === "BOUNCED" || eLog.status === "FAILED"
            ? "error"
            : eLog.status === "SENT"
            ? "success"
            : "pending",
          details: {
            drejt: eLog.to,
            subjekti: eLog.subject,
            statusi: eLog.status,
            trackingId: eLog.trackingId,
            kodiGjurmimit: trackingCode || "-",
            hapjeTeAre: eLog.openCount > 0 ? `${eLog.openCount}x` : "0",
            klikime: eLog.clickCount > 0 ? `${eLog.clickCount}x` : "0",
          },
        });

        // Email bounced/failed
        if (eLog.status === "BOUNCED" && eLog.bouncedAt) {
          events.push({
            id: `email-bounced-${eLog.id}`,
            timestamp: eLog.bouncedAt.toISOString(),
            type: "EMAIL_BOUNCED",
            title: `Email u kthye (bounce): ${eLog.subject}`,
            status: "error",
            details: {
              drejt: eLog.to,
              gabimi: eLog.errorMessage || "-",
            },
          });
        }
        if (eLog.status === "FAILED" && eLog.failedAt) {
          events.push({
            id: `email-failed-${eLog.id}`,
            timestamp: eLog.failedAt.toISOString(),
            type: "EMAIL_FAILED",
            title: `Email deshtoi: ${eLog.subject}`,
            status: "error",
            details: {
              drejt: eLog.to,
              gabimi: eLog.errorMessage || "-",
            },
          });
        }

        // Individual email open events
        for (const open of eLog.opens) {
          events.push({
            id: `email-open-${open.id}`,
            timestamp: open.openedAt.toISOString(),
            type: "EMAIL_OPENED",
            title: `Email u hap: ${trackingCode ? `[DOC-${trackingCode}] ` : ""}${eLog.subject}`,
            status: "info",
            details: {
              drejt: eLog.to,
              kodiGjurmimit: trackingCode || "-",
              IP: open.ipAddress,
              pajisja: open.userAgent ? open.userAgent.substring(0, 80) : "-",
            },
          });
        }

        // Individual email click events
        for (const click of eLog.clicks) {
          events.push({
            id: `email-click-${click.id}`,
            timestamp: click.clickedAt.toISOString(),
            type: "EMAIL_CLICKED",
            title: `Link u klikua ne email: ${trackingCode ? `[DOC-${trackingCode}] ` : ""}${eLog.subject}`,
            status: "info",
            details: {
              drejt: eLog.to,
              kodiGjurmimit: trackingCode || "-",
              URL: click.url,
              IP: click.ipAddress,
            },
          });
        }
      }
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Mask PII for non-SUPER_ADMIN
    if (session.user.role !== "SUPER_ADMIN") {
      for (const event of events) {
        for (const [key, value] of Object.entries(event.details)) {
          if (typeof value !== "string") continue;
          // Mask email addresses
          if (value.includes("@")) {
            const [local, domain] = value.split("@");
            event.details[key] = `${local[0]}***@${domain}`;
          }
          // Mask IP addresses (both IPv4 and IPv6-mapped)
          if (key === "IP" || key.toLowerCase() === "ip" || key === "ipAddress") {
            if (value && value !== "-") {
              event.details[key] = value.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, (ip) => {
                const parts = ip.split(".");
                return `${parts[0]}.***.***.${parts[3]}`;
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        entityType,
        entityId,
        entityTitle,
        events,
      },
    });
  } catch (error) {
    console.error("[Audit Timeline] Error:", error);
    return NextResponse.json(
      { error: "Gabim gjate perpunimit te kerkeses" },
      { status: 500 }
    );
  }
}
