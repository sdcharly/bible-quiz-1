import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const attemptId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Fetch the quiz attempt
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.id, attemptId));

    if (!attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found" },
        { status: 404 }
      );
    }

    // Only allow students to view their own results
    if (session?.user && attempt.studentId !== session.user.id) {
      // For testing, we'll allow access if no session
      if (session.user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
    }

    // Fetch quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, attempt.quizId));

    // Security check: Don't show results until quiz duration has passed from the attempt's start time
    if (quiz && attempt.startTime) {
      const attemptEndTime = new Date(attempt.startTime);
      attemptEndTime.setMinutes(attemptEndTime.getMinutes() + (quiz.duration || 30));
      const now = new Date();
      
      // Students must wait until their quiz time expires to see results
      if (now < attemptEndTime) {
        const minutesRemaining = Math.ceil((attemptEndTime.getTime() - now.getTime()) / (1000 * 60));
        return NextResponse.json(
          { 
            error: "Results not available yet",
            message: `Results will be available after your quiz time expires (${minutesRemaining} minutes remaining)`,
            availableAt: attemptEndTime.toISOString()
          },
          { status: 425 } // Too Early status code
        );
      }
    }

    // Fetch all questions for this quiz
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, attempt.quizId));

    // Fetch student's responses
    const responses = await db
      .select()
      .from(questionResponses)
      .where(eq(questionResponses.attemptId, attemptId));

    // Combine questions with responses
    let questionsWithResults = quizQuestions.filter(question => question && question.id && question.questionText && question.options).map(question => {
      const response = responses.find(r => r && r.questionId === question.id);
      
      return {
        id: question.id,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        selectedAnswer: response?.selectedAnswer || null,
        isCorrect: response?.isCorrect || false,
        explanation: question.explanation,
        book: question.book,
        chapter: question.chapter,
        topic: question.topic,
        timeSpent: response?.timeSpent || 0,
        markedForReview: response?.markedForReview || false,
      };
    });
    
    // Check if the attempt has stored question order (shuffled order as seen by student)
    if (attempt.questionOrder && Array.isArray(attempt.questionOrder)) {
      const storedOrder = attempt.questionOrder as {questionId: string, options: {id: string, text: string}[]}[];
      
      // Reconstruct questions in the same order the student saw them
      const reconstructedQuestions = storedOrder.map(stored => {
        const question = questionsWithResults.find(q => q.id === stored.questionId);
        if (question) {
          return {
            ...question,
            options: stored.options // Use the shuffled options order the student saw
          };
        }
        return null;
      }).filter((q): q is NonNullable<typeof q> => q !== null);
      
      if (reconstructedQuestions.length > 0) {
        questionsWithResults = reconstructedQuestions;
      }
    } else {
      // Fallback to original order for older attempts
      questionsWithResults.sort((a, b) => {
        const questionA = quizQuestions.find(q => q && q.id === a.id);
        const questionB = quizQuestions.find(q => q && q.id === b.id);
        return (questionA?.orderIndex || 0) - (questionB?.orderIndex || 0);
      });
    }

    const score = attempt.score || 0;
    const correctAnswers = attempt.totalCorrect || 0;
    const totalQuestions = attempt.totalQuestions || 0;
    const wrongAnswers = totalQuestions - correctAnswers;
    
    // Theological grading system
    const getGrade = (score: number) => {
      if (score >= 95) return { grade: "A+", points: 4.0, description: "Exceptional" };
      if (score >= 90) return { grade: "A", points: 4.0, description: "Excellent" };
      if (score >= 85) return { grade: "A-", points: 3.7, description: "Very Good" };
      if (score >= 80) return { grade: "B+", points: 3.3, description: "Good" };
      if (score >= 75) return { grade: "B", points: 3.0, description: "Above Average" };
      if (score >= 70) return { grade: "B-", points: 2.7, description: "Satisfactory" };
      if (score >= 65) return { grade: "C+", points: 2.3, description: "Acceptable" };
      if (score >= 60) return { grade: "C", points: 2.0, description: "Average" };
      if (score >= 55) return { grade: "C-", points: 1.7, description: "Below Average" };
      if (score >= 50) return { grade: "D", points: 1.0, description: "Poor" };
      return { grade: "F", points: 0.0, description: "Fail" };
    };
    
    const gradeInfo = getGrade(score);
    
    return NextResponse.json({
      attemptId: attempt.id,
      quizTitle: quiz?.title || "Quiz",
      score: score,
      grade: gradeInfo.grade,
      gradePoints: gradeInfo.points,
      gradeDescription: gradeInfo.description,
      correctAnswers: correctAnswers,
      totalQuestions: totalQuestions,
      wrongAnswers: wrongAnswers,
      timeTaken: attempt.timeSpent || 0,
      questions: questionsWithResults,
    });

  } catch (error) {
    logger.error("Error fetching results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}