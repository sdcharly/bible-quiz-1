/**
 * Lightweight Diagnostics System
 * Captures only critical information without impacting performance
 */

export interface DiagnosticInfo {
  // Essential browser info (captured once)
  browser: string;
  os: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: string;
  
  // Critical metrics
  jsErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
  
  // Quiz-specific issues
  quizLoadTime: number;
  questionsLoaded: boolean;
  answersSubmitted: number;
  networkFailures: number;
  tabSwitches: number;
}

class LightweightDiagnostics {
  private diagnostics: DiagnosticInfo;
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
    this.diagnostics = {
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      deviceType: this.getDeviceType(),
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      jsErrors: [],
      quizLoadTime: 0,
      questionsLoaded: false,
      answersSubmitted: 0,
      networkFailures: 0,
      tabSwitches: 0,
    };
    
    // Only capture critical errors
    this.attachMinimalListeners();
  }
  
  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return `Chrome/${ua.match(/Chrome\/(\d+)/)?.[1]}`;
    if (ua.includes('Safari') && !ua.includes('Chrome')) return `Safari/${ua.match(/Version\/(\d+)/)?.[1]}`;
    if (ua.includes('Firefox')) return `Firefox/${ua.match(/Firefox\/(\d+)/)?.[1]}`;
    if (ua.includes('Samsung')) return 'Samsung Browser';
    return 'Unknown';
  }
  
  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    return 'Unknown';
  }
  
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  private attachMinimalListeners(): void {
    // Only track JavaScript errors
    window.addEventListener('error', (e) => {
      this.diagnostics.jsErrors.push({
        message: e.message,
        stack: e.error?.stack?.split('\n').slice(0, 3).join('\n'), // Only first 3 lines
        timestamp: Date.now(),
      });
      
      // Limit stored errors
      if (this.diagnostics.jsErrors.length > 5) {
        this.diagnostics.jsErrors.shift();
      }
    });
    
    // Track tab visibility changes (critical for mobile)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.diagnostics.tabSwitches++;
      }
    });
  }
  
  // Called when quiz loads
  public markQuizLoaded(): void {
    this.diagnostics.quizLoadTime = Date.now() - this.startTime;
  }
  
  // Called when questions render
  public markQuestionsLoaded(): void {
    this.diagnostics.questionsLoaded = true;
  }
  
  // Called when answer selected
  public markAnswerSubmitted(): void {
    this.diagnostics.answersSubmitted++;
  }
  
  // Called on network error
  public markNetworkFailure(): void {
    this.diagnostics.networkFailures++;
  }
  
  // Get diagnostic summary
  public getSummary(): DiagnosticInfo {
    return { ...this.diagnostics };
  }
  
  // Send only on error or completion
  public async sendDiagnostics(attemptId: string, trigger: 'error' | 'completion' | 'timeout'): Promise<void> {
    try {
      await fetch('/api/diagnostics/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          trigger,
          diagnostics: this.diagnostics,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Silently fail - don't impact user experience
    }
  }
}

export default LightweightDiagnostics;