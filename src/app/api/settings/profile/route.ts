import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        kycStatus: true,
        totpEnabled: true,
        emailVerified: true,
        preferredNotificationChannel: true,
        createdAt: true,
        password: true,
        organization: {
          select: { name: true },
        },
        certificates: {
          where: {
            revoked: false,
            validTo: { gte: new Date() },
          },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Perdoruesi nuk u gjet" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      kycStatus: user.kycStatus,
      totpEnabled: user.totpEnabled,
      emailVerified: user.emailVerified,
      preferredNotificationChannel: user.preferredNotificationChannel,
      createdAt: user.createdAt,
      organizationName: user.organization?.name || null,
      hasCertificate: user.certificates.length > 0,
      hasPassword: !!user.password,
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = ["name", "phone", "preferredNotificationChannel"];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Asnje fushe per te ndryshuar" },
        { status: 400 }
      );
    }

    // Validate notification channel
    if (updateData.preferredNotificationChannel) {
      const validChannels = ["EMAIL", "SMS", "SMS_VOICE"];
      if (!validChannels.includes(updateData.preferredNotificationChannel)) {
        return NextResponse.json(
          { error: "Kanali i njoftimeve nuk eshte i vlefshem" },
          { status: 400 }
        );
      }
    }

    // Validate name
    if (updateData.name !== undefined && (!updateData.name || updateData.name.trim().length < 2)) {
      return NextResponse.json(
        { error: "Emri duhet te kete te pakten 2 karaktere" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({ message: "Profili u perditesua me sukses" });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
