import { logger } from "@/lib/logger";

export interface QuizAnswer {
  questionId: string;
  answer: string;
  markedForReview: boolean;
  timeSpent: number;
}

export interface AutoSaveData {
  attemptId: string;
  quizId: string;
  answers: Record<string, QuizAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  lastSaved: number;
}

export class QuizAutoSaveService {
  private static STORAGE_KEY_PREFIX = "quiz_autosave_";
  private static SAVE_INTERVAL = 30000; // 30 seconds
  private saveTimer: NodeJS.Timeout | null = null;
  private lastSaveTime = 0;
  private isSaving = false;

  constructor(private quizId: string, private attemptId: string) {}

  /**
   * Start auto-save with specified interval
   */
  startAutoSave(
    getData: () => Omit<AutoSaveData, "attemptId" | "quizId" | "lastSaved">,
    onSave?: (success: boolean) => void
  ): void {
    // Clear any existing timer
    this.stopAutoSave();

    // Initial save
    this.save(getData(), onSave);

    // Set up interval
    this.saveTimer = setInterval(() => {
      this.save(getData(), onSave);
    }, QuizAutoSaveService.SAVE_INTERVAL);

    logger.info("Auto-save started for quiz", { quizId: this.quizId });
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      logger.info("Auto-save stopped for quiz", { quizId: this.quizId });
    }
  }

  /**
   * Save quiz data to localStorage and server
   */
  async save(
    data: Omit<AutoSaveData, "attemptId" | "quizId" | "lastSaved">,
    onSave?: (success: boolean) => void
  ): Promise<void> {
    if (this.isSaving) {
      logger.debug("Auto-save already in progress, skipping");
      return;
    }

    this.isSaving = true;
    const saveData: AutoSaveData = {
      ...data,
      attemptId: this.attemptId,
      quizId: this.quizId,
      lastSaved: Date.now(),
    };

    try {
      // Save to localStorage first (instant)
      this.saveToLocalStorage(saveData);

      // Then save to server (async)
      const success = await this.saveToServer(saveData);
      
      if (success) {
        this.lastSaveTime = Date.now();
        logger.debug("Quiz auto-saved successfully", {
          quizId: this.quizId,
          answeredCount: Object.keys(saveData.answers).length,
        });
      }
      
      onSave?.(success);
    } catch (error) {
      logger.error("Auto-save failed", error);
      onSave?.(false);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Save to localStorage for quick recovery
   */
  private saveToLocalStorage(data: AutoSaveData): void {
    try {
      const key = `${QuizAutoSaveService.STORAGE_KEY_PREFIX}${this.attemptId}`;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to save to localStorage", error);
    }
  }

  /**
   * Save to server for persistent storage
   */
  private async saveToServer(data: AutoSaveData): Promise<boolean> {
    try {
      const response = await fetch(`/api/student/quiz/${this.quizId}/autosave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: data.attemptId,
          answers: Object.values(data.answers),
          currentQuestionIndex: data.currentQuestionIndex,
          timeRemaining: data.timeRemaining,
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error("Failed to save to server", error);
      return false;
    }
  }

  /**
   * Load saved quiz data
   */
  static loadSavedData(attemptId: string): AutoSaveData | null {
    try {
      const key = `${QuizAutoSaveService.STORAGE_KEY_PREFIX}${attemptId}`;
      const data = localStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data) as AutoSaveData;
      
      // Check if data is not too old (e.g., within last 24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - parsed.lastSaved > maxAge) {
        logger.info("Auto-save data too old, ignoring", {
          age: Date.now() - parsed.lastSaved,
        });
        return null;
      }
      
      return parsed;
    } catch (error) {
      logger.error("Failed to load saved data", error);
      return null;
    }
  }

  /**
   * Clear saved data after successful submission
   */
  static clearSavedData(attemptId: string): void {
    try {
      const key = `${QuizAutoSaveService.STORAGE_KEY_PREFIX}${attemptId}`;
      localStorage.removeItem(key);
      logger.debug("Cleared auto-save data", { attemptId });
    } catch (error) {
      logger.error("Failed to clear saved data", error);
    }
  }

  /**
   * Get all saved quiz attempts (for recovery UI)
   */
  static getAllSavedAttempts(): AutoSaveData[] {
    const attempts: AutoSaveData[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(QuizAutoSaveService.STORAGE_KEY_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              attempts.push(JSON.parse(data));
            } catch {
              // Invalid data, skip
            }
          }
        }
      }
    } catch (error) {
      logger.error("Failed to get saved attempts", error);
    }
    
    return attempts;
  }
}

/**
 * Hook for mobile detection
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "webos",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
  ];
  
  // Check user agent
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Check screen size
  const isMobileScreen = window.innerWidth <= 768;
  
  // Check touch support
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  
  return isMobileUA || (isMobileScreen && hasTouch);
}

/**
 * Get device info for debugging
 */
export function getDeviceInfo(): {
  isMobile: boolean;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  hasTouch: boolean;
  networkType?: string;
} {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      screenWidth: 0,
      screenHeight: 0,
      userAgent: "",
      hasTouch: false,
    };
  }

  const connection = (navigator as any).connection;
  
  return {
    isMobile: isMobileDevice(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: window.navigator.userAgent,
    hasTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    networkType: connection?.effectiveType,
  };
}