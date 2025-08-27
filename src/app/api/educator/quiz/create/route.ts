import { NextRequest, NextResponse } from "next/server";
import { inArray, eq, and, ne } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizzes, questions, documents, user } from "@/lib/schema";
import { QuestionValidator, QuestionToValidate } from "@/lib/question-validator";
import { auth } from "@/lib/auth";
import { checkEducatorPermission, checkEducatorLimits, getPermissionMessage } from "@/lib/permissions";
import { logger } from "@/lib/logger";


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

    // Check if educator has reached their quiz limit (excluding archived quizzes)
    const currentQuizCount = await db.select({ count: quizzes.id })
      .from(quizzes)
      .where(and(
        eq(quizzes.educatorId, educatorId),
        ne(quizzes.status, "archived")
      ));
    
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
        // Use the permanent document ID for LightRAG operations
        // Do NOT use trackId as it's only for status checking
        lightragDocumentId: processedData?.lightragDocumentId || processedData?.permanentDocId,
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
      // [REMOVED: Console statement for performance]
      
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
      
      // [REMOVED: Console statement for performance]);
      
      // Call the quiz generation webhook with enhanced document metadata
      // [REMOVED: Console statement for performance]...");
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
        // [REMOVED: Console statement for performance].toFixed(1)}s)`);
      } catch (fetchError) {
        const responseTime = Date.now() - startTime;
        // [REMOVED: Console statement for performance]
        // If the fetch itself times out, use sample questions
        webhookTimedOut = true;
        questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
        
        // Skip the rest of webhook processing
        webhookResponse = null;
      }
      
      if (webhookResponse) {

      // [REMOVED: Console statement for performance]
      // [REMOVED: Console statement for performance]));

      if (webhookResponse.ok) {
        // First, get the response as text to check if it's empty
        const responseText = await webhookResponse.text();
        // [REMOVED: Console statement for performance]
        // [REMOVED: Console statement for performance]
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
          // [REMOVED: Console statement for performance]
          // [REMOVED: Console statement for performance]
          // Use sample questions if webhook returns empty
          webhookTimedOut = true;
          questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
        } else {
          // Try to parse JSON
          let webhookData;
          try {
            webhookData = JSON.parse(responseText);
          } catch (parseError) {
            // [REMOVED: Console statement for performance]
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
            
            // [REMOVED: Console statement for performance]
            
            // If still no questions, use sample questions
            if (!questionsData || questionsData.length === 0) {
              // [REMOVED: Console statement for performance]
              webhookTimedOut = true;
              questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
            }
          }
        }
      } else {
        // Handle non-OK responses
        const errorText = await webhookResponse.text();
        // [REMOVED: Console statement for performance]
        logger.error("Webhook error response", {
          status: webhookResponse.status,
          error: errorText,
          webhookUrl: process.env.QUIZ_GENERATION_WEBHOOK_URL
        });
        
        // For 504 Gateway Timeout, use sample questions instead of throwing error
        if (webhookResponse.status === 504) {
          // [REMOVED: Console statement for performance] - The webhook took too long to respond.");
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
      // [REMOVED: Console statement for performance]
      questionsData = getSampleQuestions(books, difficulty, bloomsLevels);
    }

    // Validate questions before saving
    let validationResults = null;
    let validationSummary = null;
    
    if (questionsData && questionsData.length > 0) {
      try {
        // [REMOVED: Console statement for performance]
        
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
        
        // [REMOVED: Console statement for performance]`);
        
        // Log validation issues for debugging
        if (validationSummary.issueCount.high > 0 || validationSummary.issueCount.medium > 0) {
          // [REMOVED: Console statement for performance]
        }

      } catch (validationError) {
        // [REMOVED: Console statement for performance]
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
        
        // If the question has a bloomsLevel that's valid, use it
        if (q.bloomsLevel && ["knowledge", "comprehension", "application", "analysis", "synthesis", "evaluation"].includes(q.bloomsLevel)) {
          mappedBloomsLevel = q.bloomsLevel;
        } 
        // Try to map question_type to bloomsLevel
        else if (q.question_type) {
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
        
        // Fallback to request bloomsLevels or default
        if (!mappedBloomsLevel) {
          if (bloomsLevels && bloomsLevels.length > 0) {
            mappedBloomsLevel = bloomsLevels[0];
          } else {
            mappedBloomsLevel = 'knowledge';
          }
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
    // [REMOVED: Console statement for performance]
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