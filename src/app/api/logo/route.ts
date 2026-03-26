import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let logoBuffer: Buffer | null = null;

export async function GET() {
  if (!logoBuffer) {
    try {
      const logoPath = path.join(process.cwd(), "public", "docal-icon.png");
      logoBuffer = fs.readFileSync(logoPath);
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  return new NextResponse(new Uint8Array(logoBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
