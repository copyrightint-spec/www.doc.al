import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSigningReminder } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id: signatureId } = await params;

    const signature = await prisma.signature.findUnique({
      where: { id: signatureId },
      include: {
        document: {
          select: { id: true, title: true, ownerId: true },
        },
      },
    });

    if (!signature) {
      return NextResponse.json({ error: "Nenshkrimi nuk u gjet" }, { status: 404 });
    }

    // Only document owner or admin can send reminders
    const isOwner = signature.document.ownerId === session.user.id;
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Nuk keni akses" }, { status: 403 });
    }

    if (signature.status === "SIGNED") {
      return NextResponse.json({ error: "Dokumenti eshte nenshkruar tashme" }, { status: 400 });
    }

    // Rate limit: max 1 reminder per signature per 4 hours
    if (signature.lastReminderAt) {
      const hoursSince = (Date.now() - signature.lastReminderAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        return NextResponse.json(
          { error: "Kujtesa u dergua se fundmi. Provoni perseri me vone." },
          { status: 429 }
        );
      }
    }

    const baseUrl = process.env.NEXTAUTH_URL || "https://www.doc.al";
    const signingUrl = `${baseUrl}/sign/${signature.token}`;

    await sendSigningReminder(
      signature.signerEmail,
      signature.signerName,
      signature.document.title,
      signingUrl,
      { userId: session.user.id }
    );

    await prisma.signature.update({
      where: { id: signatureId },
      data: { lastReminderAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: "SIGNING_REMINDER_SENT",
        entityType: "Signature",
        entityId: signatureId,
        userId: session.user.id,
        metadata: {
          signerEmail: signature.signerEmail,
          documentId: signature.document.id,
        },
      },
    });

    return NextResponse.json({ success: true, message: "Kujtesa u dergua me sukses" });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
