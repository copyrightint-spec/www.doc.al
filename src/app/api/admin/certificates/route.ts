import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Akses i ndaluar" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const revoked = searchParams.get("revoked");
    const expiring = searchParams.get("expiring");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: "insensitive" } },
        { subjectDN: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (revoked === "true") {
      where.revoked = true;
    } else if (revoked === "false") {
      where.revoked = false;
    }

    if (expiring === "true") {
      const now = new Date();
      const in90Days = new Date();
      in90Days.setDate(in90Days.getDate() + 90);
      where.validTo = { gte: now, lte: in90Days };
      where.revoked = false;
    }

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } },
          renewalAlerts: {
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { signatures: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        certificates,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Vetem SUPER_ADMIN mund te kryeje kete veprim" }, { status: 403 });
    }

    const body = await req.json();
    const { certificateId, action, revokeReason } = body;

    if (!certificateId) {
      return NextResponse.json({ error: "certificateId eshte i detyrueshem" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certifikata nuk u gjet" }, { status: 404 });
    }

    if (action === "revoke") {
      if (certificate.revoked) {
        return NextResponse.json({ error: "Certifikata eshte tashme e revokuar" }, { status: 400 });
      }

      const updated = await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          revoked: true,
          revokedAt: new Date(),
          revokeReason: revokeReason || "Revoked by administrator",
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "toggleAutoRenew") {
      const updated = await prisma.certificate.update({
        where: { id: certificateId },
        data: {
          autoRenew: !certificate.autoRenew,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "Veprim i panjohur" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
