import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { extendSession } from '@/lib/session-config';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session || !session.session || !session.user) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
    
    const sessionId = session.session.id;
    const userId = session.user.id;
    
    if (!sessionId || !userId) {
      logger.error('Invalid session data in extend:', { 
        hasSessionId: !!sessionId, 
        hasUserId: !!userId 
      });
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 401 }
      );
    }
    
    // Extend session
    const extended = await extendSession(sessionId);
    
    if (!extended) {
      return NextResponse.json(
        { error: 'Cannot extend session - maximum extensions reached or session expired' },
        { status: 400 }
      );
    }
    
    logger.info('Session extended via API', {
      sessionId,
      userId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Session extended successfully',
      newExpiry: Date.now() + (30 * 60 * 1000), // 30 minutes from now
    });
  } catch (error) {
    logger.error('Session extend error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}