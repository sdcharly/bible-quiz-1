import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  quizzes, 
  quizAttempts, 
  educatorStudents, 
  user, 
  questions,
  questionResponses 
} from "@/lib/schema";
import { eq, and, gte, desc, sql, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// Cache for expensive queries (in-memory for now, will be replaced with Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(educatorId: string, params: Record<string, any>) {
  return `analytics:${educatorId}:${JSON.stringify(params)}`;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "month";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const dataType = searchParams.get("dataType") || "all"; // all, overview, students, quizzes, topics
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    const educatorId = session?.user?.id || "default-educator-id";
    
    // Check cache
    const cacheKey = getCacheKey(educatorId, { timeRange, page, limit, dataType });
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug("Returning cached analytics data");
      return NextResponse.json(cached.data);
    }

    // Calculate date filter
    const now = new Date();
    let dateFilter: Date;
    
    if (timeRange === "week") {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "month") {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      dateFilter = new Date(0); // All time
    }

    const result: any = {};
    
    // Get educator's quizzes (optimized query)
    const educatorQuizzes = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
      })
      .from(quizzes)
      .where(eq(quizzes.educatorId, educatorId));

    const quizIds = educatorQuizzes.map(q => q.id);

    if (quizIds.length === 0) {
      const emptyResult = {
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
        timeline: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
      
      cache.set(cacheKey, { data: emptyResult, timestamp: Date.now() });
      return NextResponse.json(emptyResult);
    }

    // Fetch data based on requested type to reduce load
    if (dataType === "all" || dataType === "overview") {
      // Get overall statistics (optimized with aggregation)
      const statsQuery = await db
        .select({
          totalAttempts: sql<number>`count(*)`,
          totalStudents: sql<number>`count(distinct ${quizAttempts.studentId})`,
          averageScore: sql<number>`avg(${quizAttempts.score})`,
          passCount: sql<number>`sum(case when ${quizAttempts.score} >= 70 then 1 else 0 end)`,
          completedCount: sql<number>`sum(case when ${quizAttempts.status} = 'completed' then 1 else 0 end)`,
          avgTimeSpent: sql<number>`avg(${quizAttempts.timeSpent})`,
        })
        .from(quizAttempts)
        .where(
          and(
            sql`${quizAttempts.quizId} = ANY(${quizIds})`,
            gte(quizAttempts.endTime, dateFilter)
          )
        );

      const stats = statsQuery[0];
      
      result.overall = {
        totalStudents: Number(stats?.totalStudents || 0),
        totalQuizzes: quizIds.length,
        totalAttempts: Number(stats?.totalAttempts || 0),
        averageScore: Number(stats?.averageScore || 0),
        passRate: stats?.totalAttempts ? (Number(stats.passCount) / Number(stats.totalAttempts)) * 100 : 0,
        completionRate: stats?.totalAttempts ? (Number(stats.completedCount) / Number(stats.totalAttempts)) * 100 : 0,
        averageTimePerQuiz: Number(stats?.avgTimeSpent || 0),
        mostDifficultTopic: "N/A", // Will be calculated separately if needed
        easiestTopic: "N/A"
      };

      // Get timeline data (optimized with grouping)
      if (dataType === "all") {
        const timelineQuery = await db
          .select({
            date: sql<string>`date_trunc('day', ${quizAttempts.endTime})`,
            attempts: sql<number>`count(*)`,
            averageScore: sql<number>`avg(${quizAttempts.score})`,
          })
          .from(quizAttempts)
          .where(
            and(
              sql`${quizAttempts.quizId} = ANY(${quizIds})`,
              gte(quizAttempts.endTime, dateFilter),
              eq(quizAttempts.status, "completed")
            )
          )
          .groupBy(sql`date_trunc('day', ${quizAttempts.endTime})`)
          .orderBy(sql`date_trunc('day', ${quizAttempts.endTime})`);

        result.timeline = timelineQuery.map(t => ({
          date: t.date,
          attempts: Number(t.attempts),
          averageScore: Number(t.averageScore || 0)
        }));
      }
    }

    if (dataType === "all" || dataType === "students") {
      // Get paginated student performance
      const offset = (page - 1) * limit;
      
      const studentStats = await db
        .select({
          studentId: quizAttempts.studentId,
          studentName: user.name,
          studentEmail: user.email,
          quizzesAttempted: sql<number>`count(distinct ${quizAttempts.quizId})`,
          quizzesCompleted: sql<number>`sum(case when ${quizAttempts.status} = 'completed' then 1 else 0 end)`,
          averageScore: sql<number>`avg(${quizAttempts.score})`,
          totalTimeSpent: sql<number>`sum(${quizAttempts.timeSpent})`,
          lastActivity: sql<string>`max(${quizAttempts.endTime})`,
        })
        .from(quizAttempts)
        .leftJoin(user, eq(quizAttempts.studentId, user.id))
        .where(
          and(
            sql`${quizAttempts.quizId} = ANY(${quizIds})`,
            gte(quizAttempts.endTime, dateFilter)
          )
        )
        .groupBy(quizAttempts.studentId, user.name, user.email)
        .orderBy(desc(sql`avg(${quizAttempts.score})`))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalStudentsCount = await db
        .select({
          count: sql<number>`count(distinct ${quizAttempts.studentId})`,
        })
        .from(quizAttempts)
        .where(
          and(
            sql`${quizAttempts.quizId} = ANY(${quizIds})`,
            gte(quizAttempts.endTime, dateFilter)
          )
        );

      result.students = studentStats.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName || "Unknown",
        studentEmail: s.studentEmail || "",
        quizzesAttempted: Number(s.quizzesAttempted),
        quizzesCompleted: Number(s.quizzesCompleted),
        averageScore: Number(s.averageScore || 0),
        totalTimeSpent: Number(s.totalTimeSpent || 0),
        lastActivity: s.lastActivity,
        trend: "stable" // This would need historical data to calculate
      }));

      result.studentsPagination = {
        page,
        limit,
        total: Number(totalStudentsCount[0]?.count || 0),
        totalPages: Math.ceil(Number(totalStudentsCount[0]?.count || 0) / limit)
      };
    }

    if (dataType === "all" || dataType === "quizzes") {
      // Get quiz performance (optimized)
      const quizStats = await db
        .select({
          quizId: quizAttempts.quizId,
          quizTitle: quizzes.title,
          attempts: sql<number>`count(*)`,
          averageScore: sql<number>`avg(${quizAttempts.score})`,
          passRate: sql<number>`(sum(case when ${quizAttempts.score} >= 70 then 1 else 0 end)::float / count(*)) * 100`,
          averageTime: sql<number>`avg(${quizAttempts.timeSpent})`,
          highestScore: sql<number>`max(${quizAttempts.score})`,
          lowestScore: sql<number>`min(${quizAttempts.score})`,
        })
        .from(quizAttempts)
        .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .where(
          and(
            sql`${quizAttempts.quizId} = ANY(${quizIds})`,
            gte(quizAttempts.endTime, dateFilter),
            eq(quizAttempts.status, "completed")
          )
        )
        .groupBy(quizAttempts.quizId, quizzes.title)
        .orderBy(desc(sql`count(*)`))
        .limit(limit)
        .offset((page - 1) * limit);

      result.quizzes = quizStats.map(q => ({
        quizId: q.quizId,
        quizTitle: q.quizTitle || "Unknown Quiz",
        attempts: Number(q.attempts),
        averageScore: Number(q.averageScore || 0),
        passRate: Number(q.passRate || 0),
        averageTime: Number(q.averageTime || 0),
        highestScore: Number(q.highestScore || 0),
        lowestScore: Number(q.lowestScore || 0),
      }));
    }

    if (dataType === "all" || dataType === "topics") {
      // Get topic performance (simplified for performance)
      const topicStats = await db
        .select({
          topic: questions.topic,
          totalQuestions: sql<number>`count(distinct ${questions.id})`,
          correctAnswers: sql<number>`sum(case when ${questionResponses.isCorrect} then 1 else 0 end)`,
          attempts: sql<number>`count(${questionResponses.id})`,
        })
        .from(questions)
        .leftJoin(questionResponses, eq(questions.id, questionResponses.questionId))
        .leftJoin(quizAttempts, eq(questionResponses.attemptId, quizAttempts.id))
        .where(
          and(
            sql`${questions.quizId} = ANY(${quizIds})`,
            gte(quizAttempts.endTime, dateFilter)
          )
        )
        .groupBy(questions.topic)
        .orderBy(desc(sql`count(${questionResponses.id})`))
        .limit(10); // Limit to top 10 topics

      result.topics = topicStats.map(t => ({
        topic: t.topic || "General",
        totalQuestions: Number(t.totalQuestions),
        correctAnswers: Number(t.correctAnswers || 0),
        averageScore: t.attempts ? (Number(t.correctAnswers || 0) / Number(t.attempts)) * 100 : 0,
        attempts: Number(t.attempts || 0),
      }));
    }

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}

// Clear cache endpoint (for admin use)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    cache.clear();
    logger.log("Analytics cache cleared");
    
    return NextResponse.json({ success: true, message: "Cache cleared" });
  } catch (error) {
    logger.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}