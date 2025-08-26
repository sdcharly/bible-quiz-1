import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { startQuizSession } from '@/lib/session-config';
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
    
    // Extract session data with additional null checks
    const sessionId = session.session.id;
    const userId = session.user.id;
    
    if (!sessionId || !userId) {
      logger.error('Invalid session data:', { 
        hasSessionId: !!sessionId, 
        hasUserId: !!userId,
        sessionData: session 
      });
      return NextResponse.json(
        { error: 'Invalid session data' },
        { status: 401 }
      );
    }
    
    // Parse request body with error handling
    let body;
    try {
      const text = await request.text();
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'Request body required' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      logger.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { quizId } = body;
    
    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID required' },
        { status: 400 }
      );
    }
    
    // Start quiz session
    await startQuizSession(sessionId, quizId);
    
    logger.info('Quiz session started', {
      sessionId,
      userId,
      quizId,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Quiz session started',
      quizId,
      extendedTimeout: 3 * 60 * 60 * 1000, // 3 hours
    });
  } catch (error) {
    logger.error('Quiz start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}