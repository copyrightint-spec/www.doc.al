import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.signingTemplate.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
          ...(session.user.organizationId
            ? [{ organizationId: session.user.organizationId }]
            : []),
        ],
      },
      include: {
        user: { select: { name: true } },
        organization: { select: { id: true, name: true, logo: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template nuk u gjet" },
        { status: 404 }
      );
    }

    // Ensure JSON fields are parsed (they may be stored as strings)
    const parsed = {
      ...template,
      fields: typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields,
      signerRoles: typeof template.signerRoles === "string" ? JSON.parse(template.signerRoles) : template.signerRoles,
    };

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Template API error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.signingTemplate.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template nuk u gjet ose nuk keni te drejta" }, { status: 404 });
    }

    const body = await req.json();

    const updated = await prisma.signingTemplate.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description,
        category: body.category,
        fields: body.fields ? JSON.parse(JSON.stringify(body.fields)) : undefined,
        signerRoles: body.signerRoles ? JSON.parse(JSON.stringify(body.signerRoles)) : undefined,
        isPublic: body.isPublic ?? existing.isPublic,
        pdfmeTemplate: body.pdfmeTemplate
          ? (typeof body.pdfmeTemplate === "string" ? JSON.parse(body.pdfmeTemplate) : body.pdfmeTemplate)
          : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Template API error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
