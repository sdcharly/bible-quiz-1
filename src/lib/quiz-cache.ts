/**
 * Quiz Cache Module
 * 
 * Optimized caching layer for quiz operations using Redis/Upstash
 * Designed to handle 100+ concurrent students efficiently
 */

import { redisClient } from "./redis";
import { logger } from "./logger";


// Cache key prefixes
const CACHE_KEYS = {
  QUIZ_DATA: "quiz:data:",           // Full quiz with questions
  QUIZ_META: "quiz:meta:",           // Quiz metadata only
  ATTEMPT: "attempt:",               // Active quiz attempts
  SESSION: "session:quiz:",          // Quiz session data
  STUDENT_PROGRESS: "progress:",     // Student progress tracking
  ENROLLMENT: "enrollment:",         // Enrollment cache
  LEADERBOARD: "leaderboard:",      // Quiz leaderboard
  QUESTION_BANK: "questions:",      // Question bank cache
} as const;

// Cache TTL settings (in seconds)
const TTL = {
  QUIZ_DATA: 3600,        // 1 hour - quiz data doesn't change often
  QUIZ_META: 7200,        // 2 hours - metadata is more stable
  ATTEMPT: 10800,         // 3 hours - match quiz session duration
  SESSION: 7200,          // 2 hours - session data
  STUDENT_PROGRESS: 300,  // 5 minutes - frequently updated
  ENROLLMENT: 1800,       // 30 minutes
  LEADERBOARD: 60,        // 1 minute - near real-time updates
  QUESTION_BANK: 3600,    // 1 hour
} as const;

interface QuizData {
  id: string;
  title: string;
  duration: number;
  questions: Array<{
    id: string;
    questionText: string;
    options: unknown;
    orderIndex?: number;
  }>;
  startTime?: Date;
  status: string;
}

interface AttemptData {
  id: string;
  quizId: string;
  studentId: string;
  status: string;
  startTime: Date;
  answers: Record<string, unknown>;
  timeRemaining?: number;
}

interface SessionData {
  quizId: string;
  studentId: string;
  attemptId: string;
  startedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

class QuizCache {
  /**
   * Cache quiz data for fast retrieval
   */
  async cacheQuizData(quizId: string, data: QuizData): Promise<void> {
    try {
      const key = CACHE_KEYS.QUIZ_DATA + quizId;
      await redisClient.set(
        key,
        JSON.stringify(data),
        TTL.QUIZ_DATA
      );
      logger.debug(`Cached quiz data for ${quizId}`);
    } catch (error) {
      logger.error("Failed to cache quiz data:", error);
    }
  }

  /**
   * Get cached quiz data
   */
  async getQuizData(quizId: string): Promise<QuizData | null> {
    try {
      const key = CACHE_KEYS.QUIZ_DATA + quizId;
      const cached = await redisClient.get(key);
      
      if (cached) {
        logger.debug(`Cache hit for quiz ${quizId}`);
        return JSON.parse(cached);
      }
      
      logger.debug(`Cache miss for quiz ${quizId}`);
      return null;
    } catch (error) {
      logger.error("Failed to get cached quiz data:", error);
      return null;
    }
  }

  /**
   * Cache quiz metadata (lighter weight than full quiz data)
   */
  async cacheQuizMeta(quizId: string, meta: Partial<QuizData>): Promise<void> {
    try {
      const key = CACHE_KEYS.QUIZ_META + quizId;
      await redisClient.set(
        key,
        JSON.stringify(meta),
        TTL.QUIZ_META
      );
    } catch (error) {
      logger.error("Failed to cache quiz metadata:", error);
    }
  }

  /**
   * Track active quiz attempt
   */
  async trackAttempt(attemptId: string, data: AttemptData): Promise<void> {
    try {
      const key = CACHE_KEYS.ATTEMPT + attemptId;
      await redisClient.set(
        key,
        JSON.stringify(data),
        TTL.ATTEMPT
      );
      
      // Also track by student for quick lookup
      const studentKey = CACHE_KEYS.STUDENT_PROGRESS + data.studentId + ":" + data.quizId;
      await redisClient.set(
        studentKey,
        attemptId,
        TTL.ATTEMPT
      );
      
      logger.debug(`Tracking attempt ${attemptId} for student ${data.studentId}`);
    } catch (error) {
      logger.error("Failed to track attempt:", error);
    }
  }

  /**
   * Get active attempt for a student
   */
  async getActiveAttempt(studentId: string, quizId: string): Promise<AttemptData | null> {
    try {
      // First get the attempt ID
      const studentKey = CACHE_KEYS.STUDENT_PROGRESS + studentId + ":" + quizId;
      const attemptId = await redisClient.get(studentKey);
      
      if (!attemptId) {
        return null;
      }
      
      // Then get the attempt data
      const key = CACHE_KEYS.ATTEMPT + attemptId;
      const cached = await redisClient.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error("Failed to get active attempt:", error);
      return null;
    }
  }

  /**
   * Update attempt progress (answers, time remaining)
   */
  async updateAttemptProgress(
    attemptId: string, 
    updates: Partial<AttemptData>
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.ATTEMPT + attemptId;
      const existing = await redisClient.get(key);
      
      if (existing) {
        const data = JSON.parse(existing);
        const updated = { ...data, ...updates };
        await redisClient.set(
          key,
          JSON.stringify(updated),
          TTL.ATTEMPT
        );
        logger.debug(`Updated attempt progress for ${attemptId}`);
      }
    } catch (error) {
      logger.error("Failed to update attempt progress:", error);
    }
  }

  /**
   * Create quiz session for extended timeout
   */
  async createQuizSession(
    sessionId: string,
    data: SessionData
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.SESSION + sessionId;
      await redisClient.set(
        key,
        JSON.stringify(data),
        TTL.SESSION
      );
      logger.debug(`Created quiz session ${sessionId}`);
    } catch (error) {
      logger.error("Failed to create quiz session:", error);
    }
  }

  /**
   * Check if quiz session is active
   */
  async isSessionActive(sessionId: string): Promise<boolean> {
    try {
      const key = CACHE_KEYS.SESSION + sessionId;
      const cached = await redisClient.get(key);
      
      if (!cached) {
        return false;
      }
      
      const session: SessionData = JSON.parse(cached);
      return session.isActive && new Date() < new Date(session.expiresAt);
    } catch (error) {
      logger.error("Failed to check session status:", error);
      return false;
    }
  }

  /**
   * Cache enrollment status
   */
  async cacheEnrollment(
    studentId: string, 
    quizId: string, 
    enrolled: boolean
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.ENROLLMENT + studentId + ":" + quizId;
      await redisClient.set(
        key,
        enrolled ? "1" : "0",
        TTL.ENROLLMENT
      );
    } catch (error) {
      logger.error("Failed to cache enrollment:", error);
    }
  }

  /**
   * Check cached enrollment status
   */
  async checkEnrollment(
    studentId: string, 
    quizId: string
  ): Promise<boolean | null> {
    try {
      const key = CACHE_KEYS.ENROLLMENT + studentId + ":" + quizId;
      const cached = await redisClient.get(key);
      
      if (cached !== null) {
        return cached === "1";
      }
      
      return null; // Not cached
    } catch (error) {
      logger.error("Failed to check enrollment cache:", error);
      return null;
    }
  }

  /**
   * Update quiz leaderboard
   */
  async updateLeaderboard(
    quizId: string,
    studentId: string,
    score: number
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.LEADERBOARD + quizId;
      const cached = await redisClient.get(key);
      
      let leaderboard: Array<{ studentId: string; score: number }> = [];
      
      if (cached) {
        leaderboard = JSON.parse(cached);
      }
      
      // Update or add student score
      const existingIndex = leaderboard.findIndex(
        entry => entry.studentId === studentId
      );
      
      if (existingIndex >= 0) {
        leaderboard[existingIndex].score = Math.max(
          leaderboard[existingIndex].score,
          score
        );
      } else {
        leaderboard.push({ studentId, score });
      }
      
      // Sort and keep top 100
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 100);
      
      await redisClient.set(
        key,
        JSON.stringify(leaderboard),
        TTL.LEADERBOARD
      );
    } catch (error) {
      logger.error("Failed to update leaderboard:", error);
    }
  }

  /**
   * Get quiz leaderboard
   */
  async getLeaderboard(quizId: string): Promise<Array<{ studentId: string; score: number }>> {
    try {
      const key = CACHE_KEYS.LEADERBOARD + quizId;
      const cached = await redisClient.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return [];
    } catch (error) {
      logger.error("Failed to get leaderboard:", error);
      return [];
    }
  }

  /**
   * Invalidate quiz cache (when quiz is updated)
   */
  async invalidateQuizCache(quizId: string): Promise<void> {
    try {
      await redisClient.del([
        CACHE_KEYS.QUIZ_DATA + quizId,
        CACHE_KEYS.QUIZ_META + quizId,
        CACHE_KEYS.LEADERBOARD + quizId,
      ]);
      
      // Also clear related question bank cache
      await redisClient.flushPattern(CACHE_KEYS.QUESTION_BANK + quizId + "*");
      
      logger.debug(`Invalidated cache for quiz ${quizId}`);
    } catch (error) {
      logger.error("Failed to invalidate quiz cache:", error);
    }
  }

  /**
   * Warm up cache for upcoming quiz
   * Call this when a quiz is about to start
   */
  async warmupQuizCache(quizId: string, quizData: QuizData): Promise<void> {
    try {
      // Cache the full quiz data
      await this.cacheQuizData(quizId, quizData);
      
      // Cache individual questions for faster lookups
      for (const question of quizData.questions) {
        const key = CACHE_KEYS.QUESTION_BANK + quizId + ":" + question.id;
        await redisClient.set(
          key,
          JSON.stringify(question),
          TTL.QUESTION_BANK
        );
      }
      
      logger.info(`Warmed up cache for quiz ${quizId} with ${quizData.questions.length} questions`);
    } catch (error) {
      logger.error("Failed to warm up quiz cache:", error);
    }
  }

  /**
   * Get cache metrics
   */
  async getMetrics() {
    return redisClient.getMetrics();
  }

  /**
   * Clear all quiz-related cache (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      for (const prefix of Object.values(CACHE_KEYS)) {
        await redisClient.flushPattern(prefix + "*");
      }
      logger.info("Cleared all quiz cache");
    } catch (error) {
      logger.error("Failed to clear quiz cache:", error);
    }
  }
}

// Export singleton instance
export const quizCache = new QuizCache();