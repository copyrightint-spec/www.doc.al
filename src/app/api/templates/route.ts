import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(
    z.object({
      type: z.enum(["signature", "date", "text", "checkbox", "dropdown", "file"]),
      label: z.string(),
      required: z.boolean().default(true),
      position: z.object({
        page: z.number().int().min(0),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      options: z.array(z.string()).optional(),
    })
  ),
  isPublic: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const templates = await prisma.signingTemplate.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch {
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
        fields: JSON.parse(JSON.stringify(validated.fields)),
        isPublic: validated.isPublic,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
