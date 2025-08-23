import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, quizAttempts, enrollments, educatorStudents } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import * as crypto from "crypto";

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
    const existingAttempt = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.enrollmentId, activeEnrollment.id)
        )
      );

    if (existingAttempt.length > 0) {
      const attempt = existingAttempt[0];
      
      // If quiz is completed, don't allow restart
      if (attempt.status === "completed") {
        return NextResponse.json(
          { 
            error: "Quiz already completed",
            message: "You have already completed this quiz. Each quiz can only be taken once.",
            attemptId: attempt.id
          },
          { status: 403 }
        );
      }
      
      // If quiz is in progress, resume it
      if (attempt.status === "in_progress") {
        // Calculate remaining time
        const elapsedTime = Math.floor((Date.now() - attempt.startTime.getTime()) / 1000);
        const quiz = await db
          .select()
          .from(quizzes)
          .where(eq(quizzes.id, quizId));
          
        const remainingTime = Math.max(0, (quiz[0].duration * 60) - elapsedTime);
        
        if (remainingTime <= 0) {
          // Time's up, mark as completed
          await db
            .update(quizAttempts)
            .set({ 
              status: "completed",
              endTime: new Date()
            })
            .where(eq(quizAttempts.id, attempt.id));
            
          return NextResponse.json(
            { 
              error: "Quiz time expired",
              message: "Your quiz time has expired. The quiz has been automatically submitted.",
              attemptId: attempt.id
            },
            { status: 403 }
          );
        }
        
        // Return existing quiz data with remaining time
        const quizQuestions = await db
          .select()
          .from(questions)
          .where(eq(questions.quizId, quizId));

        // Sort questions - shuffle if enabled, otherwise by orderIndex
        let sortedQuestions = quizQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          orderIndex: q.orderIndex,
          book: q.book,
          chapter: q.chapter,
          topic: q.topic,
          bloomsLevel: q.bloomsLevel,
        }));

        // For reassignments, always shuffle regardless of quiz setting
        const shouldShuffle = quiz[0].shuffleQuestions || activeEnrollment.isReassignment;
        
        if (shouldShuffle) {
          // Use a seed based on attemptId for consistent shuffle per attempt
          sortedQuestions = shuffleArray(sortedQuestions, attempt.id);
        } else {
          sortedQuestions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        }

        return NextResponse.json({
          quiz: {
            id: quiz[0].id,
            title: quiz[0].title,
            duration: quiz[0].duration,
            totalQuestions: quiz[0].totalQuestions,
            questions: sortedQuestions
          },
          attemptId: attempt.id,
          remainingTime,
          resumed: true
        });
      }
    }

    // Quiz details already fetched above

    // Check if quiz has started
    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      return NextResponse.json(
        { 
          error: "Quiz not started",
          message: `This quiz will start at ${quiz.startTime.toLocaleString()}`
        },
        { status: 425 }
      );
    }

    // Fetch quiz questions (without correct answers)
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    // Create new attempt
    const attemptId = crypto.randomUUID();
    
    await db.insert(quizAttempts).values({
      id: attemptId,
      quizId,
      studentId,
      enrollmentId: activeEnrollment.id, // Link to the specific enrollment
      startTime: new Date(),
      status: "in_progress",
      answers: [],
      totalQuestions: quizQuestions.length,
      createdAt: new Date(),
    });

    // Update enrollment status to in_progress
    await db
      .update(enrollments)
      .set({ 
        status: "in_progress",
        startedAt: new Date()
      })
      .where(eq(enrollments.id, activeEnrollment.id));

    // Prepare questions - shuffle if enabled or if this is a reassignment
    let preparedQuestions = quizQuestions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      orderIndex: q.orderIndex,
      book: q.book,
      chapter: q.chapter,
      topic: q.topic,
      bloomsLevel: q.bloomsLevel,
    }));

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

    // Return quiz data without correct answers
    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        duration: quiz.duration,
        totalQuestions: quiz.totalQuestions,
        questions: preparedQuestions
      },
      attemptId,
      remainingTime: quiz.duration * 60, // Full time in seconds
      isReassignment: activeEnrollment.isReassignment || false,
      reassignmentReason: activeEnrollment.reassignmentReason || null
    });

  } catch (error) {
    console.error("Error starting quiz:", error);
    return NextResponse.json(
      { error: "Failed to start quiz" },
      { status: 500 }
    );
  }
}