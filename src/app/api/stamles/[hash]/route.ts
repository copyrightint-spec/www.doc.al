export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

const STAMLES_URL = process.env.STAMLES_API_URL || "http://stamles-app:3001";

/**
 * GET /api/stamles/{hash}
 * Proxy to STAMLES verify API - returns Polygon blockchain status for a hash.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    const res = await fetch(`${STAMLES_URL}/api/v1/verify?hash=${hash}`, {
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      verified: false,
      status: "UNAVAILABLE",
      message: "STAMLES service unavailable",
    });
  }
}
