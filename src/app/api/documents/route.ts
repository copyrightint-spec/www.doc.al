import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeSHA256 } from "@/lib/timestamp/engine";
import { rateLimit } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    // Rate limit: 20 uploads per hour per user
    const limited = rateLimit(req, "documentUpload", session.user.id);
    if (limited) return limited;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;

    if (!file) {
      return NextResponse.json({ error: "Skedari eshte i detyrueshem" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Vetem skedare PDF lejohen" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Madhesia maksimale eshte 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = computeSHA256(buffer);

    const s3Key = `documents/${session.user.id}/${Date.now()}-${file.name}`;
    await uploadFile(s3Key, buffer, file.type);
    const fileUrl = s3Key;

    const document = await prisma.document.create({
      data: {
        title: title || file.name,
        fileName: file.name,
        fileHash,
        fileUrl,
        fileSize: file.size,
        ownerId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        entityType: "Document",
        entityId: document.id,
        userId: session.user.id,
        metadata: { fileName: file.name, fileSize: file.size },
      },
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      ownerId: session.user.id,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          signatures: {
            select: { id: true, status: true, signerName: true, signerEmail: true },
          },
          _count: { select: { signatures: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { documents, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
