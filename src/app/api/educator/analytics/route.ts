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
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "month";
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // For testing, allow without session
    const educatorId = session?.user?.id || "default-educator-id";

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

    // Get educator's quizzes
    const educatorQuizzes = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.educatorId, educatorId));

    const quizIds = educatorQuizzes.map(q => q.id);

    if (quizIds.length === 0) {
      return NextResponse.json({
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
        timeline: []
      });
    }

    // Get all students
    const students = await db
      .select()
      .from(educatorStudents)
      .where(eq(educatorStudents.educatorId, educatorId));

    // Get all attempts for educator's quizzes
    const attempts = await db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        totalCorrect: quizAttempts.totalCorrect,
        totalQuestions: quizAttempts.totalQuestions,
        timeSpent: quizAttempts.timeSpent,
        status: quizAttempts.status,
        endTime: quizAttempts.endTime,
      })
      .from(quizAttempts)
      .where(
        and(
          sql`${quizAttempts.quizId} IN ${sql.raw(`(${quizIds.map(id => `'${id}'`).join(',')})`)}`,
          gte(quizAttempts.endTime, dateFilter),
          eq(quizAttempts.status, "completed")
        )
      );

    // Calculate overall statistics
    const totalAttempts = attempts.length;
    const totalStudents = new Set(attempts.map(a => a.studentId)).size;
    const averageScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
      : 0;
    const passRate = totalAttempts > 0
      ? (attempts.filter(a => (a.score || 0) >= 70).length / totalAttempts) * 100
      : 0;
    const completionRate = students.length > 0 && educatorQuizzes.length > 0
      ? (totalAttempts / (students.length * educatorQuizzes.length)) * 100
      : 0;
    const averageTimePerQuiz = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / totalAttempts
      : 0;

    // Quiz performance analysis
    const quizPerformance = await Promise.all(
      educatorQuizzes.map(async (quiz) => {
        const quizAttemptsList = attempts.filter(a => a.quizId === quiz.id);
        const attemptCount = quizAttemptsList.length;
        
        if (attemptCount === 0) {
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

        const scores = quizAttemptsList.map(a => a.score || 0);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / attemptCount;
        const passCount = scores.filter(s => s >= 70).length;
        const avgTime = quizAttemptsList.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / attemptCount;

        return {
          quizId: quiz.id,
          quizTitle: quiz.title,
          attempts: attemptCount,
          averageScore: avgScore,
          passRate: (passCount / attemptCount) * 100,
          averageTime: avgTime,
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores)
        };
      })
    );

    // Student performance analysis
    const studentPerformance = await Promise.all(
      students.map(async (student) => {
        const studentUser = await db
          .select()
          .from(user)
          .where(eq(user.id, student.studentId))
          .limit(1);

        const studentAttempts = attempts.filter(a => a.studentId === student.studentId);
        const completedCount = studentAttempts.length;
        const avgScore = completedCount > 0
          ? studentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedCount
          : 0;
        const totalTime = studentAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
        const lastAttempt = studentAttempts.sort((a, b) => 
          (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0)
        )[0];

        // Calculate trend (simplified - comparing last 2 attempts)
        const recentAttempts = studentAttempts
          .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
          .slice(0, 2);
        
        let trend: "up" | "down" | "stable" = "stable";
        if (recentAttempts.length >= 2) {
          const diff = (recentAttempts[0].score || 0) - (recentAttempts[1].score || 0);
          if (diff > 5) trend = "up";
          else if (diff < -5) trend = "down";
        }

        return {
          studentId: student.studentId,
          studentName: studentUser[0]?.name || "Unknown",
          studentEmail: studentUser[0]?.email || "",
          quizzesAttempted: completedCount,
          quizzesCompleted: completedCount,
          averageScore: avgScore,
          totalTimeSpent: totalTime,
          lastActivity: lastAttempt?.endTime?.toISOString() || new Date().toISOString(),
          trend
        };
      })
    );

    // Topic performance analysis
    const topicStats: Record<string, { total: number; correct: number; attempts: number }> = {};
    
    for (const attempt of attempts) {
      const responses = await db
        .select({
          isCorrect: questionResponses.isCorrect,
          topic: questions.topic,
        })
        .from(questionResponses)
        .innerJoin(questions, eq(questionResponses.questionId, questions.id))
        .where(eq(questionResponses.attemptId, attempt.id));

      responses.forEach(response => {
        if (response.topic) {
          if (!topicStats[response.topic]) {
            topicStats[response.topic] = { total: 0, correct: 0, attempts: 0 };
          }
          topicStats[response.topic].total++;
          topicStats[response.topic].attempts++;
          if (response.isCorrect) {
            topicStats[response.topic].correct++;
          }
        }
      });
    }

    const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      averageScore: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      attempts: Math.ceil(stats.attempts / (stats.total / (attempts.length || 1)))
    }));

    // Find most difficult and easiest topics
    const sortedTopics = topicPerformance.sort((a, b) => a.averageScore - b.averageScore);
    const mostDifficultTopic = sortedTopics[0]?.topic || "N/A";
    const easiestTopic = sortedTopics[sortedTopics.length - 1]?.topic || "N/A";

    // Difficulty analysis based on Bloom's taxonomy
    const difficultyStats: Record<string, { total: number; correct: number; attempts: number }> = {};
    
    // Simple mapping from Bloom's levels to difficulty
    const bloomsToDifficulty = (bloomsLevel: string | null): string => {
      if (!bloomsLevel) return "Unknown";
      const level = bloomsLevel.toLowerCase();
      if (level === "knowledge" || level === "remember") return "Easy";
      if (level === "comprehension" || level === "understand") return "Medium";
      if (level === "application" || level === "apply") return "Medium";
      if (level === "analysis" || level === "analyze") return "Hard";
      if (level === "synthesis" || level === "create") return "Hard";
      if (level === "evaluation" || level === "evaluate") return "Hard";
      return "Medium"; // Default
    };
    
    for (const attempt of attempts) {
      const responses = await db
        .select({
          isCorrect: questionResponses.isCorrect,
          bloomsLevel: questions.bloomsLevel,
        })
        .from(questionResponses)
        .innerJoin(questions, eq(questionResponses.questionId, questions.id))
        .where(eq(questionResponses.attemptId, attempt.id));

      responses.forEach(response => {
        const difficulty = bloomsToDifficulty(response.bloomsLevel);
        if (!difficultyStats[difficulty]) {
          difficultyStats[difficulty] = { total: 0, correct: 0, attempts: 0 };
        }
        difficultyStats[difficulty].total++;
        difficultyStats[difficulty].attempts++;
        if (response.isCorrect) {
          difficultyStats[difficulty].correct++;
        }
      });
    }

    const difficultyPerformance = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
      difficulty,
      totalQuestions: stats.total,
      correctAnswers: stats.correct,
      averageScore: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      attempts: Math.ceil(stats.attempts / (stats.total / (attempts.length || 1)))
    }));

    // Generate timeline data (last 7 data points)
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      if (timeRange === "week") {
        date.setDate(date.getDate() - i);
      } else if (timeRange === "month") {
        date.setDate(date.getDate() - (i * 4)); // Weekly intervals for month view
      } else {
        date.setMonth(date.getMonth() - i); // Monthly intervals for all time
      }
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayAttempts = attempts.filter(a => {
        const attemptDate = a.endTime;
        return attemptDate && attemptDate >= dayStart && attemptDate <= dayEnd;
      });
      
      const dayAvgScore = dayAttempts.length > 0
        ? dayAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / dayAttempts.length
        : 0;
      
      timelineData.push({
        date: date.toISOString(),
        attempts: dayAttempts.length,
        averageScore: dayAvgScore
      });
    }

    return NextResponse.json({
      overall: {
        totalStudents,
        totalQuizzes: educatorQuizzes.length,
        totalAttempts,
        averageScore,
        passRate,
        completionRate: Math.min(100, completionRate), // Cap at 100%
        averageTimePerQuiz,
        mostDifficultTopic,
        easiestTopic
      },
      quizzes: quizPerformance.filter(q => q.attempts > 0),
      students: studentPerformance,
      topics: topicPerformance,
      difficulty: difficultyPerformance,
      timeline: timelineData
    });

  } catch (error) {
    logger.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}