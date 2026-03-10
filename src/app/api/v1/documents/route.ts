import { NextRequest } from "next/server";
import { authenticateApiKey, apiError, apiSuccess } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { computeSHA256 } from "@/lib/timestamp/engine";

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return apiError(auth.error!, 401);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;

    if (!file) return apiError("File eshte i detyrueshem", 400);
    if (file.type !== "application/pdf") return apiError("Vetem PDF lejohet", 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = computeSHA256(buffer);
    const fileUrl = `/uploads/api/${auth.userId}/${file.name}`;

    const document = await prisma.document.create({
      data: {
        title: title || file.name,
        fileName: file.name,
        fileHash,
        fileUrl,
        fileSize: file.size,
        ownerId: auth.userId!,
        organizationId: auth.organizationId,
      },
    });

    return apiSuccess({
      id: document.id,
      title: document.title,
      fileHash: document.fileHash,
      status: document.status,
      createdAt: document.createdAt,
    }, 201);
  } catch {
    return apiError("Gabim ne server", 500);
  }
}
