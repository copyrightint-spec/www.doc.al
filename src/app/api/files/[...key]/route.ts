import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileBuffer } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Jo i autorizuar" }, { status: 401 });
  }

  const { key } = await params;
  const s3Key = key.join("/");

  // Security: users can only access their own files, admins can access all
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isOwnFile = s3Key.includes(session.user.id);

  if (!isAdmin && !isOwnFile) {
    return NextResponse.json({ error: "Nuk keni akses" }, { status: 403 });
  }

  try {
    const buffer = await getFileBuffer(s3Key);

    // Determine content type from file extension
    const ext = s3Key.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      gif: "image/gif",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Skedari nuk u gjet" }, { status: 404 });
  }
}
