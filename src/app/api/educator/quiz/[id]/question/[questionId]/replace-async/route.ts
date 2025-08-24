import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, documents } from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { jobStore } from "@/lib/quiz-generation-jobs";
import * as crypto from "crypto";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
        lightragDocumentId: processedData?.lightragDocumentId || processedData?.trackId || doc.filePath,
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
    console.log(`[REPLACE-ASYNC] Created job ${jobId} for question ${questionId} in quiz ${quizId}`);
    
    debugLogger.info("Replacement job created", {
      jobId,
      quizId,
      questionId,
      callbackUrl,
      jobExists: !!jobStore.get(jobId)
    });

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      console.log("Calling webhook for question replacement with async pattern");
      console.log("Job ID:", jobId);
      console.log("Question ID to replace:", questionId);
      console.log("Job exists in store:", !!jobStore.get(jobId));
      
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

        console.log(`[REPLACE-ASYNC] Webhook response status: ${webhookResponse.status}`);

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error("Webhook failed to acknowledge:", {
            status: webhookResponse.status,
            error: errorText
          });
          
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
          console.log(`[REPLACE-ASYNC] Webhook response data:`, webhookData);
        } catch (e) {
          // If response is not JSON, treat as acknowledgment
          console.log(`[REPLACE-ASYNC] Webhook acknowledged (non-JSON response)`);
          webhookData = {};
        }
        
        // Check if n8n sent confirmation response (as per workflow)
        if (webhookData.status === 'processing') {
          console.log("Webhook acknowledged with processing status, expecting callback");
          // This is the expected n8n response - continue with async flow
        } else if (webhookData.success && webhookData.questionId) {
          // n8n completed the replacement immediately (shouldn't happen with current workflow)
          console.log("Webhook completed replacement immediately, returning success");
          
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

        console.log("Webhook acknowledged for replacement, processing in background");
        
        // Log the expected callback for debugging
        console.log(`[REPLACE-ASYNC] Service should callback to: ${callbackUrl}`);
        console.log(`[REPLACE-ASYNC] with jobId: ${jobId}`);
      } catch (fetchError) {
        console.error("Failed to reach webhook:", fetchError);
        
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
    console.error("Error initiating question replacement:", error);
    return NextResponse.json(
      { error: "Failed to initiate question replacement" },
      { status: 500 }
    );
  }
}