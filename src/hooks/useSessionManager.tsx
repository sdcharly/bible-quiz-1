'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { SESSION_CONFIG, SessionState } from '@/lib/session-config-client';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui/use-toast';


interface SessionManagerOptions {
  enableWarnings?: boolean;
  enableAutoExtend?: boolean;
  onSessionExpired?: () => void;
  onSessionWarning?: (remaining: number) => void;
  isQuizActive?: boolean;
  quizId?: string;
}

export function useSessionManager(options: SessionManagerOptions = {}) {
  const {
    enableWarnings = true,
    enableAutoExtend = true,
    onSessionExpired,
    onSessionWarning,
    isQuizActive = false,
    quizId,
  } = options;

  const router = useRouter();
  const { data: session } = useSession() as { data: any };
  const { toast } = useToast();
  
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.ACTIVE);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const [extensions, setExtensions] = useState(0);
  
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get appropriate timeout based on user role and quiz state
  const getTimeout = useCallback(() => {
    if (isQuizActive) {
      return SESSION_CONFIG.QUIZ.ACTIVE_TIMEOUT;
    }
    
    const role = session?.user?.role || 'student';
    if (role === 'admin' || role === 'educator' || role === 'super_admin') {
      return SESSION_CONFIG.ADMIN.IDLE_TIMEOUT;
    }
    
    return SESSION_CONFIG.STUDENT.IDLE_TIMEOUT;
  }, [session, isQuizActive]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    // Debounce activity updates
    activityTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      setLastActivity(now);
      setWarningShown(false);
      
      // Reset session state if it was warning
      if (sessionState === SessionState.WARNING) {
        setSessionState(SessionState.ACTIVE);
      }
      
      logger.debug('Activity detected', {
        timestamp: now,
        path: window.location.pathname,
      });
    }, SESSION_CONFIG.ACTIVITY.DEBOUNCE_DELAY);
  }, [sessionState]);

  // Send heartbeat to server
  const sendHeartbeat = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: lastActivity,
          path: window.location.pathname,
          isQuizActive,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'Session expired') {
          handleSessionExpired();
        }
      }
    } catch (error) {
      logger.debug('Heartbeat failed:', error);
    }
  }, [session, lastActivity, isQuizActive]);

  // Check session status
  const checkSessionStatus = useCallback(async () => {
    if (!session?.user) return;
    
    const now = Date.now();
    const idleTime = now - lastActivity;
    const timeout = getTimeout();
    const warningTime = session?.user?.role === 'admin' 
      ? SESSION_CONFIG.ADMIN.WARNING_BEFORE
      : SESSION_CONFIG.STUDENT.WARNING_BEFORE;
    
    // Check if session expired
    if (idleTime > timeout) {
      handleSessionExpired();
      return;
    }
    
    // Check if should show warning
    if (idleTime > timeout - warningTime && !warningShown && enableWarnings) {
      const remaining = timeout - idleTime;
      setSessionState(SessionState.WARNING);
      setWarningShown(true);
      showWarning(remaining);
      
      if (onSessionWarning) {
        onSessionWarning(remaining);
      }
      
      // Auto-extend if enabled and not at max extensions
      if (enableAutoExtend && extensions < SESSION_CONFIG.EXTENSION.MAX_EXTENSIONS) {
        await extendSession();
      }
    } else if (idleTime < timeout - warningTime) {
      setSessionState(isQuizActive ? SessionState.QUIZ_ACTIVE : SessionState.ACTIVE);
    }
  }, [session, lastActivity, warningShown, extensions, enableWarnings, enableAutoExtend, getTimeout, onSessionWarning, isQuizActive]);

  // Extend session
  const extendSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setExtensions(prev => prev + 1);
        setWarningShown(false);
        setSessionState(SessionState.EXTENDED);
        
        toast({
          title: 'Session Extended',
          description: 'Your session has been extended for another 30 minutes.',
          duration: 3000,
        });
        
        logger.info('Session extended', { extensions: extensions + 1 });
      }
    } catch (error) {
      logger.error('Failed to extend session:', error);
    }
  }, [extensions, toast]);

  // Handle session expired
  const handleSessionExpired = useCallback(() => {
    setSessionState(SessionState.EXPIRED);
    
    // Clear all intervals
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Call custom handler if provided
    if (onSessionExpired) {
      onSessionExpired();
    } else {
      // Default behavior
      toast({
        title: 'Session Expired',
        description: 'Your session has expired due to inactivity. Please log in again.',
        variant: 'destructive',
        duration: 0, // Don't auto-dismiss
      });
      
      // Sign out and redirect after 3 seconds
      setTimeout(async () => {
        await signOut();
        router.push('/login');
      }, 3000);
    }
  }, [onSessionExpired, router, toast]);

  // Show warning toast
  const showWarning = useCallback((remaining: number) => {
    const minutes = Math.ceil(remaining / 60000);
    
    toast({
      title: 'Session Expiring Soon',
      description: `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''} due to inactivity. Click anywhere to stay logged in.`,
      variant: 'default',
      duration: 10000,
      className: 'bg-amber-50 border-amber-200',
    });
    
    // Set a timeout to show final warning
    if (remaining > 60000) {
      warningTimeoutRef.current = setTimeout(() => {
        toast({
          title: 'Final Warning',
          description: 'Your session will expire in less than 1 minute!',
          variant: 'destructive',
          duration: 0,
        });
      }, remaining - 60000);
    }
  }, [toast]);

  // Setup activity listeners
  useEffect(() => {
    if (!session?.user) return;
    
    const activityEvents = [
      'click',
      'scroll',
      'keypress',
      'mousemove',
      'touchstart',
      'focus',
    ];
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Start session check interval
    sessionCheckIntervalRef.current = setInterval(
      checkSessionStatus,
      SESSION_CONFIG.ACTIVITY.CHECK_INTERVAL
    );
    
    // Start heartbeat interval
    heartbeatIntervalRef.current = setInterval(
      sendHeartbeat,
      SESSION_CONFIG.ACTIVITY.HEARTBEAT_INTERVAL
    );
    
    // Initial activity
    handleActivity();
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [session, handleActivity, checkSessionStatus, sendHeartbeat]);

  // Quiz-specific handling
  useEffect(() => {
    if (isQuizActive && session?.user && quizId) {
      // Notify server about quiz session
      fetch('/api/session/quiz-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      }).catch(err => {
        logger.debug('Failed to start quiz session:', err);
      });
      
      return () => {
        // Notify server about quiz end
        fetch('/api/session/quiz-end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId }),
        }).catch(err => {
          logger.debug('Failed to end quiz session:', err);
        });
      };
    }
  }, [isQuizActive, session, quizId]);

  return {
    sessionState,
    lastActivity,
    extensions,
    remainingTime: getTimeout() - (Date.now() - lastActivity),
    isWarning: sessionState === SessionState.WARNING,
    isExpired: sessionState === SessionState.EXPIRED,
    isQuizActive,
    extendSession,
    resetActivity: handleActivity,
  };
}