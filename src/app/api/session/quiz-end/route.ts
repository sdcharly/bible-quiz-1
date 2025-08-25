import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { endQuizSession } from '@/lib/session-config';
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
      logger.error('Invalid session data in quiz-end:', { 
        hasSessionId: !!sessionId, 
        hasUserId: !!userId 
      });
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 401 }
      );
    }
    
    // End quiz session
    await endQuizSession(sessionId);
    
    logger.info('Quiz session ended', {
      sessionId,
      userId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Quiz session ended',
      normalTimeout: 30 * 60 * 1000, // Back to 30 minutes
    });
  } catch (error) {
    logger.error('Quiz end error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}