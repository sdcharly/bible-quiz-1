import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  SESSION_CONFIG,
  calculateSessionState, 
  getSessionConfig, 
  sessionCache,
  createSessionMetadata,
} from '@/lib/session-config';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session || !session.session) {
      return NextResponse.json(
        { error: 'No session found', state: 'expired' },
        { status: 401 }
      );
    }
    
    const sessionId = session.session.id;
    const userId = session.user.id;
    const email = session.user.email || '';
    const role = session.user.role || 'student';
    
    // Get or create session metadata
    let cached = sessionCache.get(sessionId);
    if (!cached) {
      const metadata = createSessionMetadata(
        userId,
        email,
        role,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      );
      
      cached = {
        metadata,
        lastChecked: Date.now(),
      };
      
      sessionCache.set(sessionId, cached);
    }
    
    // Get role-specific config
    const rawConfig = await getSessionConfig(role);
    
    // Ensure config has the required properties
    const config = {
      idleTimeout: (rawConfig as any).idleTimeout || SESSION_CONFIG.STUDENT.IDLE_TIMEOUT,
      absoluteTimeout: (rawConfig as any).absoluteTimeout || SESSION_CONFIG.STUDENT.ABSOLUTE_TIMEOUT,
      warningBefore: (rawConfig as any).warningBefore || SESSION_CONFIG.STUDENT.WARNING_BEFORE,
    };
    
    // Calculate current session state
    const state = calculateSessionState(cached.metadata, config);
    
    // Calculate remaining time
    const now = Date.now();
    const idleTime = now - cached.metadata.lastActivity;
    const remaining = config.idleTimeout - idleTime;
    const absoluteRemaining = config.absoluteTimeout - (now - cached.metadata.startTime);
    
    return NextResponse.json({
      state,
      remaining: Math.min(remaining, absoluteRemaining),
      idleTime,
      extensions: cached.metadata.extensions,
      maxExtensions: 3,
      sessionStart: cached.metadata.startTime,
      lastActivity: cached.metadata.lastActivity,
      role,
      quizActive: !!cached.metadata.quizId,
    });
  } catch (error) {
    logger.error('Session status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', state: 'unknown' },
      { status: 500 }
    );
  }
}