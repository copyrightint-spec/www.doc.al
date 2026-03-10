import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey } from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        active: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: keys });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Emri eshte i detyrueshem" }, { status: 400 });
    }

    const rawKey = generateApiKey();
    const hashedKey = hashApiKey(rawKey);

    await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name,
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
    });

    // Return the raw key only once - it won't be shown again
    return NextResponse.json({
      success: true,
      data: { key: rawKey, name },
      message: "Ruajeni kete key - nuk do te shfaqet perseri!",
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
