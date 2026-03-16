import { NextResponse } from "next/server";

// DEBUG endpoint - remove after testing
export async function GET() {
  return NextResponse.json({
    buildTime: process.env.BUILD_TIME || "unknown",
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    version: "v2-selfsign-41a2332",
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
}
