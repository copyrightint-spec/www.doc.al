import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalDocuments, pendingSignatures, completedDocuments, timestampsThisMonth, user] =
      await Promise.all([
        prisma.document.count({
          where: { ownerId: session.user.id, deletedAt: null },
        }),
        prisma.signature.count({
          where: {
            document: { ownerId: session.user.id },
            status: "PENDING",
          },
        }),
        prisma.document.count({
          where: { ownerId: session.user.id, status: "COMPLETED" },
        }),
        prisma.timestampEntry.count({
          where: {
            createdAt: { gte: startOfMonth },
            document: { ownerId: session.user.id },
          },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { signatureData: true },
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        totalDocuments,
        pendingSignatures,
        completedDocuments,
        timestampsThisMonth,
        hasSignatureData: user?.signatureData != null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
