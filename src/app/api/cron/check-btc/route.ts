import { NextRequest, NextResponse } from "next/server";
import { checkPendingConfirmations } from "@/lib/timestamp/opentimestamps";

// Cron endpoint to check pending BTC confirmations
// Should be called every 10 minutes
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Jo i autorizuar" },
        { status: 401 }
      );
    }

    const result = await checkPendingConfirmations();

    return NextResponse.json({
      success: true,
      data: {
        checked: result.checked,
        confirmed: result.confirmed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Ndodhi nje gabim" },
      { status: 500 }
    );
  }
}
