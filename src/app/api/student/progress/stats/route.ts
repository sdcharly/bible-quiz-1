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
      // Sum raw seconds first, then convert to minutes to avoid rounding inflation
      const totalSeconds = completedAttempts.reduce((total, attempt) => {
        return total + (attempt.timeSpent || 0);
      }, 0);
      totalTimeSpent = Math.round(totalSeconds / 60);

      // Calculate recent streak (consecutive days with completed quizzes)
      // Use UTC dates for timezone stability
      const getUTCDateKey = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Create a Set of UTC date keys when quizzes were completed
      const completedDateKeys = new Set(
        completedAttempts
          .filter(a => a.endTime)
          .map(a => getUTCDateKey(new Date(a.endTime!)))
      );
      
      // Calculate consecutive streak ending today (UTC)
      const todayUTC = new Date();
      let streak = 0;
      
      // Check consecutive days starting from today going backwards
      for (let i = 0; i < 365; i++) { // Check up to 1 year back
        const checkDate = new Date(todayUTC);
        checkDate.setUTCDate(todayUTC.getUTCDate() - i);
        const dateKey = getUTCDateKey(checkDate);
        
        if (completedDateKeys.has(dateKey)) {
          streak++;
        } else {
          // Break on first missing day - streak must be consecutive from today
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