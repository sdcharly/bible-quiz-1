import { db } from "@/lib/db";
import {
  quizzes, 
  quizAttempts, 
  educatorStudents, 
  user, 
  questions,
  questionResponses 
} from "@/lib/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface AnalyticsData {
  overall: {
    totalStudents: number;
    totalQuizzes: number;
    totalAttempts: number;
    averageScore: number;
    passRate: number;
    completionRate: number;
    averageTimePerQuiz: number;
    mostDifficultTopic: string;
    easiestTopic: string;
  };
  quizzes: any[];
  students: any[];
  topics: any[];
  difficulty: any[];
  timeline: any[];
}

export async function fetchEducatorData(educatorId: string) {
  try {
    logger.debug(`Fetching educator data for: ${educatorId}`);
    const [educatorQuizzes, students] = await Promise.all([
      db.select().from(quizzes).where(eq(quizzes.educatorId, educatorId)),
      db.select().from(educatorStudents).where(eq(educatorStudents.educatorId, educatorId))
    ]);
    
    logger.debug(`Found ${educatorQuizzes.length} quizzes and ${students.length} students`);
    return { educatorQuizzes, students };
  } catch (error) {
    logger.error('Error in fetchEducatorData:', error);
    throw error;
  }
}

export async function fetchQuizStatistics(quizIds: string[], dateFilter: Date) {
  if (quizIds.length === 0) return [];
  
  return db.select({
    quizId: quizAttempts.quizId,
    totalAttempts: sql<number>`count(*)`,
    avgScore: sql<number>`avg(${quizAttempts.score})`,
    passCount: sql<number>`sum(case when ${quizAttempts.score} >= 70 then 1 else 0 end)`,
    avgTime: sql<number>`avg(${quizAttempts.timeSpent})`,
    maxScore: sql<number>`max(${quizAttempts.score})`,
    minScore: sql<number>`min(${quizAttempts.score})`,
    uniqueStudents: sql<number>`count(distinct ${quizAttempts.studentId})`
  })
  .from(quizAttempts)
  .where(and(
    inArray(quizAttempts.quizId, quizIds),
    gte(quizAttempts.endTime, dateFilter),
    eq(quizAttempts.status, "completed")
  ))
  .groupBy(quizAttempts.quizId);
}

export async function fetchStudentStatistics(studentIds: string[], quizIds: string[], dateFilter: Date) {
  if (studentIds.length === 0 || quizIds.length === 0) {
    return { studentUsers: [], studentStats: [] };
  }
  
  try {
    const [studentUsers, studentStats] = await Promise.all([
      db.select().from(user).where(inArray(user.id, studentIds)),
      
      db.select({
        studentId: quizAttempts.studentId,
        attemptCount: sql<number>`count(*)`,
        avgScore: sql<number>`avg(${quizAttempts.score})`,
        totalTime: sql<number>`sum(${quizAttempts.timeSpent})`,
        lastActivity: sql<Date>`max(${quizAttempts.endTime})`
      })
      .from(quizAttempts)
      .where(and(
        inArray(quizAttempts.studentId, studentIds),
        inArray(quizAttempts.quizId, quizIds),
        gte(quizAttempts.endTime, dateFilter),
        eq(quizAttempts.status, "completed")
      ))
      .groupBy(quizAttempts.studentId)
    ]);
    
    return { studentUsers, studentStats };
  } catch (error) {
    logger.error('Error in fetchStudentStatistics:', {
      error,
      function: 'fetchStudentStatistics',
      studentIds: studentIds.length,
      quizIds: quizIds.length,
      dateFilter: dateFilter.toISOString()
    });
    return { studentUsers: [], studentStats: [] };
  }
}

export async function fetchTopicPerformance(quizIds: string[], dateFilter: Date) {
  if (quizIds.length === 0) return [];
  
  try {
    logger.debug(`Fetching topic performance for ${quizIds.length} quizzes`);
    const result = await db.select({
      topic: questions.topic,
      totalQuestions: sql<number>`count(*)`,
      correctAnswers: sql<number>`sum(case when ${questionResponses.isCorrect} then 1 else 0 end)`,
      attempts: sql<number>`count(distinct ${questionResponses.attemptId})`
    })
    .from(questionResponses)
    .innerJoin(questions, eq(questionResponses.questionId, questions.id))
    .innerJoin(quizAttempts, eq(questionResponses.attemptId, quizAttempts.id))
    .where(and(
      inArray(quizAttempts.quizId, quizIds),
      gte(quizAttempts.endTime, dateFilter),
      eq(quizAttempts.status, "completed")
    ))
    .groupBy(questions.topic);
    
    logger.debug(`Topic performance query returned ${result.length} rows`);
    return result;
  } catch (error) {
    logger.error('Error in fetchTopicPerformance:', error);
    throw error;
  }
}

export async function fetchDifficultyPerformance(quizIds: string[], dateFilter: Date) {
  if (quizIds.length === 0) return [];
  
  try {
    logger.debug(`Fetching difficulty performance for ${quizIds.length} quizzes`);
    const results = await db.select({
      bloomsLevel: questions.bloomsLevel,
      totalQuestions: sql<number>`count(*)`,
      correctAnswers: sql<number>`sum(case when ${questionResponses.isCorrect} then 1 else 0 end)`,
      attempts: sql<number>`count(distinct ${questionResponses.attemptId})`
    })
    .from(questionResponses)
    .innerJoin(questions, eq(questionResponses.questionId, questions.id))
    .innerJoin(quizAttempts, eq(questionResponses.attemptId, quizAttempts.id))
    .where(and(
      inArray(quizAttempts.quizId, quizIds),
      gte(quizAttempts.endTime, dateFilter),
      eq(quizAttempts.status, "completed")
    ))
    .groupBy(questions.bloomsLevel);
    
    logger.debug(`Difficulty performance query returned ${results.length} rows`);
    return mapBloomsToDifficulty(results);
  } catch (error) {
    logger.error('Error in fetchDifficultyPerformance:', error);
    throw error;
  }
}

function mapBloomsToDifficulty(results: any[]) {
  const difficultyMap: Record<string, { total: number; correct: number; attempts: number }> = {
    'Easy': { total: 0, correct: 0, attempts: 0 },
    'Medium': { total: 0, correct: 0, attempts: 0 },
    'Hard': { total: 0, correct: 0, attempts: 0 },
    'Unknown': { total: 0, correct: 0, attempts: 0 }
  };
  
  results.forEach(r => {
    const difficulty = getBloomsDifficulty(r.bloomsLevel);
    difficultyMap[difficulty].total += Number(r.totalQuestions);
    difficultyMap[difficulty].correct += Number(r.correctAnswers);
    difficultyMap[difficulty].attempts = Math.max(difficultyMap[difficulty].attempts, Number(r.attempts));
  });
  
  return Object.entries(difficultyMap)
    .filter(([_, stats]) => stats.total > 0)
    .map(([difficulty, stats]) => ({
      difficulty,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      averageScore: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      attempts: stats.attempts
    }));
}

function getBloomsDifficulty(bloomsLevel: string | null): string {
  if (!bloomsLevel) return 'Unknown';
  
  const level = bloomsLevel.toLowerCase();
  
  if (level === 'knowledge' || level === 'remember') {
    return 'Easy';
  }
  
  if (level === 'comprehension' || level === 'understand' || 
      level === 'application' || level === 'apply') {
    return 'Medium';
  }
  
  if (level === 'analysis' || level === 'analyze' || 
      level === 'synthesis' || level === 'create' || 
      level === 'evaluation' || level === 'evaluate') {
    return 'Hard';
  }
  
  return 'Medium';
}

export async function fetchTimelineData(quizIds: string[], timeRange: string) {
  if (quizIds.length === 0) return [];
  
  const intervals = generateTimeIntervals(timeRange);
  
  const timelinePromises = intervals.map(async (interval) => {
    const result = await db.select({
      attemptCount: sql<number>`count(*)`,
      avgScore: sql<number>`avg(${quizAttempts.score})`
    })
    .from(quizAttempts)
    .where(and(
      inArray(quizAttempts.quizId, quizIds),
      gte(quizAttempts.endTime, interval.start),
      sql`${quizAttempts.endTime} <= ${interval.end}`,
      eq(quizAttempts.status, "completed")
    ));
    
    return {
      date: interval.date.toISOString(),
      attempts: Number(result[0]?.attemptCount) || 0,
      averageScore: Number(result[0]?.avgScore) || 0
    };
  });
  
  return Promise.all(timelinePromises);
}

function generateTimeIntervals(timeRange: string) {
  const intervals: { start: Date; end: Date; date: Date }[] = [];
  const baseDate = new Date(); // Immutable base date
  
  for (let i = 6; i >= 0; i--) {
    // Create a fresh date for each iteration
    const targetDate = new Date(baseDate.getTime());
    
    if (timeRange === "week") {
      // Subtract days for weekly intervals
      targetDate.setDate(baseDate.getDate() - i);
    } else if (timeRange === "month") {
      // 4-week intervals (28 days apart)
      targetDate.setDate(baseDate.getDate() - (i * 28));
    } else {
      // Monthly intervals
      targetDate.setMonth(baseDate.getMonth() - i);
    }
    
    // Get UTC components to avoid DST issues
    const year = targetDate.getUTCFullYear();
    const month = targetDate.getUTCMonth();
    const day = targetDate.getUTCDate();
    
    // Create UTC start and end times for the day
    const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    
    intervals.push({ 
      start: dayStart, 
      end: dayEnd, 
      date: targetDate 
    });
  }
  
  return intervals;
}

export function calculateOverallStats(
  quizStats: any[],
  students: any[],
  educatorQuizzes: any[]
) {
  const totalAttempts = quizStats.reduce((sum, stat) => sum + Number(stat.totalAttempts), 0);
  
  const overallAvgScore = totalAttempts > 0
    ? quizStats.reduce((sum, stat) => sum + (Number(stat.avgScore) * Number(stat.totalAttempts)), 0) / totalAttempts
    : 0;
  
  const totalPassCount = quizStats.reduce((sum, stat) => sum + Number(stat.passCount), 0);
  const passRate = totalAttempts > 0 ? (totalPassCount / totalAttempts) * 100 : 0;
  
  const completionRate = students.length > 0 && educatorQuizzes.length > 0
    ? Math.min(100, (totalAttempts / (students.length * educatorQuizzes.length)) * 100)
    : 0;
  
  const averageTimePerQuiz = totalAttempts > 0
    ? quizStats.reduce((sum, stat) => sum + (Number(stat.avgTime) * Number(stat.totalAttempts)), 0) / totalAttempts
    : 0;
  
  return {
    totalAttempts,
    overallAvgScore,
    passRate,
    completionRate,
    averageTimePerQuiz
  };
}

export function processQuizPerformance(educatorQuizzes: any[], quizStats: any[]) {
  return educatorQuizzes.map(quiz => {
    const stats = quizStats.find(s => s.quizId === quiz.id);
    
    if (!stats) {
      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        attempts: 0,
        averageScore: 0,
        passRate: 0,
        averageTime: 0,
        highestScore: 0,
        lowestScore: 0
      };
    }
    
    return {
      quizId: quiz.id,
      quizTitle: quiz.title,
      attempts: Number(stats.totalAttempts),
      averageScore: Number(stats.avgScore) || 0,
      passRate: Number(stats.totalAttempts) > 0 
        ? (Number(stats.passCount) / Number(stats.totalAttempts)) * 100 
        : 0,
      averageTime: Number(stats.avgTime) || 0,
      highestScore: Number(stats.maxScore) || 0,
      lowestScore: Number(stats.minScore) || 0
    };
  });
}

export function processStudentPerformance(
  students: any[],
  studentUsers: any[],
  studentStats: any[]
) {
  return students.map(student => {
    const studentUser = studentUsers.find(u => u.id === student.studentId);
    const stats = studentStats.find(s => s.studentId === student.studentId);
    
    return {
      studentId: student.studentId,
      studentName: studentUser?.name || "Unknown",
      studentEmail: studentUser?.email || "",
      quizzesAttempted: stats ? Number(stats.attemptCount) : 0,
      quizzesCompleted: stats ? Number(stats.attemptCount) : 0,
      averageScore: stats ? Number(stats.avgScore) || 0 : 0,
      totalTimeSpent: stats ? Number(stats.totalTime) || 0 : 0,
      lastActivity: stats?.lastActivity?.toISOString() || new Date().toISOString(),
      trend: "stable" as const
    };
  });
}

export function processTopicPerformance(topicPerformance: any[]) {
  return topicPerformance
    .filter(tp => tp.topic !== null)
    .map(tp => ({
      topic: tp.topic!,
      totalQuestions: Number(tp.totalQuestions),
      correctAnswers: Number(tp.correctAnswers),
      averageScore: Number(tp.totalQuestions) > 0 
        ? (Number(tp.correctAnswers) / Number(tp.totalQuestions)) * 100 
        : 0,
      attempts: Number(tp.attempts)
    }));
}

export function findExtremeTopics(topicPerformanceData: any[]) {
  const sortedTopics = [...topicPerformanceData].sort((a, b) => a.averageScore - b.averageScore);
  
  return {
    mostDifficultTopic: sortedTopics[0]?.topic || "N/A",
    easiestTopic: sortedTopics[sortedTopics.length - 1]?.topic || "N/A"
  };
}