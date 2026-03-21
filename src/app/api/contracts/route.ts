import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      OR: [
        { requesterId: session.user.id },
        {
          document: {
            signatures: {
              some: { signerEmail: session.user.email },
            },
          },
        },
      ],
    };

    if (status) {
      (where as Record<string, unknown>).status = status;
    }

    if (search) {
      (where as Record<string, unknown>).AND = [
        {
          OR: [
            { document: { title: { contains: search, mode: "insensitive" } } },
            { companyName: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const contracts = await prisma.signingRequest.findMany({
      where,
      include: {
        document: {
          include: {
            signatures: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                signerName: true,
                signerEmail: true,
                status: true,
                signedAt: true,
                order: true,
              },
            },
          },
        },
        template: {
          select: { id: true, name: true, category: true },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch self-signed documents (documents with signatures but no SigningRequest)
    const selfSignedWhere: Record<string, unknown> = {
      ownerId: session.user.id,
      status: "COMPLETED",
      signingRequests: { none: {} },
      signatures: { some: { signerId: session.user.id, status: "SIGNED" } },
    };

    if (search) {
      selfSignedWhere.title = { contains: search, mode: "insensitive" };
    }

    // If a status filter is set, only include self-signed docs when filter is COMPLETED
    const includeSelfSigned = !status || status === "COMPLETED";

    const selfSignedDocs = includeSelfSigned
      ? await prisma.document.findMany({
          where: selfSignedWhere,
          include: {
            signatures: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                signerName: true,
                signerEmail: true,
                status: true,
                signedAt: true,
                order: true,
              },
            },
            owner: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return NextResponse.json({ success: true, data: contracts, selfSigned: selfSignedDocs });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
