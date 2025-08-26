import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizAttempts, quizzes } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";


export async function GET(req: NextRequest) {
  try {
    // Get the current user's session
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
    
    // Fetch all quiz attempts for this student
    const results = await db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        quizTitle: quizzes.title,
        score: quizAttempts.score,
        status: quizAttempts.status,
        startedAt: quizAttempts.startTime,
        completedAt: quizAttempts.endTime,
        timeSpent: quizAttempts.timeSpent,
        answers: quizAttempts.answers,
        totalCorrect: quizAttempts.totalCorrect,
        totalQuestions: quizAttempts.totalQuestions
      })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(eq(quizAttempts.studentId, userId))
      .orderBy(desc(quizAttempts.startTime));

    return NextResponse.json({
      results: results.filter(r => r && r.id).map(r => ({
        ...r,
        quizTitle: r.quizTitle || "Untitled Quiz"
      }))
    });
  } catch (error) {
    logger.error("Error fetching student results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}