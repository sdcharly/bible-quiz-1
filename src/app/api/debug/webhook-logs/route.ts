import { NextRequest, NextResponse } from "next/server";
import { debugLogger } from "@/lib/debug-logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    // Get session - only allow educators to view logs
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || (session.user.role !== 'educator' && session.user.role !== 'pending_educator')) {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const clear = searchParams.get('clear') === 'true';

    if (clear) {
      debugLogger.clearLogs();
      return NextResponse.json({
        message: "Logs cleared",
        logs: []
      });
    }

    const logs = debugLogger.getLogs(limit);

    return NextResponse.json({
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching debug logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}