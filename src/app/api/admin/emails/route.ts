import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const status = searchParams.get("status");
  const recipient = searchParams.get("recipient");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (recipient) {
      where.to = { contains: recipient, mode: "insensitive" };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    // Fetch paginated email logs
    const [emails, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          opens: { orderBy: { openedAt: "asc" }, take: 50 },
          clicks: { orderBy: { clickedAt: "asc" }, take: 50 },
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    // Aggregated stats (all-time, not filtered)
    const [totalSent, totalDelivered, totalOpened, totalBounced, totalFailed, totalAll] =
      await Promise.all([
        prisma.emailLog.count({ where: { status: "SENT" } }),
        prisma.emailLog.count({ where: { status: "DELIVERED" } }),
        prisma.emailLog.count({ where: { status: "OPENED" } }),
        prisma.emailLog.count({ where: { status: "BOUNCED" } }),
        prisma.emailLog.count({ where: { status: "FAILED" } }),
        prisma.emailLog.count(),
      ]);

    // Count emails with at least one open
    const emailsWithOpens = await prisma.emailLog.count({
      where: { openCount: { gt: 0 } },
    });

    // Count emails with at least one click
    const emailsWithClicks = await prisma.emailLog.count({
      where: { clickCount: { gt: 0 } },
    });

    const successfullySent = totalSent + totalDelivered + totalOpened;
    const deliveryRate = totalAll > 0 ? ((successfullySent / totalAll) * 100).toFixed(1) : "0";
    const openRate = successfullySent > 0 ? ((emailsWithOpens / successfullySent) * 100).toFixed(1) : "0";
    const clickRate = successfullySent > 0 ? ((emailsWithClicks / successfullySent) * 100).toFixed(1) : "0";
    const bounceRate = totalAll > 0 ? ((totalBounced / totalAll) * 100).toFixed(1) : "0";

    return NextResponse.json({
      success: true,
      data: emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalAll,
        sent: successfullySent,
        delivered: totalDelivered,
        opened: emailsWithOpens,
        bounced: totalBounced,
        failed: totalFailed,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate,
      },
    });
  } catch (error) {
    console.error("[Admin Emails] Error:", error);
    return NextResponse.json(
      { error: "Gabim gjate perpunimit te kerkeses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { emailLogId } = await req.json();
    if (!emailLogId) {
      return NextResponse.json({ error: "emailLogId required" }, { status: 400 });
    }

    const emailLog = await prisma.emailLog.findUnique({ where: { id: emailLogId } });
    if (!emailLog) {
      return NextResponse.json({ error: "Email log not found" }, { status: 404 });
    }

    if (!["FAILED", "BOUNCED"].includes(emailLog.status)) {
      return NextResponse.json(
        { error: "Vetem emailet e deshtuar ose te kthyera mund te ridergoheshin" },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "docal-mail",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      tls: { rejectUnauthorized: false },
    });

    // Create a new email log for the resend
    const newLog = await prisma.emailLog.create({
      data: {
        from: emailLog.from,
        to: emailLog.to,
        subject: emailLog.subject,
        status: "QUEUED",
        entityType: emailLog.entityType,
        entityId: emailLog.entityId,
        userId: emailLog.userId,
        metadata: { resendOf: emailLogId, resendBy: session.user.email },
      },
    });

    try {
      await transporter.sendMail({
        from: emailLog.from,
        to: emailLog.to,
        subject: emailLog.subject,
      });

      await prisma.emailLog.update({
        where: { id: newLog.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          action: "ADMIN_EMAIL_RESEND",
          entityType: "EmailLog",
          entityId: emailLogId,
          userId: session.user.id,
          metadata: { to: emailLog.to, subject: emailLog.subject, newEmailLogId: newLog.id },
        },
      });

      return NextResponse.json({ success: true, message: "Email u ridergua me sukses" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await prisma.emailLog.update({
        where: { id: newLog.id },
        data: { status: "FAILED", failedAt: new Date(), errorMessage },
      });
      return NextResponse.json({ error: `Gabim gjate dergimit: ${errorMessage}` }, { status: 500 });
    }
  } catch (error) {
    console.error("[Admin Emails] Resend error:", error);
    return NextResponse.json({ error: "Gabim gjate ridergimit" }, { status: 500 });
  }
}
