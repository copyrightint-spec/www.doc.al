import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendCertificateRenewalAlert } from "@/lib/email";

const ALERT_THRESHOLDS = [90, 60, 30, 14, 7, 3, 2, 1];

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    let alertsSent = 0;

    // Find certificates expiring within 90 days that are not revoked
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const certificates = await prisma.certificate.findMany({
      where: {
        revoked: false,
        validTo: {
          gte: now,
          lte: ninetyDaysFromNow,
        },
      },
      include: {
        user: { select: { email: true, name: true } },
        renewalAlerts: true,
      },
    });

    for (const cert of certificates) {
      if (!cert.user) continue;

      const daysRemaining = Math.ceil(
        (cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find the appropriate threshold
      const threshold = ALERT_THRESHOLDS.find((t) => daysRemaining <= t);
      if (!threshold) continue;

      // Check if alert already sent for this threshold
      const existingAlert = cert.renewalAlerts.find(
        (a) => a.daysBeforeExpiry === threshold && a.status !== "PENDING"
      );
      if (existingAlert) continue;

      // Send alert
      const sent = await sendCertificateRenewalAlert(
        cert.user.email,
        cert.user.name,
        cert.serialNumber,
        cert.subjectDN,
        cert.validTo,
        daysRemaining
      );

      if (sent) {
        await prisma.certificateRenewalAlert.upsert({
          where: {
            certificateId_daysBeforeExpiry: {
              certificateId: cert.id,
              daysBeforeExpiry: threshold,
            },
          },
          create: {
            certificateId: cert.id,
            daysBeforeExpiry: threshold,
            status: "SENT",
            sentAt: now,
          },
          update: {
            status: "SENT",
            sentAt: now,
          },
        });

        // Update certificate renewal notification timestamp
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { renewalNotifiedAt: now },
        });

        alertsSent++;
      }
    }

    // Also handle daily alerts for certificates expiring within 30 days
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const urgentCerts = await prisma.certificate.findMany({
      where: {
        revoked: false,
        validTo: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        OR: [
          { renewalNotifiedAt: null },
          {
            renewalNotifiedAt: {
              lt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last notified > 24h ago
            },
          },
        ],
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    for (const cert of urgentCerts) {
      if (!cert.user) continue;
      const daysRemaining = Math.ceil(
        (cert.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const sent = await sendCertificateRenewalAlert(
        cert.user.email,
        cert.user.name,
        cert.serialNumber,
        cert.subjectDN,
        cert.validTo,
        daysRemaining
      );

      if (sent) {
        await prisma.certificate.update({
          where: { id: cert.id },
          data: { renewalNotifiedAt: now },
        });
        alertsSent++;
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "CERTIFICATE_RENEWAL_CHECK",
        entityType: "Certificate",
        entityId: "cron",
        metadata: {
          certificatesChecked: certificates.length + urgentCerts.length,
          alertsSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { certificatesChecked: certificates.length + urgentCerts.length, alertsSent },
    });
  } catch (error) {
    console.error("Certificate alert cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
