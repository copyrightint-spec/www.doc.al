import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSigningInvitation } from "@/lib/email";
import { z } from "zod";

const signingRequestSchema = z.object({
  signers: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().min(1),
      order: z.number().int().min(0),
    })
  ).min(1),
  message: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id: documentId } = await params;
    const body = await req.json();
    const validated = signingRequestSchema.parse(body);

    const document = await prisma.document.findFirst({
      where: { id: documentId, ownerId: session.user.id, deletedAt: null },
    });

    if (!document) {
      return NextResponse.json({ error: "Dokumenti nuk u gjet" }, { status: 404 });
    }

    const expiresAt = validated.expiresInDays
      ? new Date(Date.now() + validated.expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create signing request
    const signingRequest = await prisma.signingRequest.create({
      data: {
        documentId,
        requesterId: session.user.id,
        recipientEmails: validated.signers.map((s) => s.email),
        message: validated.message,
        expiresAt,
      },
    });

    // Create signature entries for each signer
    const signatures = await Promise.all(
      validated.signers.map((signer) =>
        prisma.signature.create({
          data: {
            documentId,
            signerEmail: signer.email,
            signerName: signer.name,
            order: signer.order,
          },
        })
      )
    );

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PENDING_SIGNATURE" },
    });

    // Send email invitations
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.doc.al";
    for (const sig of signatures) {
      await sendSigningInvitation(
        sig.signerEmail,
        sig.signerName,
        document.title,
        `${baseUrl}/sign/${sig.token}`,
        session.user.name
      );
    }

    await prisma.auditLog.create({
      data: {
        action: "SIGNING_REQUEST_CREATED",
        entityType: "SigningRequest",
        entityId: signingRequest.id,
        userId: session.user.id,
        metadata: {
          documentId,
          signerCount: validated.signers.length,
          signerEmails: validated.signers.map((s) => s.email),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        signingRequest,
        signatures: signatures.map((s) => ({
          id: s.id,
          signerName: s.signerName,
          signerEmail: s.signerEmail,
          token: s.token,
          status: s.status,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
