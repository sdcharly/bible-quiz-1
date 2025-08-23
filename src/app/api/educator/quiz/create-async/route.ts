import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, documents } from "@/lib/schema";
import { inArray, eq, and, gte } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkEducatorPermission, checkEducatorLimits, getPermissionMessage } from "@/lib/permissions";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { debugLogger } from "@/lib/debug-logger";

export async function POST(req: NextRequest) {
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
    
    const educatorId = session.user.id;

    // Check if educator is approved and has permission to create quizzes
    const canCreate = await checkEducatorPermission(educatorId, 'canPublishQuiz');
    if (!canCreate) {
      return NextResponse.json(
        { error: getPermissionMessage('canPublishQuiz') },
        { status: 403 }
      );
    }

    // Check if educator has reached their quiz limit
    const currentQuizCount = await db.select({ count: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.educatorId, educatorId));
    
    const quizLimitCheck = await checkEducatorLimits(educatorId, 'maxQuizzes', currentQuizCount.length);
    if (!quizLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: getPermissionMessage('maxQuizzes'),
          currentCount: currentQuizCount.length,
          limit: quizLimitCheck.limit 
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      documentIds,
      difficulty = "medium",
      bloomsLevels = ["knowledge"],
      topics = [],
      books = [],
      chapters = [],
      questionCount = 10,
      startTime = new Date().toISOString(), // This should now be UTC from frontend
      timezone = "Asia/Kolkata", // User's timezone for reference
      duration = 30,
      shuffleQuestions = false,
    } = body;

    // Validate that startTime is a valid date
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time provided" },
        { status: 400 }
      );
    }

    // Ensure startTime is in the future (with 5 minute buffer)
    const now = new Date();
    const minStartTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    if (startTimeDate < minStartTime) {
      return NextResponse.json(
        { error: "Quiz start time must be at least 5 minutes in the future" },
        { status: 400 }
      );
    }

    // Check for duplicate quiz creation (same title within last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentDuplicates = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.educatorId, educatorId),
          eq(quizzes.title, title),
          gte(quizzes.createdAt, fiveMinutesAgo)
        )
      );
    
    if (recentDuplicates.length > 0) {
      console.log(`[CREATE-ASYNC] Duplicate quiz creation attempt blocked: "${title}" by educator ${educatorId}`);
      return NextResponse.json(
        { 
          error: "A quiz with this title was created recently. Please wait a moment or use a different title.",
          existingQuizId: recentDuplicates[0].id
        },
        { status: 409 } // Conflict status
      );
    }

    const quizId = crypto.randomUUID();
    const jobId = crypto.randomUUID();

    // Fetch document metadata to include in webhook payload
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, documentIds));

    // Prepare document metadata for webhook
    const documentMetadata = docs.map(doc => {
      const processedData = doc.processedData as Record<string, unknown>;
      return {
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        uploadDate: doc.uploadDate,
        lightragDocumentId: processedData?.lightragDocumentId || processedData?.trackId || doc.filePath,
        lightragUrl: processedData?.lightragUrl,
        processedBy: processedData?.processedBy,
        status: doc.status,
      };
    });

    // Save quiz to database with pending status
    const newQuiz = await db.insert(quizzes).values({
      id: quizId,
      educatorId: educatorId,
      title,
      description,
      documentIds,
      configuration: {
        difficulty,
        bloomsLevels,
        topics,
        books,
        chapters,
      },
      startTime: new Date(startTime),
      timezone,
      duration,
      status: "draft",
      totalQuestions: questionCount,
      passingScore: 70,
      shuffleQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Prepare webhook payload with callback URL
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/educator/quiz/webhook-callback`;
    
    const webhookPayload = {
      jobId,  // Important: Include jobId for callback
      quizId,  // Include quizId so n8n can send it back in callback
      callbackUrl,  // Important: backend service will POST results here
      documentIds,
      documentMetadata,
      questionCount,
      topics,
      books,
      chapters,
      difficulty,
      bloomsLevel: bloomsLevels,
      timeLimit: duration,
      quizTitle: title,
      quizDescription: description,
    };

    // Create job in store BEFORE calling webhook
    const job = jobStore.create(jobId, quizId, webhookPayload);
    console.log(`[CREATE-ASYNC] Created job ${jobId} for quiz ${quizId}`);
    debugLogger.info(`Created job ${jobId} for quiz ${quizId}`, { jobId, quizId });

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      console.log("Calling webhook with async pattern:", process.env.QUIZ_GENERATION_WEBHOOK_URL);
      console.log("Callback URL:", callbackUrl);
      console.log("Job ID:", jobId);
      console.log("Job exists in store:", !!jobStore.get(jobId));
      
      debugLogger.info("Calling webhook", {
        url: process.env.QUIZ_GENERATION_WEBHOOK_URL,
        callbackUrl,
        jobId,
        jobExists: !!jobStore.get(jobId)
      });
      
      // Call the webhook with retry logic
      let webhookResponse: Response | null = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`[CREATE-ASYNC] Webhook attempt ${retryCount + 1}/${maxRetries}`);
          
          webhookResponse = await fetch(process.env.QUIZ_GENERATION_WEBHOOK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
            signal: AbortSignal.timeout(15000), // 15 second timeout per attempt
          });
          
          // If we got a response (even error), break the loop
          if (webhookResponse) {
            break;
          }
        } catch (fetchError) {
          retryCount++;
          console.error(`[CREATE-ASYNC] Webhook attempt ${retryCount} failed:`, fetchError);
          
          if (retryCount >= maxRetries) {
            throw fetchError;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      if (!webhookResponse) {
        throw new Error("Failed to connect to webhook after " + maxRetries + " attempts");
      }
      
      try {

        console.log(`[CREATE-ASYNC] Webhook response status: ${webhookResponse.status}`);
        
        // Read response body regardless of status to check for any error messages
        const responseText = await webhookResponse.text();
        console.log(`[CREATE-ASYNC] Webhook response body:`, responseText);
        
        // Try to parse response as JSON
        let responseData: unknown = null;
        try {
          if (responseText) {
            responseData = JSON.parse(responseText);
            console.log(`[CREATE-ASYNC] Parsed response data:`, responseData);
          }
        } catch (e) {
          console.log(`[CREATE-ASYNC] Response is not JSON:`, responseText);
        }
        
        debugLogger.info("Webhook response received", {
          status: webhookResponse.status,
          body: responseText,
          parsedData: responseData,
          jobId
        });

        if (!webhookResponse.ok) {
          console.error("Webhook failed to acknowledge:", {
            status: webhookResponse.status,
            body: responseText,
            parsedData: responseData
          });
          
          // Check if n8n is returning an immediate error
          const parsedResponse = responseData as Record<string, unknown>;
          const errorMessage = String(parsedResponse?.error || parsedResponse?.message || responseText || `Webhook failed with status ${webhookResponse.status}`);
          
          // Update job as failed
          jobStore.update(jobId, {
            status: 'failed',
            error: errorMessage,
            message: 'Failed to start quiz generation'
          });

          return NextResponse.json({
            success: false,
            error: "Failed to start quiz generation",
            details: errorMessage,
            jobId,
            quizId
          }, { status: 500 });
        }
        
        // Check if the response contains an error even with 200 status
        // (n8n might return 200 with error in body)
        const parsedResp = responseData as Record<string, unknown>;
        if (parsedResp?.error || parsedResp?.status === 'error') {
          console.error(`[CREATE-ASYNC] Webhook returned error in body:`, responseData);
          
          const errorMessage = String(parsedResp.error || parsedResp.message || "Unknown error from webhook");
          
          // Update job as failed
          jobStore.update(jobId, {
            status: 'failed',
            error: errorMessage,
            message: 'Quiz generation failed'
          });
          
          // Don't return error to client, let polling handle it
          console.log(`[CREATE-ASYNC] Error will be handled through polling`);
        } else {
          // Update job as processing only if no error
          jobStore.update(jobId, {
            status: 'processing',
            progress: 10,
            message: 'Biblical quiz generation in progress...'
          });

          console.log("Webhook acknowledged successfully, processing in background");
        }
        
        // Log the expected callback for debugging
        console.log(`[CREATE-ASYNC] Service should callback to: ${callbackUrl}`);
        console.log(`[CREATE-ASYNC] with jobId: ${jobId}`);
      } catch (fetchError) {
        console.error("Failed to reach webhook:", fetchError);
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Failed to reach quiz generation service',
          message: 'Could not connect to quiz generation service'
        });

        return NextResponse.json({
          success: false,
          error: "Failed to reach quiz generation service",
          jobId,
          quizId
        }, { status: 500 });
      }
    } else {
      // No webhook configured
      jobStore.update(jobId, {
        status: 'failed',
        error: 'No webhook configured',
        message: 'Quiz generation webhook not configured'
      });

      return NextResponse.json({
        success: false,
        error: "Quiz generation webhook not configured",
        jobId,
        quizId
      }, { status: 500 });
    }

    // Return immediately with job ID for polling
    return NextResponse.json({
      success: true,
      quizId,
      jobId,
      message: "Quiz generation started. Please wait while questions are being generated.",
      pollUrl: `/api/educator/quiz/poll-status?jobId=${jobId}`,
      estimatedTime: 30 // seconds
    });

  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quiz" },
      { status: 500 }
    );
  }
}