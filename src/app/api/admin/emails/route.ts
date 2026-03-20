import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
