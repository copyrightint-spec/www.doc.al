import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const formData = await req.formData();

    // Extract text fields
    const fullName = formData.get("fullName") as string | null;
    const dateOfBirth = formData.get("dateOfBirth") as string | null;
    const idNumber = formData.get("idNumber") as string | null;
    const nationality = formData.get("nationality") as string | null;
    const address = formData.get("address") as string | null;
    const city = formData.get("city") as string | null;
    const phone = formData.get("phone") as string | null;
    const documentType = formData.get("documentType") as string | null;

    // Validate required fields
    if (!fullName || !dateOfBirth || !idNumber || !address || !city || !phone) {
      return NextResponse.json(
        { error: "Te gjitha fushat e detyrueshme duhet te plotesohen" },
        { status: 400 }
      );
    }

    // Extract files
    const frontDocument = formData.get("frontDocument") as File | null;
    const backDocument = formData.get("backDocument") as File | null;
    const selfie = formData.get("selfie") as File | null;

    if (!frontDocument) {
      return NextResponse.json(
        { error: "Foto e perparme e dokumentit eshte e detyrueshme" },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const imageOnlyTypes = ["image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(frontDocument.type)) {
      return NextResponse.json(
        { error: "Tipi i skedarit nuk lejohet per foton e perparme. Perdorni JPG, PNG, ose PDF." },
        { status: 400 }
      );
    }
    if (frontDocument.size > maxSize) {
      return NextResponse.json(
        { error: "Foto e perparme nuk duhet te kaloje 10MB" },
        { status: 400 }
      );
    }

    if (backDocument) {
      if (!allowedTypes.includes(backDocument.type)) {
        return NextResponse.json(
          { error: "Tipi i skedarit nuk lejohet per foton e pasme. Perdorni JPG, PNG, ose PDF." },
          { status: 400 }
        );
      }
      if (backDocument.size > maxSize) {
        return NextResponse.json(
          { error: "Foto e pasme nuk duhet te kaloje 10MB" },
          { status: 400 }
        );
      }
    }

    if (selfie) {
      if (!imageOnlyTypes.includes(selfie.type)) {
        return NextResponse.json(
          { error: "Selfie duhet te jete JPG ose PNG." },
          { status: 400 }
        );
      }
      if (selfie.size > maxSize) {
        return NextResponse.json(
          { error: "Selfie nuk duhet te kaloje 10MB" },
          { status: 400 }
        );
      }
    }

    // Save files to private storage (NOT public directory)
    const fs = await import("fs/promises");
    const path = await import("path");
    const crypto = await import("crypto");
    const userId = session.user.id;
    const uploadDir = path.join(process.cwd(), "storage", "kyc", userId);
    await fs.mkdir(uploadDir, { recursive: true });

    async function saveFile(file: File, prefix: string): Promise<string> {
      const ext = file.name.split(".").pop() || "jpg";
      // Use random name to prevent enumeration
      const randomId = crypto.randomBytes(16).toString("hex");
      const safeName = `${prefix}_${randomId}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(uploadDir, safeName);
      await fs.writeFile(filePath, buffer);
      // Return internal path (served via authenticated API, not public)
      return `/api/settings/kyc/file/${userId}/${safeName}`;
    }

    const frontUrl = await saveFile(frontDocument, "front");
    const backUrl = backDocument ? await saveFile(backDocument, "back") : null;
    const selfieUrl = selfie ? await saveFile(selfie, "selfie") : null;

    // Build KYC metadata
    const kycMetadata = {
      fullName,
      dateOfBirth,
      idNumber,
      nationality: nationality || "Shqiptar",
      address,
      city,
      phone,
      documentType: documentType || "Karte Identiteti",
      frontDocumentUrl: frontUrl,
      backDocumentUrl: backUrl,
      selfieUrl: selfieUrl,
      submittedAt: new Date().toISOString(),
    };

    // Update user record — KYC data is retained for security until account closure
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: fullName,
        phone,
        kycDocumentUrl: frontUrl,
        kycStatus: "PENDING",
        kycMetadata,
      },
    });

    // Audit log for KYC submission
    await prisma.auditLog.create({
      data: {
        action: "KYC_SUBMITTED",
        entityType: "User",
        entityId: userId,
        userId,
        metadata: { documentType: documentType || "Karte Identiteti", hasBackDocument: !!backDocument, hasSelfie: !!selfie },
      },
    });

    return NextResponse.json({
      message: "Dokumentat u ngarkuan. KYC eshte ne pritje verifikimi nga administratori.",
    });
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}

// DELETE - Explicitly blocked: KYC data must be retained for security
export async function DELETE() {
  return NextResponse.json(
    { error: "Te dhenat e KYC nuk mund te fshihen per arsye sigurie. Ato ruhen deri ne mbylljen e llogarise." },
    { status: 403 }
  );
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        kycStatus: true,
        kycDocumentUrl: true,
        kycMetadata: true,
        kycVerifiedAt: true,
        phone: true,
        name: true,
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Ndodhi nje gabim" }, { status: 500 });
  }
}
