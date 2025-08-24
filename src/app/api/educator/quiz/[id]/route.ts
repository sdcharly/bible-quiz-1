import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Fetch quiz details
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quiz.length === 0) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Fetch questions for this quiz
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .orderBy(questions.orderIndex);

    // Ensure scheduling fields are included with safe defaults
    // These fields should already be in quiz[0] from the database,
    // but we're being explicit for safety and clarity
    const quizData = {
      ...quiz[0],
      // Explicitly include scheduling fields with defaults if missing
      schedulingStatus: quiz[0].schedulingStatus || 'legacy',
      timeConfiguration: quiz[0].timeConfiguration || null,
      scheduledBy: quiz[0].scheduledBy || null,
      scheduledAt: quiz[0].scheduledAt || null,
      questions: quizQuestions
    };
    
    return NextResponse.json(quizData);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}