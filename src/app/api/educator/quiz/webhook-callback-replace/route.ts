import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { debugLogger } from "@/lib/debug-logger";
import { logger } from "@/lib/logger";
import { sendJobStatusUpdate } from "@/lib/websocket-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status, questionsData, error } = body;
    
    logger.log(`[REPLACE CALLBACK] Received callback for job: ${jobId}`);
    logger.log(`[REPLACE CALLBACK] Status: ${status}, Error: ${error || 'none'}, Questions: ${questionsData?.length || 0}`);
    
    debugLogger.info("Replacement callback received", {
      jobId,
      status,
      error: error || 'none',
      questionsCount: questionsData?.length || 0,
      hasQuestionsData: !!questionsData,
      bodyKeys: Object.keys(body)
    });

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    // Get the job from store
    const job = jobStore.get(jobId);
    if (!job) {
      logger.error(`Replacement job not found: ${jobId}`);
      
      // If this is an error callback and job doesn't exist, log it but don't fail
      if (status === 'error' || error) {
        logger.error(`Received error callback for non-existent replacement job ${jobId}: ${error}`);
        return NextResponse.json({
          success: false,
          jobId,
          message: "Error callback received for unknown replacement job",
          error: error || "Unknown error"
        });
      }
      
      return NextResponse.json(
        { error: "Job not found or expired" },
        { status: 404 }
      );
    }

    // Extract the questionId to replace from the job payload
    const questionIdToReplace = (job.webhookPayload as { questionIdToReplace?: string }).questionIdToReplace;
    if (!questionIdToReplace) {
      logger.error(`No questionId found in job payload for job: ${jobId}`);
      return NextResponse.json(
        { error: "Question ID to replace not found in job" },
        { status: 400 }
      );
    }
    
    // Safety check: Verify this is a replacement job
    if (!jobId.startsWith('replace-')) {
      logger.error(`Invalid job ID for replacement: ${jobId}`);
      return NextResponse.json(
        { error: "This endpoint is only for replacement jobs" },
        { status: 400 }
      );
    }

    // Update job status based on callback
    if (status === 'success' && questionsData && questionsData.length > 0) {
      // Process successful generation
      logger.log(`Received replacement question for job ${jobId}`);
      
      const newQuestionData = questionsData[0]; // Take the first question
      const webhookPayload = job.webhookPayload as {
        books?: string[];
        chapters?: string[];
        difficulty?: string;
        bloomsLevel?: string[];
        [key: string]: unknown;
      };
      
      // Helper function to clean strings and remove control characters
      const cleanString = (str: unknown): string => {
        if (!str) return "";
        return String(str).replace(/[\x00-\x1F\x7F]/g, "").trim();
      };
      
      // Convert options to array format if needed
      let optionsArray = [];
      if (newQuestionData.options) {
        if (Array.isArray(newQuestionData.options)) {
          optionsArray = newQuestionData.options.map((opt: unknown) => {
            if (typeof opt === 'object' && opt !== null && 'text' in opt) {
              const optObj = opt as { id?: string; text: unknown };
              return {
                id: optObj.id || '',
                text: cleanString(optObj.text).substring(0, 500)
              };
            }
            return opt;
          });
        } else if (typeof newQuestionData.options === 'object') {
          optionsArray = Object.entries(newQuestionData.options).map(([key, value]) => ({
            id: key.toLowerCase(),
            text: cleanString(value).substring(0, 500)
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
      let mappedBloomsLevel = null;
      
      // If the question has a bloomsLevel that's valid, use it
      if (newQuestionData.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(newQuestionData.bloomsLevel)) {
        mappedBloomsLevel = newQuestionData.bloomsLevel;
      }
      // Try to map question_type to bloomsLevel
      else if (newQuestionData.question_type) {
        const typeToBloomMap: Record<string, string> = {
          'knowledge': 'knowledge',
          'comprehension': 'comprehension',
          'understanding': 'comprehension',
          'application': 'application',
          'apply': 'application',
          'analysis': 'analysis',
          'analyze': 'analysis',
          'synthesis': 'synthesis',
          'create': 'synthesis',
          'evaluation': 'evaluation',
          'evaluate': 'evaluation',
          'critical thinking': 'analysis',
          'recall': 'knowledge',
          'interpretation': 'comprehension',
          'explanation': 'comprehension',
          'problem solving': 'application',
          'comparison': 'analysis',
          'judgment': 'evaluation'
        };
        
        const normalizedType = newQuestionData.question_type.toLowerCase().trim();
        if (typeToBloomMap[normalizedType]) {
          mappedBloomsLevel = typeToBloomMap[normalizedType];
        } else {
          // Check if question_type contains any bloom keywords
          for (const [key, value] of Object.entries(typeToBloomMap)) {
            if (normalizedType.includes(key)) {
              mappedBloomsLevel = value;
              break;
            }
          }
        }
      }
      
      // Fallback to webhook payload or default
      if (!mappedBloomsLevel) {
        mappedBloomsLevel = (webhookPayload.bloomsLevel && webhookPayload.bloomsLevel[0]) || "knowledge";
      }
      
      // Prepare update data with proper validation and sanitization
      const questionText = cleanString(newQuestionData.question || newQuestionData.questionText).substring(0, 2000); // Reasonable limit
      const explanationText = cleanString(newQuestionData.explanation).substring(0, 2000); // Reasonable limit
      const correctAnswerValue = cleanString(newQuestionData.correct_answer || newQuestionData.correctAnswer).toLowerCase().substring(0, 10);
      
      // Validate data before update
      if (!questionText || !optionsArray.length || !correctAnswerValue) {
        logger.error(`Invalid question data for replacement job ${jobId}:`, {
          hasQuestionText: !!questionText,
          optionsLength: optionsArray.length,
          hasCorrectAnswer: !!correctAnswerValue
        });
        
        jobStore.update(jobId, {
          status: 'failed',
          error: 'Invalid question data received',
          message: 'Missing required fields in generated question'
        });
        sendJobStatusUpdate(jobId);
        
        return NextResponse.json({
          success: false,
          error: "Invalid question data received",
          jobId
        }, { status: 400 });
      }
      
      // Ensure difficulty is a valid enum value
      const validDifficulties = ["easy", "intermediate", "hard"];
      const difficulty = validDifficulties.includes(newQuestionData.difficulty) 
        ? newQuestionData.difficulty 
        : (validDifficulties.includes(webhookPayload.difficulty as string) 
          ? webhookPayload.difficulty 
          : "intermediate");
          
      // Ensure bloomsLevel is a valid enum value
      const validBloomsLevels = ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"];
      const bloomsLevel = validBloomsLevels.includes(mappedBloomsLevel) 
        ? mappedBloomsLevel 
        : "knowledge";
      
      try {
        logger.log(`Updating question ${questionIdToReplace} with:`, {
          questionTextLength: questionText.length,
          optionsCount: optionsArray.length,
          correctAnswer: correctAnswerValue,
          difficulty,
          bloomsLevel,
          book: cleanString(parsedBook).substring(0, 100),
          chapter: cleanString(parsedChapter).substring(0, 100)
        });
        
        // Update the question in database
        const updatedQuestion = await db
          .update(questions)
          .set({
            questionText,
            options: optionsArray,
            correctAnswer: correctAnswerValue,
            explanation: explanationText,
            difficulty: difficulty as "easy" | "intermediate" | "hard",
            bloomsLevel: bloomsLevel as "knowledge" | "comprehension" | "application" | "analysis" | "synthesis" | "evaluation",
            topic: cleanString(newQuestionData.topic || newQuestionData.question_type).substring(0, 100),
            book: cleanString(parsedBook).substring(0, 100),
            chapter: cleanString(parsedChapter).substring(0, 100),
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
          sendJobStatusUpdate(jobId);
          
          return NextResponse.json({
            success: false,
            error: "Failed to update question in database - question may not exist",
            jobId
          }, { status: 500 });
        }
        
        // Update job as completed
        const updatedJob = jobStore.update(jobId, {
          status: 'completed',
          progress: 100,
          message: 'Question replaced successfully',
          questionsData: [updatedQuestion[0]] // Store the updated question
        });
        sendJobStatusUpdate(jobId);
        
        logger.log(`Replacement job ${jobId} completed successfully`);
        debugLogger.info("Replacement job marked as completed", {
          jobId,
          updatedJob: !!updatedJob,
          jobStatus: updatedJob?.status,
          questionId: questionIdToReplace,
          updatedQuestionId: updatedQuestion[0].id
        });
        
        // Return success response for completed replacement
        return NextResponse.json({
          success: true,
          jobId,
          message: "Question replaced successfully",
          questionId: questionIdToReplace
        });
        
      } catch (dbError) {
        logger.error(`Database error for replacement job ${jobId}:`, dbError);
        
        // Log detailed error information
        if (dbError instanceof Error) {
          logger.error("Error details:", {
            message: dbError.message,
            stack: dbError.stack,
            name: dbError.name
          });
          
          // If it's a Postgres error, log the query that failed
          if ('code' in dbError) {
            logger.error("Database error code:", (dbError as { code: string }).code);
          }
        }
        
        // Update job as failed
        jobStore.update(jobId, {
          status: 'failed',
          error: dbError instanceof Error ? dbError.message : 'Database update failed',
          message: 'Failed to update question in database'
        });
        sendJobStatusUpdate(jobId);
        
        // Provide more detailed error response
        const errorDetails = dbError instanceof Error 
          ? `Failed query: update "questions" set "question_text" = $1, "options" = $2, "correct_answer" = $3, "explanation" = $4, "difficulty" = $5, "blooms_level" = $6, "topic" = $7, "book" = $8, "chapter" = $9 where "questions"."id" = $10 returning "id", "quiz_id", "question_text", "options", "correct_answer", "explanation", "difficulty", "blooms_level", "topic", "book", "chapter", "order_index", "created_at"\nparams: ${questionText.substring(0, 100)}...,[options],${correctAnswerValue},${explanationText.substring(0, 100)}...,${difficulty},${bloomsLevel},${cleanString(newQuestionData.topic || newQuestionData.question_type).substring(0, 50)},${cleanString(parsedBook).substring(0, 50)},${cleanString(parsedChapter).substring(0, 50)},${questionIdToReplace}`
          : "Unknown database error";
        
        return NextResponse.json({
          success: false,
          error: "Database update failed",
          details: errorDetails,
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
      sendJobStatusUpdate(jobId);
      
      logger.error(`Replacement job ${jobId} failed:`, error);
    } else {
      // Update progress (backend service might send progress updates)
      const progress = body.progress || 50;
      const message = body.message || 'Creating new biblical study question...';
      
      jobStore.update(jobId, {
        status: 'processing',
        progress,
        message
      });
      sendJobStatusUpdate(jobId);
      
      logger.log(`Replacement job ${jobId} progress update: ${progress}%`);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: "Callback received successfully"
    });

  } catch (error) {
    logger.error("Error in replacement webhook callback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process callback" },
      { status: 500 }
    );
  }
}