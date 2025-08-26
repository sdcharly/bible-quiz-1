import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questions, quizzes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { shuffleAllQuestionOptions, checkOptionsDistribution } from "@/lib/quiz-utils";
import { logger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the quiz
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

    // Fetch all questions for this quiz
    const allQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: "No questions found" },
        { status: 404 }
      );
    }

    // Parse options for all questions
    const questionsWithParsedOptions = allQuestions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    // Check current distribution before shuffling
    const beforeDistribution = checkOptionsDistribution(questionsWithParsedOptions);

    // Shuffle all question options
    const shuffledQuestions = shuffleAllQuestionOptions(questionsWithParsedOptions);

    // Update all questions in the database
    const updatePromises = shuffledQuestions.map(question =>
      db
        .update(questions)
        .set({
          options: question.options
        })
        .where(eq(questions.id, question.id))
    );

    await Promise.all(updatePromises);

    // Check distribution after shuffling
    const afterDistribution = checkOptionsDistribution(shuffledQuestions);

    logger.log(`Shuffled all options for quiz ${quizId}. Before: ${JSON.stringify(beforeDistribution.positionCounts)}, After: ${JSON.stringify(afterDistribution.positionCounts)}`);

    return NextResponse.json({
      success: true,
      message: "All question options shuffled successfully",
      totalQuestions: shuffledQuestions.length,
      distributionBefore: beforeDistribution,
      distributionAfter: afterDistribution
    });

  } catch (error) {
    logger.error("Error shuffling all question options:", error);
    return NextResponse.json(
      { error: "Failed to shuffle options" },
      { status: 500 }
    );
  }
}

// GET endpoint to check current distribution
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quizId } = await context.params;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all questions
    const allQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    const questionsWithParsedOptions = allQuestions.map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
    }));

    const distribution = checkOptionsDistribution(questionsWithParsedOptions);

    return NextResponse.json({
      success: true,
      distribution
    });

  } catch (error) {
    logger.error("Error checking distribution:", error);
    return NextResponse.json(
      { error: "Failed to check distribution" },
      { status: 500 }
    );
  }
}