import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { jobStore } from "@/lib/quiz-generation-jobs";
import * as crypto from "crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function PUT(
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

    // Generate job ID for tracking
    const jobId = `replace-${crypto.randomUUID()}`;
    
    // Prepare webhook payload with callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/educator/quiz/webhook-callback-replace`;
    
    const webhookPayload = {
      jobId,
      callbackUrl,
      quizId,
      questionId, // Include questionId for the callback to know which question to update
      documentIds: quizData.documentIds,
      questionCount: 1, // Generate just one question
      topics: (config.topics as string[]) || [],
      books: customOptions.book ? [customOptions.book] : ((config.books as string[]) || []),
      chapters: customOptions.chapter ? [customOptions.chapter] : ((config.chapters as string[]) || []),
      difficulty: customOptions.difficulty || config.difficulty || "intermediate",
      bloomsLevel: (config.bloomsLevels as string[]) || ["knowledge", "comprehension"],
      timeLimit: quizData.duration,
      quizTitle: quizData.title,
      quizDescription: quizData.description,
      isReplacement: true // Flag to indicate this is a replacement request
    };

    // Create job in store (reusing the same job store)
    jobStore.create(jobId, quizId, {
      ...webhookPayload,
      questionIdToReplace: questionId
    });

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      console.log("Calling webhook for question replacement with async pattern");
      console.log("Job ID:", jobId);
      console.log("Question ID to replace:", questionId);
      
      try {
        // Call webhook with short timeout - expecting immediate response
        const webhookResponse = await fetch(process.env.QUIZ_GENERATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(10000), // 10 second timeout for immediate response
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error("Webhook failed to acknowledge:", {
            status: webhookResponse.status,
            error: errorText
          });
          
          // Update job as failed
          jobStore.update(jobId, {
            status: 'failed',
            error: `Webhook failed: ${webhookResponse.status}`,
            message: 'Failed to start question replacement'
          });

          return NextResponse.json({
            success: false,
            error: "Failed to start question replacement",
            jobId
          }, { status: 500 });
        }

        // Update job as processing
        jobStore.update(jobId, {
          status: 'processing',
          progress: 10,
          message: 'Generating replacement question...'
        });

        console.log("Webhook acknowledged for replacement, processing in background");
      } catch (fetchError) {
        console.error("Failed to reach webhook:", fetchError);
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Failed to reach question generation service',
          message: 'Could not connect to n8n webhook'
        });

        return NextResponse.json({
          success: false,
          error: "Failed to reach question generation service",
          jobId
        }, { status: 500 });
      }
    } else {
      // No webhook configured - use fallback
      jobStore.update(jobId, {
        status: 'failed',
        error: 'No webhook configured',
        message: 'Question generation webhook not configured'
      });

      return NextResponse.json({
        success: false,
        error: "Question generation webhook not configured",
        jobId
      }, { status: 500 });
    }

    // Return immediately with job ID for polling
    return NextResponse.json({
      success: true,
      jobId,
      message: "Question replacement started. Please wait...",
      pollUrl: `/api/educator/quiz/poll-status?jobId=${jobId}`,
      estimatedTime: 15 // seconds - single question should be faster
    });

  } catch (error) {
    console.error("Error initiating question replacement:", error);
    return NextResponse.json(
      { error: "Failed to initiate question replacement" },
      { status: 500 }
    );
  }
}