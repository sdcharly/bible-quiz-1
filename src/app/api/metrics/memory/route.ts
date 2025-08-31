import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime for access to process.* and gc
export const runtime = 'nodejs';

// Disable caching to ensure fresh metrics on every request
export const dynamic = 'force-dynamic';

/**
 * Memory usage metrics endpoint
 * Monitors application memory consumption
 */
export async function GET(req: NextRequest) {
  try {
    // Check if GC is requested via query parameter
    const shouldRunGC = req.nextUrl.searchParams.get('gc') === '1';
    
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

    // Only run garbage collection if explicitly requested and GC is available
    if (shouldRunGC && (global as any).gc) {
      try {
        // Capture heap usage before GC
        const heapBeforeGC = process.memoryUsage().heapUsed;
        
        // Run garbage collection
        (global as any).gc();
        
        // Capture heap usage after GC
        const heapAfterGC = process.memoryUsage().heapUsed;
        
        // Calculate freed memory
        stats.gcExecuted = true;
        stats.freedBytes = Math.max(0, heapBeforeGC - heapAfterGC);
        stats.freedMB = Math.round(stats.freedBytes / 1024 / 1024);
      } catch (e) {
        stats.gcExecuted = false;
        stats.freedBytes = 0;
      }
    } else if (shouldRunGC) {
      // GC was requested but not available
      stats.gcExecuted = false;
      stats.freedBytes = 0;
      stats.gcNote = "GC requested but not available (requires --expose-gc flag)";
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch memory metrics' },
      { status: 500 }
    );
  }
}