import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
// Note: crypto import not needed for this endpoint as we're updating existing questions

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const params = await context.params;
    const { id: quizId, questionId } = params;
    
    // Get custom replacement options from request body
    let customOptions = { difficulty: null, book: null, chapter: null };
    try {
      const body = await req.json();
      customOptions = {
        difficulty: body.difficulty || null,
        book: body.book || null,
        chapter: body.chapter || null
      };
    } catch (e) {
      // If no body provided, continue with default behavior
      console.log("No custom options provided, using quiz defaults");
    }

    // Fetch quiz details to get configuration
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quiz[0];
    const config = quizData.configuration as Record<string, unknown>;

    // Verify the question exists and belongs to this quiz
    const existingQuestion = await db
      .select()
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.quizId, quizId)))
      .limit(1);

    if (!existingQuestion.length) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    let newQuestionData;

    // Try to generate new question using webhook if available
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      try {
        console.log("Generating replacement question via webhook...");
        
        // Use custom options if provided, otherwise fall back to quiz config
        const webhookPayload = {
          documentIds: quizData.documentIds,
          questionCount: 1, // Generate just one question
          topics: config.topics || [],
          books: customOptions.book ? [customOptions.book] : (config.books || []),
          chapters: customOptions.chapter ? [customOptions.chapter] : (config.chapters || []),
          difficulty: customOptions.difficulty || config.difficulty || "intermediate",
          bloomsLevel: config.bloomsLevels || ["knowledge", "comprehension"],
          timeLimit: quizData.duration,
          quizTitle: quizData.title,
          quizDescription: quizData.description,
        };
        
        console.log("Webhook payload with custom options:", {
          books: webhookPayload.books,
          chapters: webhookPayload.chapters,
          difficulty: webhookPayload.difficulty
        });

        const webhookResponse = await fetch(process.env.QUIZ_GENERATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(30000), // 30 second timeout for single question
        });

        if (webhookResponse.ok) {
          const responseText = await webhookResponse.text();
          if (responseText && responseText.trim() !== '') {
            const webhookData = JSON.parse(responseText);
            
            // Extract question data from webhook response
            let questionsData = [];
            if (Array.isArray(webhookData) && webhookData[0]?.output?.questions) {
              questionsData = webhookData[0].output.questions;
            } else if (webhookData.output?.questions) {
              questionsData = webhookData.output.questions;
            } else if (webhookData.questions) {
              questionsData = webhookData.questions;
            } else if (Array.isArray(webhookData)) {
              questionsData = webhookData;
            }

            if (questionsData.length > 0) {
              newQuestionData = questionsData[0];
              console.log("Successfully generated question via webhook");
            }
          }
        }
      } catch (webhookError) {
        console.error("Webhook failed for question replacement:", webhookError);
      }
    }

    // Fallback to sample question if webhook failed
    if (!newQuestionData) {
      console.log("Using fallback sample question with custom options");
      newQuestionData = generateSampleQuestion(
        customOptions.book || (config.books as string[])?.[0] || "Genesis", 
        customOptions.difficulty || (config.difficulty as string) || "intermediate", 
        (config.bloomsLevels as string[])?.[0] || "knowledge"
      );
    }

    // Prepare question data for database
    let optionsArray = [];
    if (newQuestionData.options) {
      if (Array.isArray(newQuestionData.options)) {
        optionsArray = newQuestionData.options;
      } else if (typeof newQuestionData.options === 'object') {
        // Convert {A: "text", B: "text"} to [{id: "A", text: "text"}]
        optionsArray = Object.entries(newQuestionData.options).map(([key, value]) => ({
          id: key.toLowerCase(),
          text: value as string
        }));
      }
    }

    // Map question_type to a valid bloomsLevel if needed
    let mappedBloomsLevel = (config.bloomsLevels as string[])?.[0] || "knowledge";
    if (newQuestionData.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(newQuestionData.bloomsLevel)) {
      mappedBloomsLevel = newQuestionData.bloomsLevel;
    }

    // Parse biblical reference more accurately - prioritize custom options
    let parsedBook = newQuestionData.book || customOptions.book || (config.books as string[])?.[0];
    let parsedChapter = newQuestionData.chapter || customOptions.chapter || (config.chapters as string[])?.[0];
    
    if (newQuestionData.biblical_reference) {
      // Handle formats like "Proverbs 6:6-8 (NIV)" or "1 Corinthians 13:4-7"
      const refParts = newQuestionData.biblical_reference.trim().split(/\s+/);
      
      // Check if it's a book with a number prefix (e.g., "1 Corinthians", "2 Kings")
      if (refParts[0] && /^\d+$/.test(refParts[0]) && refParts[1]) {
        parsedBook = `${refParts[0]} ${refParts[1]}`;
        // The chapter and verse is the next part
        parsedChapter = refParts[2]?.replace(/\(.*\)/, '').trim() || '';
      } else {
        parsedBook = refParts[0];
        // Everything after the book name until any parenthesis
        const remainingParts = refParts.slice(1).join(' ');
        parsedChapter = remainingParts.replace(/\(.*\)/, '').trim();
      }
    }

    // Update the question in database
    const updatedQuestion = await db
      .update(questions)
      .set({
        questionText: newQuestionData.question || newQuestionData.questionText,
        options: optionsArray,
        correctAnswer: newQuestionData.correct_answer?.toLowerCase() || newQuestionData.correctAnswer?.toLowerCase(),
        explanation: newQuestionData.explanation,
        difficulty: newQuestionData.difficulty || customOptions.difficulty || config.difficulty || "intermediate",
        bloomsLevel: mappedBloomsLevel as "knowledge" | "comprehension" | "application" | "analysis" | "synthesis" | "evaluation",
        topic: newQuestionData.topic || newQuestionData.question_type,
        book: parsedBook,
        chapter: parsedChapter, // Now stores full chapter:verse reference like "6:6-8"
      })
      .where(eq(questions.id, questionId))
      .returning();

    if (!updatedQuestion.length) {
      return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion[0],
      message: "Question replaced successfully"
    });

  } catch (error) {
    console.error("Error replacing question:", error);
    return NextResponse.json(
      { error: "Failed to replace question" },
      { status: 500 }
    );
  }
}

// Helper function to generate sample question
function generateSampleQuestion(book: string, difficulty: string, bloomsLevel: string) {
  return {
    id: 1,
    question: `Sample Question: What is a key theme in the book of ${book}?`,
    options: {
      A: "God's faithfulness and covenant",
      B: "The importance of ritual observance",
      C: "The genealogy of ancient peoples",
      D: "The construction of religious buildings"
    },
    correct_answer: "a",
    explanation: "This is a replacement sample question. The original question generation service may have timed out, so this placeholder was created.",
    biblical_reference: `${book} 1:1`,
    difficulty: difficulty || "intermediate",
    question_type: bloomsLevel || "knowledge"
  };
}