import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, documents, user } from "@/lib/schema";
import { inArray, eq } from "drizzle-orm";
import * as crypto from "crypto";
import { QuestionValidator, QuestionToValidate } from "@/lib/question-validator";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { checkEducatorPermission, checkEducatorLimits, getPermissionMessage } from "@/lib/permissions";

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
      startTime = new Date().toISOString(),
      timezone = "Asia/Kolkata",
      duration = 30,
      shuffleQuestions = false,
    } = body;

    const quizId = crypto.randomUUID();

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

    let questionsData = [];
    let webhookTimedOut = false;

    // Check if webhook is configured
    if (process.env.QUIZ_GENERATION_WEBHOOK_URL) {
      // Log the webhook URL and payload for debugging
      console.log("Calling webhook:", process.env.QUIZ_GENERATION_WEBHOOK_URL);
      
      const webhookPayload = {
        documentIds,
        documentMetadata, // Include full document metadata
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
      
      console.log("Webhook payload:", JSON.stringify(webhookPayload, null, 2));
      
      // Call the quiz generation webhook with enhanced document metadata
      console.log("Calling webhook (waiting for response)...");
      const startTime = Date.now();
      
      let webhookResponse;
      try {
        webhookResponse = await fetch(process.env.QUIZ_GENERATION_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
          signal: AbortSignal.timeout(100000), // 100 second timeout (Cloudflare max)
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`Webhook responded in ${responseTime}ms (${(responseTime/1000).toFixed(1)}s)`);
      } catch (fetchError) {
        const responseTime = Date.now() - startTime;
        console.error(`Fetch error after ${responseTime}ms:`, fetchError);
        // If the fetch itself times out, use sample questions
        webhookTimedOut = true;
        questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
        
        // Skip the rest of webhook processing
        webhookResponse = null;
      }
      
      if (webhookResponse) {

      console.log("Webhook response status:", webhookResponse.status);
      console.log("Webhook response headers:", Object.fromEntries(webhookResponse.headers.entries()));

      if (webhookResponse.ok) {
        // First, get the response as text to check if it's empty
        const responseText = await webhookResponse.text();
        console.log("Webhook response text length:", responseText?.length || 0);
        console.log("Webhook response text:", responseText);
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
          console.error("Webhook returned empty response");
          console.error("Response status was OK but body is empty");
          // Use sample questions if webhook returns empty
          webhookTimedOut = true;
          questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
        } else {
          // Try to parse JSON
          let webhookData;
          try {
            webhookData = JSON.parse(responseText);
          } catch (parseError) {
            console.error("Failed to parse webhook response:", responseText);
            // Use sample questions if JSON parsing fails
            webhookTimedOut = true;
            questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
          }
          
          if (webhookData) {
            // Handle the response format from the webhook
            // The response is an array with an object containing output.questions
            if (Array.isArray(webhookData) && webhookData[0]?.output?.questions) {
              questionsData = webhookData[0].output.questions;
            } else if (webhookData.output?.questions) {
              questionsData = webhookData.output.questions;
            } else if (webhookData.questions) {
              questionsData = webhookData.questions;
            } else if (Array.isArray(webhookData)) {
              questionsData = webhookData;
            }
            
            console.log(`Received ${questionsData.length} questions from webhook`);
            
            // If still no questions, use sample questions
            if (!questionsData || questionsData.length === 0) {
              console.log("No questions received from webhook, using sample questions");
              webhookTimedOut = true;
              questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
            }
          }
        }
      } else {
        // Handle non-OK responses
        const errorText = await webhookResponse.text();
        console.error("Webhook failed:", {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          headers: Object.fromEntries(webhookResponse.headers.entries()),
          error: errorText,
          webhookUrl: process.env.QUIZ_GENERATION_WEBHOOK_URL
        });
        
        // For 504 Gateway Timeout, use sample questions instead of throwing error
        if (webhookResponse.status === 504) {
          console.error("Gateway timeout (504) - The webhook took too long to respond.");
          webhookTimedOut = true;
          questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
        } else if (webhookResponse.status === 404) {
          throw new Error(`Webhook endpoint not found (404). Please check the webhook URL configuration.`);
        } else if (webhookResponse.status === 500) {
          throw new Error(`Webhook server error (500). The webhook service encountered an internal error.`);
        } else if (webhookResponse.status === 503) {
          throw new Error(`Webhook service unavailable (503). The service may be down or overloaded.`);
        } else if (webhookResponse.status >= 400 && webhookResponse.status < 500) {
          throw new Error(`Webhook request error (${webhookResponse.status}): ${errorText || webhookResponse.statusText}`);
        } else {
          throw new Error(`Webhook failed with status ${webhookResponse.status}: ${errorText || webhookResponse.statusText}`);
        }
      }
      } // End of if (webhookResponse)
    } else {
      // If no webhook configured, use sample questions
      console.log("No webhook configured, using sample questions");
      questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
    }

    // Validate questions before saving
    let validationResults = null;
    let validationSummary = null;
    
    if (questionsData && questionsData.length > 0) {
      try {
        console.log("Validating generated questions...");
        
        // Convert questionsData to QuestionToValidate format
        const questionsToValidate: QuestionToValidate[] = questionsData.map((q: Record<string, unknown>, index: number) => {
          // Convert options object to array format if needed
          let optionsArray = [];
          if (q.options) {
            if (Array.isArray(q.options)) {
              optionsArray = q.options;
            } else if (typeof q.options === 'object') {
              // Convert {A: "text", B: "text"} to [{id: "A", text: "text"}]
              optionsArray = Object.entries(q.options).map(([key, value]) => ({
                id: key.toLowerCase(),
                text: value as string
              }));
            }
          }
          
          return {
            id: `q_${index}`,
            questionText: (q.question as string) || (q.questionText as string),
            options: optionsArray,
            correctAnswer: (q.correct_answer as string)?.toLowerCase() || (q.correctAnswer as string)?.toLowerCase() || 'a',
            explanation: q.explanation as string
          };
        });

        // Validate all questions
        validationResults = await QuestionValidator.validateQuestions(questionsToValidate);
        validationSummary = QuestionValidator.getValidationSummary(validationResults);
        
        console.log(`Question validation completed: ${validationSummary.validQuestions}/${validationSummary.totalQuestions} valid (avg score: ${validationSummary.averageScore})`);
        
        // Log validation issues for debugging
        if (validationSummary.issueCount.high > 0 || validationSummary.issueCount.medium > 0) {
          console.log("Validation issues found:", {
            highSeverity: validationSummary.issueCount.high,
            mediumSeverity: validationSummary.issueCount.medium,
            lowSeverity: validationSummary.issueCount.low
          });
        }

      } catch (validationError) {
        console.error("Error during question validation:", validationError);
        // Continue with quiz creation even if validation fails
      }
    }

    // Save quiz to database
    const newQuiz = await db.insert(quizzes).values({
      id: quizId,
      educatorId: educatorId, // Use authenticated educator's ID
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
      totalQuestions: questionsData.length || questionCount,
      passingScore: 70, // Default passing score since we're not collecting it from UI
      shuffleQuestions,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Save questions if they were generated
    if (questionsData && questionsData.length > 0) {
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        
        // Convert options object to array format if needed
        let optionsArray = [];
        if (q.options) {
          if (Array.isArray(q.options)) {
            optionsArray = q.options;
          } else if (typeof q.options === 'object') {
            // Convert {A: "text", B: "text"} to [{id: "A", text: "text"}]
            optionsArray = Object.entries(q.options).map(([key, value]) => ({
              id: key.toLowerCase(),
              text: value as string
            }));
          }
        }
        
        // Map question_type to a valid bloomsLevel if needed
        let mappedBloomsLevel = null;
        if (bloomsLevels && bloomsLevels.length > 0) {
          // Use the first bloomsLevel from the request as default
          mappedBloomsLevel = bloomsLevels[0];
        }
        
        // If the question has a bloomsLevel that's valid, use it
        if (q.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(q.bloomsLevel)) {
          mappedBloomsLevel = q.bloomsLevel;
        }
        
        // Parse biblical reference more accurately
        let parsedBook = q.book || books[0];
        let parsedChapter = q.chapter || chapters[0];
        
        if (q.biblical_reference) {
          // Handle formats like "Proverbs 6:6-8 (NIV)" or "1 Corinthians 13:4-7"
          const refParts = q.biblical_reference.trim().split(/\s+/);
          
          // Check if it's a book with a number prefix (e.g., "1 Corinthians", "2 Kings")
          if (refParts[0] && /^\d+$/.test(refParts[0]) && refParts[1]) {
            parsedBook = `${refParts[0]} ${refParts[1]}`;
            // The chapter and verse is the next part
            parsedChapter = refParts[2]?.replace(/\(.*\)/, '').trim() || '';
          } else {
            parsedBook = refParts[0];
            // Everything after the book name until any parenthesis
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
          difficulty: q.difficulty || difficulty,
          bloomsLevel: mappedBloomsLevel, // Use the mapped blooms level
          topic: q.topic || q.question_type, // question_type can be used for topic
          book: parsedBook,
          chapter: parsedChapter, // Now stores full chapter:verse reference like "6:6-8"
          orderIndex: q.id || i,
          createdAt: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      quizId,
      quiz: newQuiz[0],
      questionsCreated: questionsData.length,
      webhookTimedOut,
      validation: validationSummary ? {
        summary: validationSummary,
        hasIssues: validationSummary.issueCount.high > 0 || validationSummary.issueCount.medium > 0,
        overallValid: validationSummary.overallValid
      } : null,
      message: webhookTimedOut 
        ? "The question generation service timed out. Sample questions have been created. You can edit them in the review page." 
        : validationSummary && !validationSummary.overallValid
        ? `Quiz created successfully, but ${validationSummary.totalQuestions - validationSummary.validQuestions} questions may need review due to validation issues.`
        : undefined
    });

  } catch (error) {
    console.error("Error creating quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quiz" },
      { status: 500 }
    );
  }
}

// Helper function to generate sample questions
function getSampleQuestions(books: string[], difficulty: string, bloomsLevels: string[]) {
  return [
    {
      id: 1,
      question: `Sample Question: According to ${books[0] || 'the Bible'}, what is the main theme discussed?`,
      options: {
        A: "God's sovereignty and human responsibility",
        B: "The importance of ritual observance",
        C: "The genealogy of ancient peoples",
        D: "The construction of religious buildings"
      },
      correct_answer: "a",
      explanation: "This is a sample question. The webhook timed out or failed, so this placeholder was created. You can edit this question in the review page.",
      biblical_reference: `${books[0] || 'Genesis'} 1:1`,
      difficulty: difficulty || "medium",
      question_type: bloomsLevels?.[0] || "knowledge"
    },
    {
      id: 2,
      question: "Sample Question: What lesson can we learn from this passage?",
      options: {
        A: "Trust in God's providence",
        B: "Rely on human wisdom",
        C: "Focus on material wealth",
        D: "Avoid all challenges"
      },
      correct_answer: "a",
      explanation: "This is a sample question created because the webhook timed out or failed. Please edit this question with actual content.",
      biblical_reference: `${books[0] || 'Psalms'} 23:1`,
      difficulty: difficulty || "medium",
      question_type: bloomsLevels?.[0] || "comprehension"
    },
    {
      id: 3,
      question: "Sample Question: How can we apply this biblical principle in our daily lives?",
      options: {
        A: "Through prayer and meditation on God's Word",
        B: "By ignoring spiritual matters",
        C: "Through self-reliance only",
        D: "By avoiding community involvement"
      },
      correct_answer: "a",
      explanation: "This is a placeholder question. Edit this with relevant content based on your selected passages.",
      biblical_reference: `${books[0] || 'Matthew'} 6:33`,
      difficulty: difficulty || "medium",
      question_type: bloomsLevels?.[1] || "application"
    }
  ];
}