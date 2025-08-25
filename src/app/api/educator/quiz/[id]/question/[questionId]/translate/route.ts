import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { 
  translationService, 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES 
} from "@/lib/translation-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated educator
    if (!session?.user || (session.user.role !== 'educator' && session.user.role !== 'pending_educator')) {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { id: quizId, questionId } = params;

    // Parse request body
    const body = await req.json();
    const { targetLanguage } = body as { targetLanguage: SupportedLanguage };

    // Validate language
    if (!targetLanguage || !SUPPORTED_LANGUAGES[targetLanguage]) {
      return NextResponse.json(
        { error: "Invalid or unsupported language" },
        { status: 400 }
      );
    }

    // Fetch the question
    const [question] = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.id, questionId),
        eq(questions.quizId, quizId)
      ))
      .limit(1);

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Check if question belongs to the educator
    const quizResult = await db.query.quizzes.findFirst({
      where: (quizzes, { eq, and }) => and(
        eq(quizzes.id, quizId),
        eq(quizzes.educatorId, session.user.id)
      )
    });

    if (!quizResult) {
      return NextResponse.json(
        { error: "Unauthorized - You don't have access to this quiz" },
        { status: 403 }
      );
    }

    logger.log("Translating question", {
      questionId,
      targetLanguage,
      currentText: question.questionText.substring(0, 50)
    });

    // Prepare options array from JSON structure
    const options = question.options.map(opt => opt.text);

    // Call translation service
    const translatedContent = await translationService.translateQuestion({
      questionText: question.questionText,
      options,
      explanation: question.explanation,
      targetLanguage,
      context: {
        book: question.book,
        chapter: question.chapter,
        topic: question.topic
      }
    });

    // Update the question in the database with translated content
    const translatedOptions = question.options.map((opt, index) => ({
      ...opt,
      text: translatedContent.options[index] || opt.text
    }));

    const [updatedQuestion] = await db
      .update(questions)
      .set({
        questionText: translatedContent.questionText,
        options: translatedOptions,
        explanation: translatedContent.explanation,
        // Store metadata about translation (if the column exists)
        // metadata: {
        //   ...(question.metadata as object || {}),
        //   translatedTo: targetLanguage,
        //   translatedAt: translatedContent.translatedAt,
        //   originalLanguage: 'en'
        // }
      })
      .where(eq(questions.id, questionId))
      .returning();

    logger.log("Question translated successfully", {
      questionId,
      language: SUPPORTED_LANGUAGES[targetLanguage].name
    });

    return NextResponse.json({
      success: true,
      message: `Question translated to ${SUPPORTED_LANGUAGES[targetLanguage].name}`,
      question: {
        id: updatedQuestion.id,
        questionText: updatedQuestion.questionText,
        options: updatedQuestion.options,
        explanation: updatedQuestion.explanation,
        correctAnswer: updatedQuestion.correctAnswer,
        translatedTo: targetLanguage,
        translatedAt: translatedContent.translatedAt
      }
    });

  } catch (error) {
    logger.error("Error translating question:", error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("Translation failed")) {
        return NextResponse.json(
          { error: "Translation service temporarily unavailable. Please try again." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to translate question" },
      { status: 500 }
    );
  }
}

// GET endpoint to check translation status/history
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user || (session.user.role !== 'educator' && session.user.role !== 'pending_educator')) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { questionId } = params;

    // Fetch question to check if it exists
    const [question] = await db
      .select({
        id: questions.id
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Since metadata column might not exist, we'll return basic info
    // const metadata = question.metadata as any;
    
    return NextResponse.json({
      hasTranslation: false, // We'll track this differently in future
      translatedTo: null,
      translatedAt: null,
      originalLanguage: 'en',
      supportedLanguages: Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => ({
        code,
        name: lang.name,
        nativeName: lang.nativeName
      }))
    });

  } catch (error) {
    logger.error("Error fetching translation info:", error);
    return NextResponse.json(
      { error: "Failed to fetch translation information" },
      { status: 500 }
    );
  }
}