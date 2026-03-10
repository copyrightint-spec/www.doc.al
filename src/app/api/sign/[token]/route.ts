import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const signature = await prisma.signature.findUnique({
      where: { token },
      include: {
        document: { select: { id: true, title: true, fileName: true } },
      },
    });

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Link i pavlefshem ose i skaduar" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: signature.id,
        signerName: signature.signerName,
        signerEmail: signature.signerEmail,
        status: signature.status,
        document: signature.document,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
