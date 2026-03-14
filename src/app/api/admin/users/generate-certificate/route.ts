import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUserCertificate } from "@/lib/crypto/certificates";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized - Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, validityYears, type } = body as {
      userId: string;
      validityYears?: number;
      type?: "PERSONAL" | "ORGANIZATION";
    };

    if (!userId) {
      return NextResponse.json({ error: "userId eshte i detyrueshem" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        kycStatus: true,
        organization: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
    }

    if (user.kycStatus !== "VERIFIED") {
      return NextResponse.json(
        { error: "Perdoruesi duhet te kete KYC te verifikuar" },
        { status: 400 }
      );
    }

    const result = await generateUserCertificate(userId, {
      commonName: user.name,
      organization: user.organization?.name,
      country: "AL",
      validityYears: validityYears || 2,
      type: type || "PERSONAL",
    });

    await prisma.auditLog.create({
      data: {
        action: "CERTIFICATE_GENERATED",
        entityType: "Certificate",
        entityId: result.certificateId,
        userId: session.user.id,
        metadata: {
          targetUserId: userId,
          targetUserEmail: user.email,
          generatedBy: session.user.email || session.user.id,
          type: type || "PERSONAL",
          validityYears: validityYears || 2,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          certificateId: result.certificateId,
          serialNumber: result.serialNumber,
          userId: userId,
          userEmail: user.email,
          userName: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: "Ndodhi nje gabim gjate gjenerimit te certifikates" }, { status: 500 });
  }
}
