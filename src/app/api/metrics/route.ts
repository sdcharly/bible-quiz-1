import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Force Node.js runtime for process.* access
export const runtime = 'nodejs';
// Ensure dynamic behavior (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * General metrics endpoint
 * Returns overall system health and performance metrics
 */
export async function GET(req: NextRequest) {
  try {
    // Check API key authentication
    const expected = process.env.METRICS_API_KEY;
    
    // Check if API key is properly configured
    if (!expected) {
      return NextResponse.json(
        { error: "Server configuration error: API key not configured" },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Vary": "x-api-key"
          }
        }
      );
    }
    
    // Validate the provided API key
    const provided = req.headers.get("x-api-key");
    if (provided !== expected) {
      return NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Vary": "x-api-key"
          }
        }
      );
    }
    
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
        'Expires': '0',
        'Vary': 'x-api-key'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}