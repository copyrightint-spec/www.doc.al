import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const limited = rateLimit(req, "emailTracking");
  if (limited) return limited;

  const { trackingId } = await params;
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.redirect(process.env.NEXTAUTH_URL || "https://www.doc.al");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // Update email log click count
    await prisma.emailLog.update({
      where: { trackingId },
      data: {
        clickCount: { increment: 1 },
        lastClickAt: new Date(),
      },
    });

    // Set firstClickAt only if not already set
    await prisma.emailLog.updateMany({
      where: { trackingId, firstClickAt: null },
      data: { firstClickAt: new Date() },
    });

    // Record individual click
    await prisma.emailClick.create({
      data: {
        emailLog: { connect: { trackingId } },
        url,
        ipAddress: ip,
        userAgent,
      },
    });

    // Audit log
    const emailLog = await prisma.emailLog.findUnique({
      where: { trackingId },
      select: { entityType: true, entityId: true, userId: true, to: true },
    });

    if (emailLog?.entityId) {
      await prisma.auditLog.create({
        data: {
          action: "EMAIL_LINK_CLICKED",
          entityType: emailLog.entityType || "Email",
          entityId: emailLog.entityId,
          userId: emailLog.userId,
          ipAddress: ip,
          userAgent,
          metadata: {
            to: emailLog.to,
            trackingId,
            clickedUrl: url,
          },
        },
      });
    }
  } catch {
    // Silently fail - still redirect
  }

  return NextResponse.redirect(url);
}
