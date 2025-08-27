import { useEffect, useRef, useCallback } from "react";
import { getTelemetry, QuizEventType } from "@/lib/telemetry";
import { logger } from "@/lib/logger";

interface UseTelemetryOptions {
  quizId?: string;
  attemptId?: string;
  userId?: string;
  enableAutoTracking?: boolean;
}

export function useTelemetry({
  quizId,
  attemptId,
  userId,
  enableAutoTracking = true,
}: UseTelemetryOptions = {}) {
  const telemetry = useRef(getTelemetry());
  const lastActivityTime = useRef(Date.now());
  const idleTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const pageLoadTime = useRef(Date.now());

  // Track page load
  useEffect(() => {
    if (!enableAutoTracking) return;

    telemetry.current.trackEvent({
      eventType: "page_load",
      quizId,
      attemptId,
      userId,
      metadata: {
        url: window.location.href,
        referrer: document.referrer,
        loadTime: Date.now() - pageLoadTime.current,
      },
    });

    // Track page unload
    return () => {
      telemetry.current.trackEvent({
        eventType: "page_unload",
        quizId,
        attemptId,
        userId,
        metadata: {
          timeOnPage: Date.now() - pageLoadTime.current,
        },
      });
    };
  }, [quizId, attemptId, userId, enableAutoTracking]);

  // Track user activity/idle
  useEffect(() => {
    if (!enableAutoTracking) return;

    const trackActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime.current;

      if (timeSinceLastActivity > 60000) {
        // User was idle for more than 1 minute
        telemetry.current.trackEvent({
          eventType: "user_idle",
          quizId,
          attemptId,
          metadata: {
            idleDuration: timeSinceLastActivity,
          },
        });
      }

      lastActivityTime.current = now;

      // Clear existing idle timer
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }

      // Set new idle timer for 5 minutes
      idleTimer.current = setTimeout(() => {
        telemetry.current.trackEvent({
          eventType: "user_idle",
          quizId,
          attemptId,
          metadata: {
            idleDuration: 300000, // 5 minutes
          },
        });
      }, 300000);
    };

    // Track various user activities
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, trackActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, trackActivity);
      });
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
    };
  }, [quizId, attemptId, enableAutoTracking]);

  // API call tracking wrapper
  const trackApiCall = useCallback(
    async <T,>(
      url: string,
      fetchFn: () => Promise<T>,
      metadata?: Record<string, any>
    ): Promise<T> => {
      const startTime = Date.now();
      
      telemetry.current.apiCall(url, "GET", "start");
      
      try {
        const result = await fetchFn();
        const duration = Date.now() - startTime;
        
        telemetry.current.apiCall(url, "GET", "success", duration);
        
        // Log slow API calls
        if (duration > 3000) {
          telemetry.current.trackEvent({
            eventType: "performance_slow_render",
            metadata: {
              url,
              duration,
              ...metadata,
            },
          });
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        telemetry.current.apiCall(
          url,
          "GET",
          "failure",
          duration,
          error instanceof Error ? error.message : "Unknown error"
        );
        throw error;
      }
    },
    []
  );

  // Quiz-specific tracking methods
  const trackQuizStart = useCallback(() => {
    if (!quizId || !attemptId) return;
    telemetry.current.quizStarted(quizId, attemptId);
  }, [quizId, attemptId]);

  const trackQuestionView = useCallback(
    (questionIndex: number) => {
      if (!quizId || !attemptId) return;
      telemetry.current.questionViewed(quizId, attemptId, questionIndex);
    },
    [quizId, attemptId]
  );

  const trackAnswerSelect = useCallback(
    (questionId: string, answer: string, timeSpent: number) => {
      if (!quizId || !attemptId) return;
      telemetry.current.answerSelected(quizId, attemptId, questionId, answer, timeSpent);
    },
    [quizId, attemptId]
  );

  const trackQuizSubmit = useCallback(
    (success: boolean, score?: number) => {
      if (!quizId || !attemptId) return;
      telemetry.current.quizSubmitted(quizId, attemptId, success, score);
    },
    [quizId, attemptId]
  );

  const trackCustomEvent = useCallback(
    (eventType: QuizEventType, metadata: Record<string, any>) => {
      telemetry.current.trackEvent({
        eventType,
        quizId,
        attemptId,
        userId,
        metadata,
      });
    },
    [quizId, attemptId, userId]
  );

  // Network monitoring
  useEffect(() => {
    if (!enableAutoTracking) return;

    const checkNetworkSpeed = () => {
      const connection = (navigator as any).connection;
      if (!connection) return;

      const isSlowConnection =
        connection.effectiveType === "slow-2g" ||
        connection.effectiveType === "2g" ||
        connection.rtt > 500;

      if (isSlowConnection) {
        telemetry.current.trackEvent({
          eventType: "network_slow",
          quizId,
          attemptId,
          metadata: {
            effectiveType: connection.effectiveType,
            rtt: connection.rtt,
            downlink: connection.downlink,
          },
        });
        
        logger.warn("Slow network detected", {
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
        });
      }
    };

    // Check on mount and periodically
    checkNetworkSpeed();
    const interval = setInterval(checkNetworkSpeed, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [quizId, attemptId, enableAutoTracking]);

  // Memory monitoring
  useEffect(() => {
    if (!enableAutoTracking) return;

    const checkMemory = () => {
      const nav = navigator as any;
      if (!nav.memory) return;

      const memoryUsage = nav.memory.usedJSHeapSize / nav.memory.jsHeapSizeLimit;
      
      if (memoryUsage > 0.8) {
        telemetry.current.trackEvent({
          eventType: "performance_memory_high",
          quizId,
          attemptId,
          metadata: {
            usedMemory: nav.memory.usedJSHeapSize,
            totalMemory: nav.memory.totalJSHeapSize,
            memoryLimit: nav.memory.jsHeapSizeLimit,
            usage: Math.round(memoryUsage * 100),
          },
        });
        
        logger.warn("High memory usage detected", {
          usage: `${Math.round(memoryUsage * 100)}%`,
        });
      }
    };

    const interval = setInterval(checkMemory, 60000); // Every minute
    return () => clearInterval(interval);
  }, [quizId, attemptId, enableAutoTracking]);

  return {
    telemetry: telemetry.current,
    trackApiCall,
    trackQuizStart,
    trackQuestionView,
    trackAnswerSelect,
    trackQuizSubmit,
    trackCustomEvent,
    sessionId: telemetry.current.getSessionId(),
    deviceInfo: telemetry.current.getDeviceInfo(),
  };
}