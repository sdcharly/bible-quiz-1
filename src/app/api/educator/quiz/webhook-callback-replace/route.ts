import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status, questionsData, error } = body;
    
    console.log(`[REPLACE CALLBACK] Received callback for job: ${jobId}`);

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get the job from store
    const job = jobStore.get(jobId);
    if (!job) {
      console.error(`Replacement job not found: ${jobId}`);
      return NextResponse.json(
        { error: "Job not found or expired" },
        { status: 404 }
      );
    }

    // Extract the questionId to replace from the job payload
    const questionIdToReplace = (job.webhookPayload as { questionIdToReplace?: string }).questionIdToReplace;
    if (!questionIdToReplace) {
      console.error(`No questionId found in job payload for job: ${jobId}`);
      return NextResponse.json(
        { error: "Question ID to replace not found in job" },
        { status: 400 }
      );
    }
    
    // Safety check: Verify this is a replacement job
    if (!jobId.startsWith('replace-')) {
      console.error(`Invalid job ID for replacement: ${jobId}`);
      return NextResponse.json(
        { error: "This endpoint is only for replacement jobs" },
        { status: 400 }
      );
    }

    // Update job status based on callback
    if (status === 'success' && questionsData && questionsData.length > 0) {
      // Process successful generation
      console.log(`Received replacement question for job ${jobId}`);
      
      const newQuestionData = questionsData[0]; // Take the first question
      const webhookPayload = job.webhookPayload as {
        books?: string[];
        chapters?: string[];
        difficulty?: string;
        bloomsLevel?: string[];
        [key: string]: unknown;
      };
      
      // Convert options to array format if needed
      let optionsArray = [];
      if (newQuestionData.options) {
        if (Array.isArray(newQuestionData.options)) {
          optionsArray = newQuestionData.options;
        } else if (typeof newQuestionData.options === 'object') {
          optionsArray = Object.entries(newQuestionData.options).map(([key, value]) => ({
            id: key.toLowerCase(),
            text: value as string
          }));
        }
      }
      
      // Parse biblical reference
      let parsedBook = newQuestionData.book || (webhookPayload.books && webhookPayload.books[0]);
      let parsedChapter = newQuestionData.chapter || (webhookPayload.chapters && webhookPayload.chapters[0]);
      
      if (newQuestionData.biblical_reference) {
        const refParts = newQuestionData.biblical_reference.trim().split(/\s+/);
        if (refParts[0] && /^\d+$/.test(refParts[0]) && refParts[1]) {
          parsedBook = `${refParts[0]} ${refParts[1]}`;
          parsedChapter = refParts[2]?.replace(/\(.*\)/, '').trim() || '';
        } else {
          parsedBook = refParts[0];
          const remainingParts = refParts.slice(1).join(' ');
          parsedChapter = remainingParts.replace(/\(.*\)/, '').trim();
        }
      }
      
      // Map blooms level
      let mappedBloomsLevel = (webhookPayload.bloomsLevel && webhookPayload.bloomsLevel[0]) || "knowledge";
      if (newQuestionData.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(newQuestionData.bloomsLevel)) {
        mappedBloomsLevel = newQuestionData.bloomsLevel;
      }
      
      // Prepare update data with proper validation and sanitization
      const questionText = (newQuestionData.question || newQuestionData.questionText || "").substring(0, 5000); // Limit length
      const explanationText = (newQuestionData.explanation || "").substring(0, 5000); // Limit length
      const correctAnswerValue = (newQuestionData.correct_answer?.toLowerCase() || newQuestionData.correctAnswer?.toLowerCase() || "").substring(0, 10);
      
      // Validate data before update
      if (!questionText || !optionsArray.length || !correctAnswerValue) {
        console.error(`Invalid question data for replacement job ${jobId}:`, {
          hasQuestionText: !!questionText,
          optionsLength: optionsArray.length,
          hasCorrectAnswer: !!correctAnswerValue
        });
        
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Invalid question data received',
          message: 'Missing required fields in generated question'
        });
        
        return NextResponse.json({
          success: false,
          error: "Invalid question data received",
          jobId
        }, { status: 400 });
      }
      
      try {
        // Update the question in database
        const updatedQuestion = await db
          .update(questions)
          .set({
            questionText,
            options: optionsArray,
            correctAnswer: correctAnswerValue,
            explanation: explanationText,
            difficulty: newQuestionData.difficulty || webhookPayload.difficulty || "intermediate",
            bloomsLevel: mappedBloomsLevel as "knowledge" | "comprehension" | "application" | "analysis" | "synthesis" | "evaluation",
            topic: (newQuestionData.topic || newQuestionData.question_type || "").substring(0, 255),
            book: (parsedBook || "").substring(0, 255),
            chapter: (parsedChapter || "").substring(0, 255),
          })
          .where(eq(questions.id, questionIdToReplace))
          .returning();
        
        if (!updatedQuestion.length) {
          // Update job as failed
          jobStore.update(jobId, {
            status: 'failed',
            error: 'Failed to update question in database - no rows affected',
            message: 'Database update failed'
          });
          
          return NextResponse.json({
            success: false,
            error: "Failed to update question in database - question may not exist",
            jobId
          }, { status: 500 });
        }
        
        // Update job as completed
        jobStore.update(jobId, {
          status: 'completed',
          progress: 100,
          message: 'Question replaced successfully',
          questionsData: [updatedQuestion[0]] // Store the updated question
        });
        
        console.log(`Replacement job ${jobId} completed successfully`);
        
      } catch (dbError) {
        console.error(`Database error for replacement job ${jobId}:`, dbError);
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: dbError instanceof Error ? dbError.message : 'Database update failed',
          message: 'Failed to update question in database'
        });
        
        return NextResponse.json({
          success: false,
          error: "Database update failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
          jobId
        }, { status: 500 });
      }
    } else if (status === 'error' || error) {
      // Handle error case
      jobStore.update(jobId, {
        status: 'failed',
        progress: 0,
        message: error || 'Question replacement failed',
        error: error || 'Unknown error occurred'
      });
      
      console.error(`Replacement job ${jobId} failed:`, error);
    } else {
      // Update progress (n8n might send progress updates)
      const progress = body.progress || 50;
      const message = body.message || 'Generating replacement question...';
      
      jobStore.update(jobId, {
        status: 'processing',
        progress,
        message
      });
      
      console.log(`Replacement job ${jobId} progress update: ${progress}%`);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: "Callback received successfully"
    });

  } catch (error) {
    console.error("Error in replacement webhook callback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process callback" },
      { status: 500 }
    );
  }
}