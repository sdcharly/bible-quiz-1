import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import { debugLogger } from "@/lib/debug-logger";
import { logger } from "@/lib/logger";
import { sendJobStatusUpdate } from "@/lib/websocket-server";


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status, questionsData, error } = body;
    
    logger.log(`[QUIZ CREATE CALLBACK] Received callback for job: ${jobId}`);
    logger.log(`[QUIZ CREATE CALLBACK] Status: ${status}, Error: ${error || 'none'}, Questions: ${questionsData?.length || 0}`);
    
    debugLogger.info("Webhook callback received", {
      jobId,
      status,
      error: error || 'none',
      questionsCount: questionsData?.length || 0,
      fullBody: body
    });

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }
    
    // Safety check: Don't process replacement jobs here
    if (jobId.startsWith('replace-')) {
      logger.error(`[QUIZ CREATE CALLBACK] Wrong endpoint! This is a replacement job: ${jobId}`);
      logger.error(`Should be sent to /api/educator/quiz/webhook-callback-replace`);
      return NextResponse.json(
        { error: "Wrong callback endpoint - this is a replacement job. Use /api/educator/quiz/webhook-callback-replace" },
        { status: 400 }
      );
    }

    // Get the job from store
    let job = jobStore.get(jobId);
    
    // If job not found, try to recover from the callback data
    if (!job) {
      logger.warn(`Job not found in store: ${jobId}`);
      
      // Check if we have enough data to proceed anyway
      if (body.quizId && status === 'success' && questionsData && questionsData.length > 0) {
        logger.log(`Attempting to recover job ${jobId} with quizId ${body.quizId}`);
        
        // Recreate a minimal job object to continue processing
        job = {
          jobId,
          quizId: body.quizId,
          status: 'processing',
          progress: 90,
          message: 'Processing webhook callback',
          createdAt: new Date(),
          updatedAt: new Date(),
          webhookPayload: body.webhookPayload || {}
        };
        
        // Re-add to store temporarily for completion
        jobStore.create(jobId, body.quizId, job.webhookPayload);
        job = jobStore.get(jobId)!;
      } else {
        // If this is an error callback and job doesn't exist, log it but don't fail hard
        if (status === 'error' || error) {
          logger.error(`Received error callback for non-existent job ${jobId}: ${error}`);
          return NextResponse.json({
            success: false,
            jobId,
            message: "Error callback received - job may have expired",
            error: error || "Job expired before callback"
          });
        }
        
        return NextResponse.json(
          { 
            error: "Job not found or expired. The quiz may have been created already. Please check your quizzes list.",
            jobId,
            recoverable: false
          },
          { status: 404 }
        );
      }
    }

    // Update job status based on callback
    if (status === 'success' && questionsData) {
      // Process successful generation
      logger.log(`Received ${questionsData.length} questions for job ${jobId}`);
      
      // Save questions to database
      const quizId = job.quizId;
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
      
      const insertedQuestions = [];
      let failedQuestions = 0;
      
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        
        try {
          // Convert options to array format if needed
          let optionsArray = [];
          if (q.options) {
            if (Array.isArray(q.options)) {
              optionsArray = q.options.map((opt: unknown) => {
                if (typeof opt === 'object' && opt !== null && 'text' in opt) {
                  const optObj = opt as { id?: string; text: unknown };
                  return {
                    id: optObj.id || '',
                    text: cleanString(optObj.text).substring(0, 500)
                  };
                }
                return opt;
              });
            } else if (typeof q.options === 'object') {
              optionsArray = Object.entries(q.options).map(([key, value]) => ({
                id: key.toLowerCase(),
                text: cleanString(value).substring(0, 500) // Limit option text length with sanitization
              }));
            }
          }
          
          // Parse biblical reference
          let parsedBook = q.book || (webhookPayload.books && webhookPayload.books[0]) || '';
          let parsedChapter = q.chapter || (webhookPayload.chapters && webhookPayload.chapters[0]) || '';
          
          if (q.biblical_reference) {
            const refParts = q.biblical_reference.trim().split(/\s+/);
            if (refParts[0] && /^\d+$/.test(refParts[0]) && refParts[1]) {
              parsedBook = `${refParts[0]} ${refParts[1]}`;
              parsedChapter = refParts[2]?.replace(/\(.*\)/, '').trim() || '';
            } else {
              parsedBook = refParts[0];
              const remainingParts = refParts.slice(1).join(' ');
              parsedChapter = remainingParts.replace(/\(.*\)/, '').trim();
            }
          }
          
          // Prepare and validate data with proper sanitization
          
          const questionText = cleanString(q.question || q.questionText).substring(0, 2000);
          const explanationText = cleanString(q.explanation).substring(0, 2000);
          const correctAnswerValue = cleanString(q.correct_answer || q.correctAnswer).toLowerCase().substring(0, 10);
          
          // Skip invalid questions
          if (!questionText || !optionsArray.length || !correctAnswerValue) {
            logger.warn(`Skipping invalid question ${i + 1} for job ${jobId}:`, {
              hasQuestionText: !!questionText,
              optionsLength: optionsArray.length,
              hasCorrectAnswer: !!correctAnswerValue
            });
            failedQuestions++;
            continue;
          }
          
          await db.insert(questions).values({
            id: crypto.randomUUID(),
            quizId,
            questionText,
            options: optionsArray,
            correctAnswer: correctAnswerValue,
            explanation: explanationText,
            difficulty: q.difficulty || webhookPayload.difficulty || 'intermediate',
            // Map question_type to bloomsLevel if needed
            bloomsLevel: (() => {
              // If question has a valid bloomsLevel, use it
              if (q.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(q.bloomsLevel)) {
                return q.bloomsLevel;
              }
              
              // Try to map question_type to bloomsLevel
              if (q.question_type) {
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
                
                const normalizedType = q.question_type.toLowerCase().trim();
                if (typeToBloomMap[normalizedType]) {
                  return typeToBloomMap[normalizedType];
                }
                
                // Check if question_type contains any bloom keywords
                for (const [key, value] of Object.entries(typeToBloomMap)) {
                  if (normalizedType.includes(key)) {
                    return value;
                  }
                }
              }
              
              // Fallback to webhook payload or default
              return webhookPayload.bloomsLevel?.[0] || 'knowledge';
            })(),
            topic: cleanString(q.topic || q.question_type).substring(0, 100),
            book: cleanString(parsedBook).substring(0, 100),
            chapter: cleanString(parsedChapter).substring(0, 100),
            orderIndex: q.id || i,
            createdAt: new Date(),
          });
          
          insertedQuestions.push(q);
        } catch (insertError) {
          logger.error(`Failed to insert question ${i + 1} for job ${jobId}:`, insertError);
          failedQuestions++;
        }
      }
      
      // Check if any questions were successfully inserted
      if (insertedQuestions.length === 0) {
        jobStore.update(jobId, {
          status: 'failed',
          progress: 0,
          message: 'Failed to insert any questions into database',
          error: `All ${questionsData.length} questions failed to insert`
        });
        
        // Send WebSocket update for failure
        sendJobStatusUpdate(jobId);
        
        return NextResponse.json({
          success: false,
          error: "Failed to insert questions into database",
          jobId
        }, { status: 500 });
      }
      
      // Update job as completed (or partially completed)
      const statusMessage = failedQuestions > 0 
        ? `Generated ${insertedQuestions.length} of ${questionsData.length} questions (${failedQuestions} failed)`
        : `Successfully generated ${insertedQuestions.length} questions`;
      
      jobStore.update(jobId, {
        status: 'completed',
        progress: 100,
        message: statusMessage,
        questionsData: insertedQuestions
      });
      
      // Send WebSocket update for completion
      sendJobStatusUpdate(jobId);
      
      logger.log(`Job ${jobId} completed: ${statusMessage}`);
      
      // Return success response for completed quiz generation
      return NextResponse.json({
        success: true,
        jobId,
        quizId,
        message: statusMessage,
        questionsGenerated: insertedQuestions.length,
        questionsFailed: failedQuestions
      });
    } else if (status === 'error' || error) {
      // Handle error case
      jobStore.update(jobId, {
        status: 'failed',
        progress: 0,
        message: error || 'Quiz generation failed',
        error: error || 'Unknown error occurred'
      });
      
      // Send WebSocket update for error
      sendJobStatusUpdate(jobId);
      
      logger.error(`Job ${jobId} failed:`, error);
    } else {
      // Update progress (backend service might send progress updates)
      const progress = body.progress || 50;
      const message = body.message || 'Crafting biblical knowledge questions...';
      
      jobStore.update(jobId, {
        status: 'processing',
        progress,
        message
      });
      
      // Send WebSocket update for progress
      sendJobStatusUpdate(jobId);
      
      logger.log(`Job ${jobId} progress update: ${progress}%`);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: "Callback received successfully"
    });

  } catch (error) {
    logger.error("Error in webhook callback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process callback" },
      { status: 500 }
    );
  }
}