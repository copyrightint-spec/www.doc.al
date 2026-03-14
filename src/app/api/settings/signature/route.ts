import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    // First try simple query without relations to isolate issues
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        signatureData: true,
        signatureStyle: true,
        signatureTitle: true,
        image: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
    }

    // Try to get organization name separately
    let orgName: string | null = null;
    if (user.organizationId) {
      try {
        const org = await prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { name: true },
        });
        orgName = org?.name || null;
      } catch (e) {
        console.error("[signature/GET] org query error:", e);
      }
    }

    // Try to get certificate separately
    let certificate = null;
    try {
      const certs = await prisma.certificate.findMany({
        where: {
          userId: session.user.id,
          validTo: { gt: new Date() },
          revokedAt: null,
        },
        select: { serialNumber: true, subjectDN: true, issuerDN: true, validFrom: true, validTo: true },
        take: 1,
        orderBy: { validTo: "desc" },
      });
      certificate = certs[0] || null;
    } catch (e) {
      console.error("[signature/GET] cert query error:", e);
    }

    let signatureData = user.signatureData;
    if (typeof signatureData === "string") {
      try {
        signatureData = JSON.parse(signatureData);
      } catch {
        signatureData = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        signatureData,
        signatureStyle: user.signatureStyle || "text",
        signatureTitle: user.signatureTitle || "",
        image: user.image,
        organization: orgName,
        certificate,
      },
    });
  } catch (e) {
    console.error("[signature/GET] error:", e);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const body = await req.json();
    const { signatureData, signatureStyle, signatureTitle } = body;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        signatureData: signatureData ? JSON.parse(JSON.stringify(signatureData)) : undefined,
        signatureStyle: signatureStyle || undefined,
        signatureTitle: signatureTitle !== undefined ? signatureTitle : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[signature/PUT] error:", e);
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
