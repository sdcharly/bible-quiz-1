import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, questions, documents } from "@/lib/schema";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { auth } from "@/lib/auth";
import { debugLogger } from "@/lib/debug-logger";


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
      // [REMOVED: Console statement for performance]
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

    // Fetch documents referenced by the quiz to include LightRAG document IDs
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, quizData.documentIds));

    // Prepare document metadata for webhook (including LightRAG document IDs)
    const documentMetadata = docs.map(doc => {
      const processedData = doc.processedData as { 
        lightragDocumentId?: string; 
        trackId?: string; 
        lightragUrl?: string;
        processedBy?: string;
        [key: string]: unknown; 
      } | null;
      return {
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadDate: doc.uploadDate,
        // Use the permanent document ID for LightRAG operations
        // Do NOT use trackId as it's only for status checking
        lightragDocumentId: processedData?.lightragDocumentId || processedData?.permanentDocId,
        lightragUrl: processedData?.lightragUrl,
        processedBy: processedData?.processedBy,
        status: doc.status
      };
    });

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
      documentMetadata, // Include document metadata with LightRAG IDs
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

    // Create job in store BEFORE calling webhook (reusing the same job store)
    const job = jobStore.create(jobId, quizId, {
      ...webhookPayload,
      questionIdToReplace: questionId,
      educatorId: session.user.id,  // Important for WebSocket routing
      questionId: questionId  // For the job store
    });
    // [REMOVED: Console statement for performance]
    
    debugLogger.info("Replacement job created", {
      jobId,
      quizId,
      questionId,
      callbackUrl,
      jobExists: !!jobStore.get(jobId)
    });

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      // [REMOVED: Console statement for performance]
      // [REMOVED: Console statement for performance]
      // [REMOVED: Console statement for performance]
      // [REMOVED: Console statement for performance]);
      
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

        // [REMOVED: Console statement for performance]

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          // [REMOVED: Console statement for performance]
          
          // Update job as failed
          jobStore.update(jobId, {
            status: 'failed',
            error: `Webhook failed: ${webhookResponse.status} - ${errorText}`,
            message: 'Failed to start question replacement'
          });

          return NextResponse.json({
            success: false,
            error: "Failed to start question replacement",
            jobId
          }, { status: 500 });
        }

        // Check the webhook response
        let webhookData;
        try {
          webhookData = await webhookResponse.json();
          // [REMOVED: Console statement for performance]
        } catch (e) {
          // If response is not JSON, treat as acknowledgment
          // [REMOVED: Console statement for performance]`);
          webhookData = {};
        }
        
        // Check if n8n sent confirmation response (as per workflow)
        if (webhookData.status === 'processing') {
          // [REMOVED: Console statement for performance]
          // This is the expected n8n response - continue with async flow
        } else if (webhookData.success && webhookData.questionId) {
          // n8n completed the replacement immediately (shouldn't happen with current workflow)
          // [REMOVED: Console statement for performance]
          
          // Mark job as completed
          jobStore.update(jobId, {
            status: 'completed',
            progress: 100,
            message: 'Question replaced successfully'
          });
          
          // Return the success response directly
          return NextResponse.json({
            success: true,
            jobId,
            questionId: webhookData.questionId,
            message: webhookData.message || "Question replaced successfully"
          });
        }
        
        // Update job status based on webhook response
        jobStore.update(jobId, {
          status: 'processing',
          progress: 10,
          message: 'Creating new biblical study question...'
        });

        // [REMOVED: Console statement for performance]
        
        // Log the expected callback for debugging
        // [REMOVED: Console statement for performance]
        // [REMOVED: Console statement for performance]
      } catch (fetchError) {
        // [REMOVED: Console statement for performance]
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Failed to reach question generation service',
          message: 'Could not connect to question generation service'
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
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to initiate question replacement" },
      { status: 500 }
    );
  }
}