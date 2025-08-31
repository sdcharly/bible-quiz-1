import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Force Node.js runtime for process.* access
export const runtime = 'nodejs';

/**
 * General metrics endpoint
 * Returns overall system health and performance metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Get basic system metrics
    const metrics = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        external: process.memoryUsage().external
      },
      // Add more metrics as needed
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}