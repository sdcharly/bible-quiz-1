import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions, getSessionStats } from '@/lib/session-config';
import { logger } from '@/lib/logger';


// This should be called by a cron job every 10 minutes
// Can be configured in Vercel or your hosting provider
// Or use a service like cron-job.org

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get current session stats before cleanup
    const statsBefore = await getSessionStats();
    
    // Perform cleanup
    const cleanedCount = await cleanupExpiredSessions();
    
    // Get session stats after cleanup
    const statsAfter = await getSessionStats();
    
    logger.info('Session cleanup completed', {
      cleanedCount,
      statsBefore,
      statsAfter,
    });
    
    return NextResponse.json({
      success: true,
      cleanedCount,
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Session cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}