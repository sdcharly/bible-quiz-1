/**
 * Lightweight Quiz Diagnostics
 * Minimal performance impact - only tracks critical failures
 */

import { logger } from "@/lib/logger";

export interface QuizDiagnostic {
  // Essential info (captured once at start)
  browser: string;
  device: 'mobile' | 'tablet' | 'desktop';
  screenSize: string;
  
  // Critical checkpoints
  pageLoaded: boolean;
  quizLoaded: boolean;
  questionsVisible: boolean;
  canSelectAnswer: boolean;
  
  // Failure indicators
  jsErrors: number;
  networkErrors: number;
  timeouts: number;
  tabSwitches: number;
  
  // Timing (helps identify where it failed)
  loadTime?: number;
  firstInteractionTime?: number;
  lastActivityTime?: number;
}

class QuizDiagnostics {
  private diagnostic: QuizDiagnostic;
  private startTime: number;
  private hasError: boolean = false;
  
  constructor() {
    this.startTime = Date.now();
    
    // Check if we're in the browser before accessing window/document
    const isBrowser = typeof window !== 'undefined';
    
    this.diagnostic = {
      browser: isBrowser ? this.detectBrowser() : 'SSR',
      device: isBrowser ? this.detectDevice() : 'desktop',
      screenSize: isBrowser ? `${window.innerWidth}x${window.innerHeight}` : '0x0',
      pageLoaded: false,
      quizLoaded: false,
      questionsVisible: false,
      canSelectAnswer: false,
      jsErrors: 0,
      networkErrors: 0,
      timeouts: 0,
      tabSwitches: 0,
    };
    
    // Only track critical errors if in browser
    if (isBrowser) {
      this.attachMinimalListeners();
    }
  }
  
  private detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'SSR';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('SamsungBrowser')) return 'Samsung';
    return 'Other';
  }
  
  private detectDevice(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    const hasTouch = 'ontouchstart' in window;
    
    if (width < 768 && hasTouch) return 'mobile';
    if (width < 1024 && hasTouch) return 'tablet';
    return 'desktop';
  }
  
  private attachMinimalListeners(): void {
    // Track JS errors (but don't store details, just count)
    window.addEventListener('error', () => {
      this.diagnostic.jsErrors++;
      this.hasError = true;
    });
    
    // Track tab switches (critical for mobile issues)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.diagnostic.tabSwitches++;
      }
    });
    
    // Track network errors
    window.addEventListener('offline', () => {
      this.diagnostic.networkErrors++;
      this.hasError = true;
    });
  }
  
  // Checkpoint methods - called by quiz component
  public markPageLoaded(): void {
    this.diagnostic.pageLoaded = true;
    this.diagnostic.loadTime = Date.now() - this.startTime;
  }
  
  public markQuizLoaded(): void {
    this.diagnostic.quizLoaded = true;
  }
  
  public markQuestionsVisible(): void {
    this.diagnostic.questionsVisible = true;
  }
  
  public markCanInteract(): void {
    this.diagnostic.canSelectAnswer = true;
    if (!this.diagnostic.firstInteractionTime) {
      this.diagnostic.firstInteractionTime = Date.now() - this.startTime;
    }
  }
  
  public markActivity(): void {
    this.diagnostic.lastActivityTime = Date.now() - this.startTime;
  }
  
  public markTimeout(): void {
    this.diagnostic.timeouts++;
    this.hasError = true;
  }
  
  // Only send if there was a problem
  public async sendIfNeeded(attemptId: string, reason: 'timeout' | 'error' | 'abandoned'): Promise<void> {
    // Only send diagnostics if there was an actual problem
    if (!this.hasError && reason !== 'timeout' && reason !== 'abandoned') {
      return;
    }
    
    try {
      // Log locally for debugging
      logger.debug('Sending diagnostics', {
        attemptId,
        reason,
        diagnostic: this.diagnostic
      });
      
      // Send minimal payload
      await fetch('/api/diagnostics/lite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          reason,
          ...this.diagnostic,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Silently fail - don't impact user
    }
  }
  
  // Get summary for local logging
  public getSummary(): QuizDiagnostic {
    return { ...this.diagnostic };
  }
}

export default QuizDiagnostics;