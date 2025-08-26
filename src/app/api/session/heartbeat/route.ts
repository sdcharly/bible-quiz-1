import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSessionActivity } from '@/lib/session-config';
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
      logger.error('Invalid session data in heartbeat:', { 
        hasSessionId: !!sessionId, 
        hasUserId: !!userId 
      });
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { timestamp, path, isQuizActive } = body;
    
    // Update session activity
    await updateSessionActivity(sessionId, 'heartbeat', {
      timestamp,
      path,
      isQuizActive,
    });
    
    logger.debug('Heartbeat received', {
      sessionId,
      userId,
      path,
    });
    
    return NextResponse.json({
      success: true,
      sessionId,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}