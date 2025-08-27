/**
 * Comprehensive Telemetry System for Quiz Application
 * Captures detailed metrics for debugging and analysis
 */

import { logger } from "@/lib/logger";

export interface DeviceInfo {
  // Browser Information
  userAgent: string;
  browserName: string;
  browserVersion: string;
  browserEngine: string;
  
  // OS Information
  os: string;
  osVersion: string;
  platform: string;
  
  // Device Information
  deviceType: "mobile" | "tablet" | "desktop";
  deviceVendor: string;
  deviceModel: string;
  
  // Screen Information
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  orientation: string;
  
  // Capabilities
  touchEnabled: boolean;
  cookiesEnabled: boolean;
  onlineStatus: boolean;
  doNotTrack: boolean;
  
  // Performance
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
  
  // Network
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  
  // Timezone
  timezone: string;
  timezoneOffset: number;
  locale: string;
  
  // Feature Support
  features: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
    webGL: boolean;
    webRTC: boolean;
    notifications: boolean;
    serviceWorker: boolean;
    webAssembly: boolean;
  };
}

export interface QuizEvent {
  eventId: string;
  timestamp: number;
  eventType: QuizEventType;
  userId?: string;
  sessionId: string;
  quizId?: string;
  attemptId?: string;
  metadata: Record<string, any>;
  deviceInfo?: Partial<DeviceInfo>;
  performance?: PerformanceMetrics;
  errorInfo?: ErrorInfo;
}

export type QuizEventType = 
  // Page Events
  | "page_load"
  | "page_unload"
  | "page_visibility_change"
  | "page_focus"
  | "page_blur"
  | "page_refresh"
  | "page_back_button"
  
  // Quiz Events
  | "quiz_start"
  | "quiz_resume"
  | "quiz_question_view"
  | "quiz_answer_select"
  | "quiz_answer_change"
  | "quiz_navigation_next"
  | "quiz_navigation_prev"
  | "quiz_navigation_jump"
  | "quiz_mark_review"
  | "quiz_submit_attempt"
  | "quiz_submit_success"
  | "quiz_submit_failure"
  | "quiz_timeout"
  | "quiz_abandon"
  
  // Network Events
  | "network_online"
  | "network_offline"
  | "network_slow"
  | "api_call_start"
  | "api_call_success"
  | "api_call_failure"
  | "api_call_retry"
  
  // Save Events
  | "autosave_start"
  | "autosave_success"
  | "autosave_failure"
  | "manual_save"
  | "recovery_prompt"
  | "recovery_accept"
  | "recovery_reject"
  
  // Error Events
  | "error_javascript"
  | "error_network"
  | "error_timeout"
  | "error_validation"
  | "error_permission"
  | "error_unknown"
  
  // Performance Events
  | "performance_slow_render"
  | "performance_memory_high"
  | "performance_lag_detected"
  
  // User Actions
  | "user_idle"
  | "user_active"
  | "user_copy"
  | "user_paste"
  | "user_screenshot"
  | "user_tab_switch"
  | "user_app_switch";

export interface PerformanceMetrics {
  // Page Load Metrics
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  
  // Runtime Metrics
  jsHeapSize: number;
  domNodes: number;
  layoutCount: number;
  recalcStyleCount: number;
  
  // Network Metrics
  requestCount: number;
  totalRequestSize: number;
  totalResponseSize: number;
  
  // Frame Metrics
  fps: number;
  jank: number;
}

export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string;
  type: string;
  url?: string;
  line?: number;
  column?: number;
  userAgent: string;
  timestamp: number;
  additionalContext?: Record<string, any>;
}

class TelemetryService {
  private sessionId: string;
  private deviceInfo: DeviceInfo | null = null;
  private eventQueue: QuizEvent[] = [];
  private isOnline: boolean = true;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 100;
  private performanceObserver: PerformanceObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private metrics = {
    domNodes: 0,
    layoutCount: 0,
    recalcStyleCount: 0,
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    if (typeof window !== "undefined") {
      this.initializeDeviceInfo();
      this.attachEventListeners();
      this.startPerformanceMonitoring();
      this.startFlushTimer();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDeviceInfo(): void {
    const nav = navigator as any;
    const win = window as any;
    const screen = window.screen;
    
    // Parse User Agent
    const ua = nav.userAgent;
    const browserInfo = this.parseBrowser(ua);
    const osInfo = this.parseOS(ua);
    const deviceInfo = this.parseDevice(ua);
    
    this.deviceInfo = {
      // Browser
      userAgent: ua,
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      browserEngine: browserInfo.engine,
      
      // OS
      os: osInfo.name,
      osVersion: osInfo.version,
      platform: nav.platform || "Unknown",
      
      // Device
      deviceType: deviceInfo.type,
      deviceVendor: deviceInfo.vendor,
      deviceModel: deviceInfo.model,
      
      // Screen
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: win.innerWidth,
      viewportHeight: win.innerHeight,
      pixelRatio: win.devicePixelRatio || 1,
      orientation: screen.orientation?.type || "unknown",
      
      // Capabilities
      touchEnabled: "ontouchstart" in win || nav.maxTouchPoints > 0,
      cookiesEnabled: nav.cookieEnabled,
      onlineStatus: nav.onLine,
      doNotTrack: nav.doNotTrack === "1",
      
      // Performance
      memory: nav.memory ? {
        jsHeapSizeLimit: nav.memory.jsHeapSizeLimit,
        totalJSHeapSize: nav.memory.totalJSHeapSize,
        usedJSHeapSize: nav.memory.usedJSHeapSize,
      } : undefined,
      
      // Network
      connectionType: nav.connection?.type,
      effectiveType: nav.connection?.effectiveType,
      downlink: nav.connection?.downlink,
      rtt: nav.connection?.rtt,
      saveData: nav.connection?.saveData,
      
      // Timezone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: nav.language,
      
      // Features
      features: {
        localStorage: this.checkLocalStorage(),
        sessionStorage: this.checkSessionStorage(),
        indexedDB: "indexedDB" in win,
        webGL: this.checkWebGL(),
        webRTC: "RTCPeerConnection" in win,
        notifications: "Notification" in win,
        serviceWorker: "serviceWorker" in nav,
        webAssembly: "WebAssembly" in win,
      },
    };
  }

  private parseBrowser(ua: string): { name: string; version: string; engine: string } {
    const browsers = [
      { name: "Edge", pattern: /Edg\/(\d+)/ },
      { name: "Chrome", pattern: /Chrome\/(\d+)/ },
      { name: "Safari", pattern: /Version\/(\d+).*Safari/ },
      { name: "Firefox", pattern: /Firefox\/(\d+)/ },
      { name: "Opera", pattern: /OPR\/(\d+)/ },
      { name: "Samsung Browser", pattern: /SamsungBrowser\/(\d+)/ },
      { name: "UC Browser", pattern: /UCBrowser\/(\d+)/ },
    ];
    
    for (const browser of browsers) {
      const match = ua.match(browser.pattern);
      if (match) {
        const engine = ua.includes("WebKit") ? "WebKit" : 
                       ua.includes("Gecko") ? "Gecko" : 
                       ua.includes("Trident") ? "Trident" : "Unknown";
        return { name: browser.name, version: match[1], engine };
      }
    }
    
    return { name: "Unknown", version: "Unknown", engine: "Unknown" };
  }

  private parseOS(ua: string): { name: string; version: string } {
    const systems = [
      { name: "iOS", pattern: /OS (\d+)_(\d+)/, versionIndex: 0 },
      { name: "Android", pattern: /Android (\d+)/, versionIndex: 1 },
      { name: "Windows", pattern: /Windows NT (\d+\.\d+)/, versionIndex: 1 },
      { name: "Mac OS", pattern: /Mac OS X (\d+)[_.](\d+)/, versionIndex: 0 },
      { name: "Linux", pattern: /Linux/, versionIndex: 0 },
    ];
    
    for (const os of systems) {
      const match = ua.match(os.pattern);
      if (match) {
        const version = os.versionIndex > 0 ? match[os.versionIndex] : "Unknown";
        return { name: os.name, version };
      }
    }
    
    return { name: "Unknown", version: "Unknown" };
  }

  private parseDevice(ua: string): { type: "mobile" | "tablet" | "desktop"; vendor: string; model: string } {
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const isTablet = /Tablet|iPad/i.test(ua);
    
    let vendor = "Unknown";
    let model = "Unknown";
    
    if (/iPhone/.test(ua)) {
      vendor = "Apple";
      model = "iPhone";
    } else if (/iPad/.test(ua)) {
      vendor = "Apple";
      model = "iPad";
    } else if (/Samsung/.test(ua)) {
      vendor = "Samsung";
      const modelMatch = ua.match(/SM-[A-Z0-9]+/);
      model = modelMatch ? modelMatch[0] : "Galaxy";
    } else if (/Xiaomi|Redmi/.test(ua)) {
      vendor = "Xiaomi";
      model = /Redmi/.test(ua) ? "Redmi" : "Mi";
    } else if (/OnePlus/.test(ua)) {
      vendor = "OnePlus";
    } else if (/Pixel/.test(ua)) {
      vendor = "Google";
      model = "Pixel";
    }
    
    return {
      type: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
      vendor,
      model,
    };
  }

  private checkLocalStorage(): boolean {
    try {
      const test = "__telemetry_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private checkSessionStorage(): boolean {
    try {
      const test = "__telemetry_test__";
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private checkWebGL(): boolean {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch {
      return false;
    }
  }

  private attachEventListeners(): void {
    // Page visibility
    document.addEventListener("visibilitychange", () => {
      this.trackEvent({
        eventType: "page_visibility_change",
        metadata: {
          hidden: document.hidden,
          visibilityState: document.visibilityState,
        },
      });
    });

    // Focus events
    window.addEventListener("focus", () => {
      this.trackEvent({ eventType: "page_focus", metadata: {} });
    });

    window.addEventListener("blur", () => {
      this.trackEvent({ eventType: "page_blur", metadata: {} });
    });

    // Network events
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.trackEvent({ eventType: "network_online", metadata: {} });
      this.flushEvents(); // Try to send queued events
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.trackEvent({ eventType: "network_offline", metadata: {} });
    });

    // Unload event
    window.addEventListener("beforeunload", () => {
      this.trackEvent({ eventType: "page_unload", metadata: {} });
      this.flushEvents(true); // Force flush
    });

    // Error handling
    window.addEventListener("error", (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        type: "javascript",
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.trackError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: "promise_rejection",
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      });
    });

    // Detect back button
    window.addEventListener("popstate", () => {
      this.trackEvent({ eventType: "page_back_button", metadata: {} });
    });

    // Monitor network speed changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener("change", () => {
        this.trackEvent({
          eventType: "network_slow",
          metadata: {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData,
          },
        });
      });
    }

    // Detect tab switching (for mobile)
    let lastActivityTime = Date.now();
    setInterval(() => {
      const now = Date.now();
      if (now - lastActivityTime > 10000 && !document.hidden) {
        this.trackEvent({
          eventType: "user_app_switch",
          metadata: {
            awayDuration: now - lastActivityTime,
          },
        });
      }
      lastActivityTime = now;
    }, 5000);

    // Copy/Paste detection
    document.addEventListener("copy", () => {
      this.trackEvent({ eventType: "user_copy", metadata: {} });
    });

    document.addEventListener("paste", () => {
      this.trackEvent({ eventType: "user_paste", metadata: {} });
    });

    // Detect screenshot attempts (limited capability)
    document.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        this.trackEvent({ eventType: "user_screenshot", metadata: {} });
      }
    });
  }

  private startPerformanceMonitoring(): void {
    // Monitor Performance entries
    if ("PerformanceObserver" in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "measure" || entry.entryType === "navigation") {
            this.trackPerformance();
          }
        }
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ["measure", "navigation", "resource", "paint", "largest-contentful-paint"] 
      });
    }

    // Monitor DOM mutations for performance
    this.mutationObserver = new MutationObserver(() => {
      this.metrics.domNodes = document.getElementsByTagName("*").length;
      
      // Detect excessive DOM changes
      if (this.metrics.domNodes > 5000) {
        this.trackEvent({
          eventType: "performance_slow_render",
          metadata: {
            domNodes: this.metrics.domNodes,
          },
        });
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Monitor memory usage
    setInterval(() => {
      const nav = navigator as any;
      if (nav.memory) {
        const usedMemoryRatio = nav.memory.usedJSHeapSize / nav.memory.jsHeapSizeLimit;
        if (usedMemoryRatio > 0.9) {
          this.trackEvent({
            eventType: "performance_memory_high",
            metadata: {
              usedMemory: nav.memory.usedJSHeapSize,
              memoryLimit: nav.memory.jsHeapSizeLimit,
              ratio: usedMemoryRatio,
            },
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private trackPerformance(): void {
    const perfData: Partial<PerformanceMetrics> = {};
    
    // Get navigation timing
    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    if (navTiming) {
      perfData.domContentLoaded = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
      perfData.loadComplete = navTiming.loadEventEnd - navTiming.loadEventStart;
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType("paint");
    paintEntries.forEach((entry) => {
      if (entry.name === "first-paint") {
        perfData.firstPaint = entry.startTime;
      } else if (entry.name === "first-contentful-paint") {
        perfData.firstContentfulPaint = entry.startTime;
      }
    });

    // Get LCP
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      perfData.largestContentfulPaint = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Get current metrics
    perfData.jsHeapSize = (navigator as any).memory?.usedJSHeapSize || 0;
    perfData.domNodes = document.getElementsByTagName("*").length;

    // Store for later use
    this.metrics = {
      ...this.metrics,
      domNodes: perfData.domNodes,
    };
  }

  public trackEvent(event: Partial<QuizEvent>): void {
    const fullEvent: QuizEvent = {
      eventId: this.generateEventId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      eventType: event.eventType || "error_unknown",
      metadata: event.metadata || {},
      deviceInfo: this.deviceInfo || undefined,
      ...event,
    };

    this.eventQueue.push(fullEvent);
    
    // Log locally for debugging
    logger.debug("Telemetry Event", fullEvent);

    // Flush if queue is getting large
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flushEvents();
    }
  }

  public trackError(error: ErrorInfo): void {
    this.trackEvent({
      eventType: `error_${error.type}` as QuizEventType,
      errorInfo: error,
      metadata: {
        url: window.location.href,
        timestamp: error.timestamp,
      },
    });
  }

  public trackQuizEvent(
    eventType: QuizEventType,
    quizId: string,
    attemptId: string,
    metadata: Record<string, any> = {}
  ): void {
    this.trackEvent({
      eventType,
      quizId,
      attemptId,
      metadata: {
        ...metadata,
        timestamp: Date.now(),
        url: window.location.href,
      },
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.FLUSH_INTERVAL);
  }

  private async flushEvents(force = false): Promise<void> {
    if (!force && (!this.isOnline || this.eventQueue.length === 0)) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch("/api/telemetry/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
        }),
      });

      if (!response.ok && !force) {
        // Put events back in queue if send failed
        this.eventQueue.unshift(...eventsToSend);
      }
    } catch (error) {
      if (!force) {
        // Put events back in queue if send failed
        this.eventQueue.unshift(...eventsToSend);
      }
      logger.error("Failed to send telemetry", error);
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.flushEvents(true);
  }

  // Public API for tracking specific quiz events
  public quizStarted(quizId: string, attemptId: string): void {
    this.trackQuizEvent("quiz_start", quizId, attemptId);
  }

  public questionViewed(quizId: string, attemptId: string, questionIndex: number): void {
    this.trackQuizEvent("quiz_question_view", quizId, attemptId, { questionIndex });
  }

  public answerSelected(
    quizId: string,
    attemptId: string,
    questionId: string,
    answer: string,
    timeSpent: number
  ): void {
    this.trackQuizEvent("quiz_answer_select", quizId, attemptId, {
      questionId,
      answer,
      timeSpent,
    });
  }

  public quizSubmitted(
    quizId: string,
    attemptId: string,
    success: boolean,
    score?: number
  ): void {
    this.trackQuizEvent(
      success ? "quiz_submit_success" : "quiz_submit_failure",
      quizId,
      attemptId,
      { score }
    );
  }

  public apiCall(
    url: string,
    method: string,
    status: "start" | "success" | "failure",
    duration?: number,
    error?: string
  ): void {
    this.trackEvent({
      eventType: `api_call_${status}`,
      metadata: {
        url,
        method,
        duration,
        error,
      },
    });
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }
}

// Singleton instance
let telemetryInstance: TelemetryService | null = null;

export function getTelemetry(): TelemetryService {
  if (!telemetryInstance && typeof window !== "undefined") {
    telemetryInstance = new TelemetryService();
  }
  return telemetryInstance!;
}

export default TelemetryService;