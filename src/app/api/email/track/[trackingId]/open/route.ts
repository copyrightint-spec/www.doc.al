import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 1x1 transparent PNG pixel
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // Update email log
    await prisma.emailLog.update({
      where: { trackingId },
      data: {
        openCount: { increment: 1 },
        firstOpenAt: undefined, // only set if null, handled below
        lastOpenAt: new Date(),
        lastOpenIp: ip,
        lastOpenUa: userAgent,
      },
    });

    // Set firstOpenAt only if not already set
    await prisma.emailLog.updateMany({
      where: { trackingId, firstOpenAt: null },
      data: { firstOpenAt: new Date() },
    });

    // Record individual open
    await prisma.emailOpen.create({
      data: {
        emailLog: { connect: { trackingId } },
        ipAddress: ip,
        userAgent,
      },
    });

    // Audit log
    const emailLog = await prisma.emailLog.findUnique({
      where: { trackingId },
      select: { entityType: true, entityId: true, userId: true, to: true, openCount: true },
    });

    if (emailLog?.entityId) {
      await prisma.auditLog.create({
        data: {
          action: "EMAIL_OPENED",
          entityType: emailLog.entityType || "Email",
          entityId: emailLog.entityId,
          userId: emailLog.userId,
          ipAddress: ip,
          userAgent,
          metadata: {
            to: emailLog.to,
            trackingId,
            openNumber: emailLog.openCount,
          },
        },
      });
    }
  } catch {
    // Silently fail - don't break the pixel response
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
