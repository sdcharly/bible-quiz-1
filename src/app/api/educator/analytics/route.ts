import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  fetchEducatorData,
  fetchQuizStatistics,
  fetchStudentStatistics,
  fetchTopicPerformance,
  fetchDifficultyPerformance,
  fetchTimelineData,
  calculateOverallStats,
  processQuizPerformance,
  processStudentPerformance,
  processTopicPerformance,
  findExtremeTopics,
  type AnalyticsData
} from "@/lib/analytics-helpers";

// Simple in-memory cache for analytics data
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getDateFilter(timeRange: string): Date {
  const now = new Date();
  
  if (timeRange === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "month") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    return new Date(0); // All time
  }
}

async function getAnalyticsData(educatorId: string, timeRange: string): Promise<AnalyticsData> {
  const startTime = Date.now();
  const dateFilter = getDateFilter(timeRange);
  
  // Fetch educator data
  const { educatorQuizzes, students } = await fetchEducatorData(educatorId);
  const quizIds = educatorQuizzes.map(q => q.id);
  
  // Return empty analytics if no quizzes
  if (quizIds.length === 0) {
    return {
      overall: {
        totalStudents: 0,
        totalQuizzes: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        completionRate: 0,
        averageTimePerQuiz: 0,
        mostDifficultTopic: "N/A",
        easiestTopic: "N/A"
      },
      quizzes: [],
      students: [],
      topics: [],
      difficulty: [],
      timeline: []
    };
  }
  
  // Fetch all analytics data in parallel
  const [
    quizStats,
    { studentUsers, studentStats },
    topicPerformance,
    difficultyPerformance,
    timelineData
  ] = await Promise.all([
    fetchQuizStatistics(quizIds, dateFilter),
    fetchStudentStatistics(students.map(s => s.studentId), quizIds, dateFilter),
    fetchTopicPerformance(quizIds, dateFilter),
    fetchDifficultyPerformance(quizIds, dateFilter),
    fetchTimelineData(quizIds, dateFilter, timeRange)
  ]);
  
  // Calculate overall statistics
  const overallStats = calculateOverallStats(quizStats, students, educatorQuizzes);
  
  // Process performance data
  const quizPerformance = processQuizPerformance(educatorQuizzes, quizStats);
  const studentPerformance = processStudentPerformance(students, studentUsers, studentStats);
  const topicPerformanceData = processTopicPerformance(topicPerformance);
  const { mostDifficultTopic, easiestTopic } = findExtremeTopics(topicPerformanceData);
  
  const endTime = Date.now();
  logger.debug(`Analytics query completed in ${endTime - startTime}ms`);
  
  return {
    overall: {
      totalStudents: students.length,
      totalQuizzes: educatorQuizzes.length,
      totalAttempts: overallStats.totalAttempts,
      averageScore: overallStats.overallAvgScore,
      passRate: overallStats.passRate,
      completionRate: overallStats.completionRate,
      averageTimePerQuiz: overallStats.averageTimePerQuiz,
      mostDifficultTopic,
      easiestTopic
    },
    quizzes: quizPerformance.filter(q => q.attempts > 0),
    students: studentPerformance,
    topics: topicPerformanceData,
    difficulty: difficultyPerformance,
    timeline: timelineData
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "month";
    const useCache = searchParams.get("cache") !== "false";
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || session.user.role !== 'educator') {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }
    
    const educatorId = session.user.id;
    
    // Check cache if enabled
    const cacheKey = `${educatorId}-${timeRange}`;
    if (useCache) {
      const cached = analyticsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        logger.debug('Returning cached analytics data');
        return NextResponse.json(cached.data);
      }
    }
    
    // Fetch analytics data
    const data = await getAnalyticsData(educatorId, timeRange);
    
    // Cache the result
    if (useCache) {
      analyticsCache.set(cacheKey, { data, timestamp: Date.now() });
      
      // Clean old cache entries
      for (const [key, value] of analyticsCache.entries()) {
        if (Date.now() - value.timestamp > CACHE_TTL * 2) {
          analyticsCache.delete(key);
        }
      }
    }
    
    return NextResponse.json(data);

  } catch (error) {
    logger.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}