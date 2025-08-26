/**
 * Session Middleware for Activity Tracking and Management
 * 
 * Handles:
 * - Activity tracking for all API routes
 * - Session validation and expiry checks
 * - Automatic session extension for active users
 * - Quiz session management
 * - Session cleanup triggers
 */

import { NextRequest, NextResponse } from 'next/server';

import {
  SESSION_CONFIG,
  SessionState,
  updateSessionActivity,
  calculateSessionState,
  extendSession,
  startQuizSession,
  endQuizSession,
  createSessionMetadata,
  sessionCache,
  getSessionConfig,
} from '@/lib/session-config';
import { logger } from '@/lib/logger';

// Routes that don't require session management
const PUBLIC_ROUTES = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/callback',
  '/api/health',
  '/api/public',
];

// Routes that require extended sessions
const QUIZ_ROUTES = [
  '/api/quiz/start',
  '/api/quiz/submit',
  '/api/quiz/answer',
  '/api/quiz/progress',
];

/**
 * Session middleware for API routes
 */
export async function withSessionMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return handler(request);
  }
  
  try {
    // Get session from auth using server-side auth
    const { auth } = await import('@/lib/auth');
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - No valid session' },
        { status: 401 }
      );
    }
    
    const sessionId = session.session?.id;
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
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        request.headers.get('user-agent') || undefined
      );
      
      cached = {
        metadata,
        lastChecked: Date.now(),
      };
      
      sessionCache.set(sessionId, cached);
    }
    
    // Get role-specific config
    const config = await getSessionConfig(role);
    
    // Calculate current session state
    const state = calculateSessionState(cached.metadata, config);
    
    // Check if session is expired
    if (state === SessionState.EXPIRED) {
      sessionCache.delete(sessionId);
      return NextResponse.json(
        { 
          error: 'Session expired',
          reason: 'inactivity',
          idleTime: Date.now() - cached.metadata.lastActivity,
        },
        { status: 401 }
      );
    }
    
    // Handle quiz routes
    if (QUIZ_ROUTES.some(route => pathname.startsWith(route))) {
      if (pathname.includes('/start')) {
        const quizId = request.nextUrl.searchParams.get('quizId');
        if (quizId) {
          await startQuizSession(sessionId, quizId);
        }
      } else if (pathname.includes('/submit')) {
        await endQuizSession(sessionId);
      }
    }
    
    // Update activity
    await updateSessionActivity(sessionId, 'api', {
      path: pathname,
      method: request.method,
    });
    
    // Check if session needs extension
    if (state === SessionState.WARNING || 
        (state === SessionState.QUIZ_ACTIVE && cached.metadata.extensions < SESSION_CONFIG.EXTENSION.MAX_EXTENSIONS)) {
      const extended = await extendSession(sessionId);
      if (extended) {
        logger.info('Session auto-extended', { sessionId, userId });
      }
    }
    
    // Add session info to response headers
    const response = await handler(request);
    
    // Add session headers
    response.headers.set('X-Session-State', state);
    response.headers.set('X-Session-Expires', String(cached.metadata.startTime + config.absoluteTimeout));
    response.headers.set('X-Session-Idle-Timeout', String(config.idleTimeout));
    
    // Add warning header if approaching timeout
    if (state === SessionState.WARNING) {
      const remaining = config.idleTimeout - (Date.now() - cached.metadata.lastActivity);
      response.headers.set('X-Session-Warning', String(remaining));
    }
    
    return response;
  } catch (error) {
    logger.error('Session middleware error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Client activity tracker middleware
 */
export function createActivityTracker() {
  let lastActivity = Date.now();
  let warningShown = false;
  let sessionCheckInterval: NodeJS.Timeout | null = null;
  
  const activityEvents = [
    'click',
    'scroll',
    'keypress',
    'mousemove',
    'touchstart',
    'focus',
  ];
  
  // Debounced activity handler
  let activityTimeout: NodeJS.Timeout | null = null;
  const handleActivity = () => {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }
    
    activityTimeout = setTimeout(() => {
      lastActivity = Date.now();
      warningShown = false;
      
      // Send heartbeat to server
      fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: lastActivity,
          path: window.location.pathname,
        }),
      }).catch(err => {
        logger.debug('Heartbeat failed:', err);
      });
    }, SESSION_CONFIG.ACTIVITY.DEBOUNCE_DELAY);
  };
  
  // Check session status
  const checkSession = async () => {
    try {
      const response = await fetch('/api/session/status');
      const data = await response.json();
      
      if (!response.ok || data.state === SessionState.EXPIRED) {
        // Session expired
        stopTracking();
        showSessionExpiredModal();
        return;
      }
      
      if (data.state === SessionState.WARNING && !warningShown) {
        warningShown = true;
        showSessionWarningModal(data.remaining);
      }
    } catch (error) {
      logger.debug('Session check failed:', error);
    }
  };
  
  // Start tracking
  const startTracking = () => {
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Start session check interval
    sessionCheckInterval = setInterval(
      checkSession,
      SESSION_CONFIG.ACTIVITY.CHECK_INTERVAL
    );
    
    // Initial heartbeat
    handleActivity();
  };
  
  // Stop tracking
  const stopTracking = () => {
    // Remove event listeners
    activityEvents.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
    
    // Clear intervals
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
    
    if (activityTimeout) {
      clearTimeout(activityTimeout);
      activityTimeout = null;
    }
  };
  
  return {
    start: startTracking,
    stop: stopTracking,
    getLastActivity: () => lastActivity,
  };
}

/**
 * Show session warning modal
 */
function showSessionWarningModal(remaining: number) {
  const minutes = Math.floor(remaining / 60000);
  const message = `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''} due to inactivity. Click anywhere to stay logged in.`;
  
  // Create toast or modal
  if (typeof window !== 'undefined' && window.document) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-amber-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p class="font-semibold">Session Expiring Soon</p>
          <p class="text-sm">${message}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 10000);
  }
}

/**
 * Show session expired modal
 */
function showSessionExpiredModal() {
  if (typeof window !== 'undefined' && window.document) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center gap-3 mb-4">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 class="text-xl font-bold text-gray-900">Session Expired</h2>
        </div>
        <p class="text-gray-600 mb-6">
          Your session has expired due to inactivity. Please log in again to continue.
        </p>
        <button 
          onclick="window.location.href='/login'"
          class="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Go to Login
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
}