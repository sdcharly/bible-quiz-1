import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import * as crypto from "crypto";
import { db } from "@/lib/db";
import { quizzes, questions, quizAttempts, enrollments, educatorStudents } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { quizCache } from "@/lib/quiz-cache";
import { logger } from "@/lib/logger";


// Seeded shuffle function for consistent randomization per attempt
function shuffleArray<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Fisher-Yates shuffle with seeded random
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 9301 + 49297) % 233280;
    const j = Math.floor((hash / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Require authenticated student
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json(
        { error: "Unauthorized - Student access required" },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;

    // First, verify the quiz exists and get its educator
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId));

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Check if student is associated with the quiz's educator
    // This is now more permissive - we'll auto-create the relationship if needed
    const educatorRelation = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.educatorId, quiz.educatorId)
        )
      )
      .limit(1);

    // We don't block here anymore - relationship will be created if needed
    // This allows students who accessed via shareable link to take the quiz

    // Check if student is enrolled in this specific quiz
    // Get ALL enrollments (original and reassignments) for this student
    const allEnrollments = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          eq(enrollments.studentId, studentId)
        )
      )
      .orderBy(desc(enrollments.enrolledAt)); // Order by enrollment date (newest first)

    if (allEnrollments.length === 0) {
      // Check if quiz is published and accessible
      if (quiz.status !== 'published') {
        return NextResponse.json(
          { 
            error: "Quiz not available",
            message: "This quiz is not yet published."
          },
          { status: 403 }
        );
      }
      
      // Auto-enroll the student if they have access to this quiz
      // This happens when they come from a shareable link
      const enrollmentId = crypto.randomUUID();
      
      // Create educator-student relationship if it doesn't exist
      if (educatorRelation.length === 0) {
        await db.insert(educatorStudents).values({
          id: crypto.randomUUID(),
          educatorId: quiz.educatorId,
          studentId: studentId,
          status: 'active',
          enrolledAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // Create enrollment
      await db.insert(enrollments).values({
        id: enrollmentId,
        quizId: quizId,
        studentId: studentId,
        enrolledAt: new Date(),
        status: 'enrolled'
      });
      
      // Re-fetch the enrollment
      allEnrollments.push({
        id: enrollmentId,
        quizId: quizId,
        studentId: studentId,
        enrolledAt: new Date(),
        status: 'enrolled',
        completedAt: null,
        startedAt: null,
        isReassignment: false,
        reassignmentReason: null,
        parentEnrollmentId: null,
        groupEnrollmentId: null,
        reassignedAt: null,
        reassignedBy: null
      });
    }

    // Find the active enrollment (latest non-completed one)
    let activeEnrollment = null;
    let hasCompletedOriginal = false;
    
    for (const enrollment of allEnrollments) {
      if (enrollment.status === "completed") {
        if (!enrollment.isReassignment) {
          hasCompletedOriginal = true;
        }
      } else if (!activeEnrollment) {
        // This is the first non-completed enrollment
        activeEnrollment = enrollment;
      }
    }

    // If no active enrollment, all are completed
    if (!activeEnrollment) {
      return NextResponse.json(
        { 
          error: "No active enrollment",
          message: "You have completed all available attempts for this quiz."
        },
        { status: 403 }
      );
    }

    // Check if student has already attempted this specific enrollment
    const existingAttempts = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.enrollmentId, activeEnrollment.id)
        )
      )
      .orderBy(desc(quizAttempts.startTime));

    // First check if ANY attempt is completed - if so, block retake
    const completedAttempt = existingAttempts.find(a => a.status === "completed");
    if (completedAttempt) {
      logger.info("Blocking quiz retake - already completed", {
        studentId,
        quizId,
        completedAttemptId: completedAttempt.id,
        score: completedAttempt.score,
        completedAt: completedAttempt.endTime
      });
      return NextResponse.json(
        { 
          error: "Quiz already completed",
          message: "You have already completed this quiz. Each quiz can only be taken once.",
          attemptId: completedAttempt.id
        },
        { status: 403 }
      );
    }

    // Now check for in-progress attempts to resume
    const inProgressAttempt = existingAttempts.find(a => a.status === "in_progress");
    
    if (inProgressAttempt) {
      // If quiz is in progress, resume it
      // Calculate remaining time
      const elapsedTime = Math.floor((Date.now() - inProgressAttempt.startTime.getTime()) / 1000);
      // Use the quiz variable already fetched at the beginning of the function
      const remainingTime = Math.max(0, (quiz.duration * 60) - elapsedTime);
      
      if (remainingTime <= 0) {
        // Time's up, mark as completed
        await db
          .update(quizAttempts)
          .set({ 
            status: "completed",
            endTime: new Date()
          })
          .where(eq(quizAttempts.id, inProgressAttempt.id));
          
        return NextResponse.json(
          { 
            error: "Quiz time expired",
            message: "Your quiz time has expired. The quiz has been automatically submitted.",
            attemptId: inProgressAttempt.id
          },
          { status: 403 }
        );
      }
      
      // Return existing quiz data with remaining time
      const quizQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.quizId, quizId));


      // Sort questions - map with correct field names from database
      // CRITICAL FIX: Database columns use snake_case, must access them correctly
      let sortedQuestions = quizQuestions.map((q: any) => {
        // Access the actual database field names directly
        return {
          id: q.id,
          questionText: q.question_text || q.questionText || '',
          options: q.options || [],
          orderIndex: typeof q.order_index === 'number' ? q.order_index : (q.orderIndex || 0),
          book: q.book || null,
          chapter: q.chapter || null,
          topic: q.topic || null,
          bloomsLevel: q.blooms_level || q.bloomsLevel || null,
        };
      });
      
      // Ensure we have valid questions
      if (sortedQuestions.length === 0) {
        logger.error("No questions found after mapping for existing attempt", { quizId });
      }

      // Check if we have stored question order from when the quiz was started
      if (inProgressAttempt.questionOrder && Array.isArray(inProgressAttempt.questionOrder)) {
        // Use the stored shuffled order to maintain consistency
        const storedOrder = inProgressAttempt.questionOrder as {questionId: string, options: {id: string, text: string}[]}[];
        
        // Reconstruct questions in the same order the student saw them
        const reconstructedQuestions = storedOrder.map(stored => {
          const originalQuestion = sortedQuestions.find(q => q.id === stored.questionId);
          if (originalQuestion) {
            return {
              ...originalQuestion,
              options: stored.options // Use the stored shuffled options
            };
          }
          return null;
        }).filter((q): q is NonNullable<typeof q> => q !== null);
        
        if (reconstructedQuestions.length > 0) {
          sortedQuestions = reconstructedQuestions;
        }
      } else {
        // Fallback to old behavior if no stored order (for older attempts)
        // For reassignments, always shuffle regardless of quiz setting
        // Note: quiz variable is already fetched earlier in the function
        const shouldShuffle = quiz.shuffleQuestions || activeEnrollment.isReassignment;
        
        if (shouldShuffle) {
          // Use a seed based on attemptId for consistent shuffle per attempt
          sortedQuestions = shuffleArray(sortedQuestions, inProgressAttempt.id);
        } else {
          sortedQuestions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        }
      }

      return NextResponse.json({
        quiz: {
          id: quiz.id,
          title: quiz.title,
          duration: quiz.duration,
          totalQuestions: quiz.totalQuestions,
          questions: sortedQuestions
        },
        attemptId: inProgressAttempt.id,
        remainingTime,
        resumed: true
      });
    }

    // Quiz details already fetched above

    // For reassigned quizzes, skip time constraints
    // Reassigned students can take the quiz at their convenience
    if (!activeEnrollment.isReassignment) {
      // CRITICAL: Check if quiz has a scheduled time first
      if (!quiz.startTime) {
        // For deferred scheduling quizzes that haven't been scheduled yet
        return NextResponse.json(
          { 
            error: "Quiz time not set",
            message: "This quiz has not been scheduled yet. Please check back later or contact your educator.",
            schedulingStatus: quiz.schedulingStatus || 'unknown'
          },
          { status: 425 }
        );
      }

      // Check if quiz has started (only for original enrollments)
      const now = new Date();
      
      // Debug logging
      logger.force('[CRITICAL_DEBUG] Time comparison:', {
        now: now.toISOString(),
        nowTimestamp: now.getTime(),
        quizStartTime: quiz.startTime,
        quizStartTimeISO: quiz.startTime?.toISOString ? quiz.startTime.toISOString() : 'Invalid Date',
        quizStartTimeTimestamp: quiz.startTime?.getTime ? quiz.startTime.getTime() : 'Invalid',
        comparison: now < quiz.startTime,
        quizId: quizId,
        isReassignment: activeEnrollment.isReassignment
      });
      
      if (now < quiz.startTime) {
        // Calculate time until quiz starts
        const timeUntilStart = quiz.startTime.getTime() - now.getTime();
        const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
        const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
        
        let timeMessage = '';
        if (hoursUntilStart > 0) {
          timeMessage = `in ${hoursUntilStart} hour${hoursUntilStart > 1 ? 's' : ''} and ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}`;
        } else if (minutesUntilStart > 0) {
          timeMessage = `in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}`;
        } else {
          timeMessage = 'starting soon';
        }
        
        return NextResponse.json(
          { 
            error: "Quiz not started",
            // Don't format the message here - let the frontend handle timezone conversion
            message: `Quiz not yet started`,
            startTime: quiz.startTime.toISOString(),
            timezone: quiz.timezone || 'UTC',
            timeUntilStart: timeMessage
          },
          { status: 425 }
        );
      }

      // Check if quiz has ended (only for original enrollments)
      const endTime = new Date(quiz.startTime.getTime() + quiz.duration * 60 * 1000);
      if (now > endTime) {
        return NextResponse.json(
          { 
            error: "Quiz has ended",
            message: "This quiz has already ended and is no longer available.",
            endTime: endTime.toISOString()
          },
          { status: 410 } // 410 Gone
        );
      }
    }

    // Fetch quiz questions from database (caching disabled for now due to type issues)
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    // Create attempt ID first (needed for seeding shuffle)
    const attemptId = crypto.randomUUID();

    // Prepare questions - map with correct field names from database  
    // CRITICAL FIX: Database columns use snake_case, must access them correctly
    let preparedQuestions = quizQuestions.map((q: any) => {
      // Access the actual database field names directly
      return {
        id: q.id,
        questionText: q.question_text || q.questionText || '',
        options: q.options || [],
        orderIndex: typeof q.order_index === 'number' ? q.order_index : (q.orderIndex || 0),
        book: q.book || null,
        chapter: q.chapter || null,
        topic: q.topic || null,
        bloomsLevel: q.blooms_level || q.bloomsLevel || null,
      };
    });
    
    // Validate we have questions
    if (preparedQuestions.length === 0) {
      logger.error("CRITICAL: No questions prepared for quiz", {
        quizId,
        rawCount: quizQuestions.length,
        firstRaw: quizQuestions[0] ? Object.keys(quizQuestions[0]) : 'no questions'
      });
      return NextResponse.json(
        { error: "Quiz has no questions available" },
        { status: 500 }
      );
    }
    
    // For reassignments, always shuffle regardless of quiz setting
    const shouldShuffle = quiz.shuffleQuestions || activeEnrollment.isReassignment;
    
    if (shouldShuffle) {
      // Use attemptId as seed for consistent shuffle per attempt
      // For reassignments, add enrollment id to make shuffle different from original
      const seed = activeEnrollment.isReassignment 
        ? attemptId + activeEnrollment.id 
        : attemptId;
      preparedQuestions = shuffleArray(preparedQuestions, seed);
    } else {
      preparedQuestions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }
    
    // Store the shuffled question order that will be shown to the student
    const questionOrderForAttempt = preparedQuestions.map(q => ({
      questionId: q.id,
      options: q.options // This preserves the shuffled order of options
    }));
    
    // Create new attempt
    const attemptData = {
      id: attemptId,
      quizId,
      studentId,
      enrollmentId: activeEnrollment.id, // Link to the specific enrollment
      startTime: new Date(),
      status: "in_progress" as const,
      answers: [],  // Changed from {} to [] to match schema
      totalQuestions: quizQuestions.length,
      questionOrder: questionOrderForAttempt, // Store the shuffled order
      createdAt: new Date(),
    };
    
    await db.insert(quizAttempts).values(attemptData);
    
    // Track attempt in cache for fast access
    await quizCache.trackAttempt(attemptId, {
      id: attemptId,
      quizId,
      studentId,
      status: "in_progress",
      startTime: attemptData.startTime,
      answers: {}
    });

    // Update enrollment status to in_progress
    await db
      .update(enrollments)
      .set({ 
        status: "in_progress",
        startedAt: new Date()
      })
      .where(eq(enrollments.id, activeEnrollment.id));

    // Prepare quiz data for response and cache
    const quizData = {
      id: quiz.id,
      title: quiz.title,
      duration: quiz.duration,
      totalQuestions: quiz.totalQuestions,
      questions: preparedQuestions,
      startTime: quiz.startTime || undefined,
      status: quiz.status
    };
    
    // Cache the prepared quiz data
    await quizCache.cacheQuizData(quizId, quizData);
    
    // Cache enrollment status
    await quizCache.cacheEnrollment(studentId, quizId, true);
    
    // Debug log for reassignment issue
    logger.force('[CRITICAL_DEBUG] API Response being sent:', {
      quizId: quizData.id,
      hasQuestions: !!quizData.questions,
      questionCount: quizData.questions?.length || 0,
      firstQuestion: quizData.questions?.[0] ? {
        id: quizData.questions[0].id,
        hasText: !!quizData.questions[0].questionText,
        textLength: quizData.questions[0].questionText?.length || 0
      } : null,
      isReassignment: activeEnrollment.isReassignment
    });
    
    // Return quiz data without correct answers
    return NextResponse.json({
      quiz: quizData,
      attemptId,
      remainingTime: quiz.duration * 60, // Full time in seconds
      isReassignment: activeEnrollment.isReassignment || false,
      reassignmentReason: activeEnrollment.reassignmentReason || null
    });

  } catch (error) {
    logger.error("Error starting quiz:", error);
    return NextResponse.json(
      { error: "Failed to start quiz" },
      { status: 500 }
    );
  }
}