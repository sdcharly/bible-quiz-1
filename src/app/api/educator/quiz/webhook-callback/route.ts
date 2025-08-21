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
      
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        
        // Convert options to array format if needed
        let optionsArray = [];
        if (q.options) {
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (typeof q.options === 'object') {
            optionsArray = Object.entries(q.options).map(([key, value]) => ({
              id: key.toLowerCase(),
              text: value as string
            }));
          }
        }
        
        // Parse biblical reference
        let parsedBook = q.book || (webhookPayload.books && webhookPayload.books[0]);
        let parsedChapter = q.chapter || (webhookPayload.chapters && webhookPayload.chapters[0]);
        
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
        
        await db.insert(questions).values({
          id: crypto.randomUUID(),
          quizId,
          questionText: q.question || q.questionText,
          options: optionsArray,
          correctAnswer: q.correct_answer?.toLowerCase() || q.correctAnswer?.toLowerCase(),
          explanation: q.explanation,
          difficulty: q.difficulty || webhookPayload.difficulty,
          bloomsLevel: q.bloomsLevel || webhookPayload.bloomsLevel?.[0],
          topic: q.topic || q.question_type,
          book: parsedBook,
          chapter: parsedChapter,
          orderIndex: q.id || i,
          createdAt: new Date(),
        });
      }
      
      // Update job as completed
      jobStore.update(jobId, {
        status: 'completed',
        progress: 100,
        message: `Successfully generated ${questionsData.length} questions`,
        questionsData
      });
      
      console.log(`Job ${jobId} completed successfully`);
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