import { NextRequest, NextResponse } from "next/server";

/**
 * Memory usage metrics endpoint
 * Monitors application memory consumption
 */
export async function GET(req: NextRequest) {
  try {
    const memoryUsage = process.memoryUsage();
    
    const stats: any = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      rss: memoryUsage.rss,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      timestamp: new Date().toISOString()
    };

    // Add garbage collection stats if available
    if ((global as any).gc) {
      try {
        (global as any).gc();
        stats.gcExecuted = true;
      } catch (e) {
        stats.gcExecuted = false;
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch memory metrics' },
      { status: 500 }
    );
  }
}