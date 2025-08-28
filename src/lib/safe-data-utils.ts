/**
 * Safe Data Utilities
 * Professional null/undefined handling for critical data fields
 * Prevents runtime errors on mobile devices and ensures data integrity
 */

/**
 * Safely get a numeric value with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return isNaN(num) ? fallback : num;
}

/**
 * Safely get a string value with fallback
 */
export function safeString(value: any, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Safely get a date object with fallback
 */
export function safeDate(value: any, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return isNaN(date.getTime()) ? fallback : date;
}

/**
 * Process quiz result data with comprehensive null handling
 */
export interface SafeQuizResult {
  id: string;
  quizId: string;
  quizTitle: string;
  score: number;
  completedAt: string;
  totalQuestions: number;
  correctAnswers: number;
  status: string;
  duration?: number;
  timeSpent?: number;
}

export function processSafeQuizResult(rawResult: any): SafeQuizResult | null {
  // Essential fields must exist
  if (!rawResult?.id || !rawResult?.quizId) {
    return null;
  }

  return {
    id: safeString(rawResult.id),
    quizId: safeString(rawResult.quizId),
    quizTitle: safeString(rawResult.quizTitle, 'Untitled Quiz'),
    score: safeNumber(rawResult.score, 0),
    completedAt: rawResult.completedAt || rawResult.endTime || new Date().toISOString(),
    totalQuestions: safeNumber(rawResult.totalQuestions, 0),
    // Handle different field names from API
    correctAnswers: safeNumber(
      rawResult.totalCorrect ?? rawResult.correctAnswers, 
      0
    ),
    status: safeString(rawResult.status, 'completed'),
    // Optional fields with proper fallbacks
    duration: rawResult.timeSpent ? safeNumber(rawResult.timeSpent) : 
              rawResult.duration ? safeNumber(rawResult.duration) : 
              undefined,
    timeSpent: safeNumber(rawResult.timeSpent)
  };
}

/**
 * Process quiz data with comprehensive null handling
 */
export interface SafeQuiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  duration: number;
  startTime: string | null;
  timezone: string;
  status: string;
  enrolled: boolean;
  attempted: boolean;
  attemptId?: string;
  score?: number;
  isActive: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  isReassignment?: boolean;
  reassignmentReason?: string;
  availabilityMessage?: string;
  availabilityStatus?: string;
  enrollmentStatus?: string;
}

export function processSafeQuiz(rawQuiz: any): SafeQuiz | null {
  // Essential fields must exist
  if (!rawQuiz?.id || !rawQuiz?.title) {
    return null;
  }

  return {
    id: safeString(rawQuiz.id),
    title: safeString(rawQuiz.title, 'Untitled Quiz'),
    description: rawQuiz.description ? safeString(rawQuiz.description) : undefined,
    totalQuestions: safeNumber(rawQuiz.totalQuestions, 0),
    duration: safeNumber(rawQuiz.duration, 30), // Default 30 minutes
    startTime: rawQuiz.startTime ? safeString(rawQuiz.startTime) : null,
    timezone: safeString(rawQuiz.timezone, 'Asia/Kolkata'),
    status: safeString(rawQuiz.status, 'draft'),
    enrolled: Boolean(rawQuiz.enrolled),
    attempted: Boolean(rawQuiz.attempted),
    attemptId: rawQuiz.attemptId ? safeString(rawQuiz.attemptId) : undefined,
    score: rawQuiz.score !== undefined ? safeNumber(rawQuiz.score) : undefined,
    isActive: Boolean(rawQuiz.isActive),
    isUpcoming: Boolean(rawQuiz.isUpcoming),
    isExpired: Boolean(rawQuiz.isExpired),
    isReassignment: Boolean(rawQuiz.isReassignment),
    reassignmentReason: rawQuiz.reassignmentReason ? safeString(rawQuiz.reassignmentReason) : undefined,
    availabilityMessage: rawQuiz.availabilityMessage ? safeString(rawQuiz.availabilityMessage) : undefined,
    availabilityStatus: rawQuiz.availabilityStatus ? safeString(rawQuiz.availabilityStatus) : undefined,
    enrollmentStatus: rawQuiz.enrollmentStatus ? safeString(rawQuiz.enrollmentStatus) : undefined
  };
}

/**
 * Safe array processing with null filtering
 * Preserves performance by avoiding unnecessary iterations
 * Compatible with React memoization and caching
 */
export function safeArray<T>(
  array: any[], 
  processor: (item: any) => T | null
): T[] {
  if (!Array.isArray(array)) return [];
  
  // Single pass for performance
  const result: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const processed = processor(array[i]);
    if (processed !== null) {
      result.push(processed);
    }
  }
  return result;
}

/**
 * Calculate statistics with safe null handling
 */
export interface QuizStatistics {
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
}

export function calculateSafeStatistics(results: SafeQuizResult[]): QuizStatistics {
  const validResults = results.filter(r => r && typeof r.score === 'number');
  
  if (validResults.length === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      averageScore: 0
    };
  }

  const total = validResults.length;
  const passed = validResults.filter(r => safeNumber(r.score) >= 70).length;
  const failed = total - passed;
  const totalScore = validResults.reduce((sum, r) => sum + safeNumber(r.score), 0);
  const averageScore = Math.round(totalScore / total);

  return {
    total,
    passed,
    failed,
    averageScore
  };
}