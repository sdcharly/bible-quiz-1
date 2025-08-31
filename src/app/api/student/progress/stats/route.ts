import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts, enrollments, quizzes } from "@/lib/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET() {
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

    const userId = session.user.id;

    // Get all enrollments for the student
    const allEnrollments = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
      })
      .from(enrollments)
      .where(eq(enrollments.studentId, userId));

    const totalQuizzes = allEnrollments.length;
    const completedQuizzes = allEnrollments.filter(e => e.status === 'completed').length;

    // Get all completed quiz attempts for stats
    const completedAttempts = await db
      .select({
        id: quizAttempts.id,
        score: quizAttempts.score,
        timeSpent: quizAttempts.timeSpent,
        endTime: quizAttempts.endTime,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.studentId, userId),
          eq(quizAttempts.status, 'completed')
        )
      )
      .orderBy(desc(quizAttempts.endTime));

    // Calculate statistics
    let averageScore = 0;
    let totalTimeSpent = 0;
    let bestScore = 0;
    let recentStreak = 0;

    if (completedAttempts.length > 0) {
      const scores = completedAttempts.map(a => a.score || 0);
      averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      bestScore = Math.max(...scores);
      
      // Calculate total time spent (in minutes)
      totalTimeSpent = completedAttempts.reduce((total, attempt) => {
        if (attempt.timeSpent) {
          return total + Math.round(attempt.timeSpent / 60);
        }
        return total;
      }, 0);

      // Calculate recent streak (consecutive days with completed quizzes)
      const dates = completedAttempts
        .filter(a => a.endTime)
        .map(a => new Date(a.endTime!).toDateString());
      
      const uniqueDates = [...new Set(dates)];
      const today = new Date();
      let streak = 0;
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toDateString();
        
        if (uniqueDates.includes(dateString)) {
          streak++;
        } else if (streak > 0) {
          break;
        }
      }
      
      recentStreak = streak;
    }

    const stats = {
      totalQuizzes,
      completedQuizzes,
      averageScore,
      totalTimeSpent,
      bestScore,
      recentStreak
    };

    logger.log('Progress stats for student:', { userId, stats });

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Error fetching progress stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress stats" },
      { status: 500 }
    );
  }
}