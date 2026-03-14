import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    console.log("[legal-bases] session:", session?.user?.email || "NO SESSION");

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const legalBases = await prisma.legalBasis.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        lawReference: true,
        description: true,
        suggestedTerms: true,
        category: true,
      },
    });

    console.log("[legal-bases] found:", legalBases.length);
    return NextResponse.json({ success: true, data: legalBases });
  } catch (error) {
    console.error("[legal-bases] GET error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
