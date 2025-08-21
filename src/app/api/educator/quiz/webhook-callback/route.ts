import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/quiz-generation-jobs";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, status, questionsData, error } = body;
    
    console.log(`[QUIZ CREATE CALLBACK] Received callback for job: ${jobId}`);

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }
    
    // Safety check: Don't process replacement jobs here
    if (jobId.startsWith('replace-')) {
      console.error(`[QUIZ CREATE CALLBACK] Wrong endpoint! This is a replacement job: ${jobId}`);
      console.error(`Should be sent to /api/educator/quiz/webhook-callback-replace`);
      return NextResponse.json(
        { error: "Wrong callback endpoint - this is a replacement job. Use /api/educator/quiz/webhook-callback-replace" },
        { status: 400 }
      );
    }

    // Get the job from store
    const job = jobStore.get(jobId);
    if (!job) {
      console.error(`Job not found: ${jobId}`);
      return NextResponse.json(
        { error: "Job not found or expired" },
        { status: 404 }
      );
    }

    // Update job status based on callback
    if (status === 'success' && questionsData) {
      // Process successful generation
      console.log(`Received ${questionsData.length} questions for job ${jobId}`);
      
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
            console.warn(`Skipping invalid question ${i + 1} for job ${jobId}:`, {
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
            bloomsLevel: q.bloomsLevel || webhookPayload.bloomsLevel?.[0] || 'knowledge',
            topic: cleanString(q.topic || q.question_type).substring(0, 100),
            book: cleanString(parsedBook).substring(0, 100),
            chapter: cleanString(parsedChapter).substring(0, 100),
            orderIndex: q.id || i,
            createdAt: new Date(),
          });
          
          insertedQuestions.push(q);
        } catch (insertError) {
          console.error(`Failed to insert question ${i + 1} for job ${jobId}:`, insertError);
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
      
      console.log(`Job ${jobId} completed: ${statusMessage}`);
    } else if (status === 'error' || error) {
      // Handle error case
      jobStore.update(jobId, {
        status: 'failed',
        progress: 0,
        message: error || 'Quiz generation failed',
        error: error || 'Unknown error occurred'
      });
      
      console.error(`Job ${jobId} failed:`, error);
    } else {
      // Update progress (n8n might send progress updates)
      const progress = body.progress || 50;
      const message = body.message || 'Processing quiz generation...';
      
      jobStore.update(jobId, {
        status: 'processing',
        progress,
        message
      });
      
      console.log(`Job ${jobId} progress update: ${progress}%`);
    }

    return NextResponse.json({
      success: true,
      jobId,
      message: "Callback received successfully"
    });

  } catch (error) {
    console.error("Error in webhook callback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process callback" },
      { status: 500 }
    );
  }
}