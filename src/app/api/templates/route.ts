import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJsonFields(template: any) {
  return {
    ...template,
    fields: typeof template.fields === "string" ? JSON.parse(template.fields) : template.fields,
    signerRoles: typeof template.signerRoles === "string" ? JSON.parse(template.signerRoles) : template.signerRoles,
  };
}

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  fields: z.array(
    z.object({
      type: z.enum(["signature", "stamp", "text", "date", "checkbox", "dropdown", "file", "initials"]),
      label: z.string(),
      required: z.boolean().default(true),
      position: z.object({
        page: z.number().int().min(0),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      assignedTo: z.string().optional(),
      options: z.array(z.string()).optional(),
    })
  ),
  signerRoles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
    })
  ).optional(),
  isPublic: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get("public") === "true";

    // Public templates endpoint - no auth required
    if (publicOnly) {
      const templates = await prisma.signingTemplate.findMany({
        where: { isPublic: true },
        include: {
          user: { select: { name: true } },
        },
        orderBy: { usageCount: "desc" },
      });
      return NextResponse.json({ success: true, data: templates.map(parseJsonFields) });
    }

    // User templates - auth required
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const templates = await prisma.signingTemplate.findMany({
      where: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: templates.map(parseJsonFields) });
  } catch (error) {
    console.error("Template API error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const body = await req.json();
    const validated = templateSchema.parse(body);

    const template = await prisma.signingTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        fields: JSON.parse(JSON.stringify(validated.fields)),
        signerRoles: validated.signerRoles ? JSON.parse(JSON.stringify(validated.signerRoles)) : undefined,
        isPublic: validated.isPublic,
        pdfmeTemplate: body.pdfmeTemplate
          ? (typeof body.pdfmeTemplate === "string" ? JSON.parse(body.pdfmeTemplate) : body.pdfmeTemplate)
          : undefined,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Template API error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
