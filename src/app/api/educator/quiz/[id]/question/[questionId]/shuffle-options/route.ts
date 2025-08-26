import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { shuffleQuizOptions } from "@/lib/quiz-utils";
import { logger } from "@/lib/logger";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { id: quizId, questionId } = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the current question
    const [question] = await db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.id, questionId),
          eq(questions.quizId, quizId)
        )
      );

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if user owns this quiz (through the quiz's educatorId)
    const quiz = await db.query.quizzes.findFirst({
      where: (quizzes, { eq }) => eq(quizzes.id, quizId)
    });

    if (!quiz || quiz.educatorId !== session.user.id) {
      return NextResponse.json(
        { error: "You don't have permission to modify this quiz" },
        { status: 403 }
      );
    }

    // Don't shuffle published quizzes
    if (quiz.status === "published") {
      return NextResponse.json(
        { error: "Cannot shuffle options for published quizzes" },
        { status: 400 }
      );
    }

    // Parse current options
    const currentOptions = typeof question.options === 'string' 
      ? JSON.parse(question.options)
      : question.options;

    // Shuffle the options
    const shuffledOptions = shuffleQuizOptions(currentOptions);

    // Update the question with shuffled options
    await db
      .update(questions)
      .set({
        options: shuffledOptions
      })
      .where(eq(questions.id, questionId));

    logger.log(`Shuffled options for question ${questionId} in quiz ${quizId}`);

    return NextResponse.json({
      success: true,
      message: "Options shuffled successfully",
      options: shuffledOptions
    });

  } catch (error) {
    logger.error("Error shuffling question options:", error);
    return NextResponse.json(
      { error: "Failed to shuffle options" },
      { status: 500 }
    );
  }
}