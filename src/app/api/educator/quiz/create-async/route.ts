import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, documents } from "@/lib/schema";
import { inArray, eq } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkEducatorPermission, checkEducatorLimits, getPermissionMessage } from "@/lib/permissions";
import { jobStore } from "@/lib/quiz-generation-jobs";

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
      callbackUrl,  // Important: n8n will POST results here
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

    // Create job in store
    jobStore.create(jobId, quizId, webhookPayload);

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      console.log("Calling webhook with async pattern:", process.env.QUIZ_GENERATION_WEBHOOK_URL);
      console.log("Callback URL:", callbackUrl);
      console.log("Job ID:", jobId);
      
      // Call the webhook with a shorter timeout (10 seconds)
      // We expect n8n to respond immediately with "processing" status
      try {
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
            message: 'Failed to start quiz generation'
          });

          return NextResponse.json({
            success: false,
            error: "Failed to start quiz generation",
            jobId,
            quizId
          }, { status: 500 });
        }

        // Update job as processing
        jobStore.update(jobId, {
          status: 'processing',
          progress: 10,
          message: 'Quiz generation started by n8n workflow'
        });

        console.log("Webhook acknowledged, processing in background");
      } catch (fetchError) {
        console.error("Failed to reach webhook:", fetchError);
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Failed to reach quiz generation service',
          message: 'Could not connect to n8n webhook'
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