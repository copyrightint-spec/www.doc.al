import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFileUrl } from "@/lib/s3";

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
    const presignedUrl = await getFileUrl(s3Key, 3600);
    return NextResponse.json({ url: presignedUrl });
  } catch {
    return NextResponse.json({ error: "Skedari nuk u gjet" }, { status: 404 });
  }
}
