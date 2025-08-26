import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes, user } from "@/lib/schema";
import { auth } from "@/lib/auth";


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
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        totalCorrect: quizAttempts.totalCorrect,
        totalQuestions: quizAttempts.totalQuestions,
        timeSpent: quizAttempts.timeSpent,
        startTime: quizAttempts.startTime,
        endTime: quizAttempts.endTime,
        status: quizAttempts.status,
        studentName: user.name,
        studentEmail: user.email,
      })
      .from(quizAttempts)
      .leftJoin(user, eq(quizAttempts.studentId, user.id))
      .where(eq(quizAttempts.id, attemptId));

    if (!attempt) {
      return NextResponse.json(
        { error: "Quiz attempt not found" },
        { status: 404 }
      );
    }

    // Fetch quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, attempt.quizId));

    // Verify educator owns this quiz (for production)
    // if (session?.user && quiz.educatorId !== session.user.id) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 403 }
    //   );
    // }

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

    // Combine questions with responses for detailed analytics
    const questionsWithAnalytics = quizQuestions.map(question => {
      const response = responses.find(r => r.questionId === question.id);
      
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
        difficulty: question.difficulty,
        bloomsLevel: question.bloomsLevel,
        timeSpent: response?.timeSpent || 0,
        markedForReview: response?.markedForReview || false,
        answeredAt: response?.answeredAt,
      };
    }).sort((a, b) => {
      const questionA = quizQuestions.find(q => q.id === a.id);
      const questionB = quizQuestions.find(q => q.id === b.id);
      return (questionA?.orderIndex || 0) - (questionB?.orderIndex || 0);
    });

    // Calculate detailed analytics
    const analytics = {
      byDifficulty: {
        easy: {
          total: 0,
          correct: 0,
          percentage: 0
        },
        medium: {
          total: 0,
          correct: 0,
          percentage: 0
        },
        hard: {
          total: 0,
          correct: 0,
          percentage: 0
        }
      },
      byBloomsLevel: {} as Record<string, { total: number; correct: number; percentage: number }>,
      byTopic: {} as Record<string, { total: number; correct: number; percentage: number }>,
      timeAnalysis: {
        averageTimePerQuestion: 0,
        fastestQuestion: null as { questionNumber: number; questionText: string; time: number } | null,
        slowestQuestion: null as { questionNumber: number; questionText: string; time: number } | null,
        totalTime: attempt.timeSpent || 0
      },
      questionPerformance: [] as { questionNumber: number; isCorrect: boolean; timeSpent: number; topic?: string; difficulty?: string; bloomsLevel?: string }[]
    };

    // Process questions for analytics
    let totalTime = 0;
    let fastestTime = Infinity;
    let slowestTime = 0;
    let fastestQuestion = null;
    let slowestQuestion = null;

    questionsWithAnalytics.forEach((q, index) => {
      // Difficulty analysis
      const difficulty = (q.difficulty || 'medium').toLowerCase();
      if (difficulty in analytics.byDifficulty) {
        analytics.byDifficulty[difficulty as keyof typeof analytics.byDifficulty].total++;
        if (q.isCorrect) {
          analytics.byDifficulty[difficulty as keyof typeof analytics.byDifficulty].correct++;
        }
      }

      // Bloom's taxonomy analysis
      if (q.bloomsLevel) {
        if (!analytics.byBloomsLevel[q.bloomsLevel]) {
          analytics.byBloomsLevel[q.bloomsLevel] = { total: 0, correct: 0, percentage: 0 };
        }
        analytics.byBloomsLevel[q.bloomsLevel].total++;
        if (q.isCorrect) {
          analytics.byBloomsLevel[q.bloomsLevel].correct++;
        }
      }

      // Topic analysis
      if (q.topic) {
        if (!analytics.byTopic[q.topic]) {
          analytics.byTopic[q.topic] = { total: 0, correct: 0, percentage: 0 };
        }
        analytics.byTopic[q.topic].total++;
        if (q.isCorrect) {
          analytics.byTopic[q.topic].correct++;
        }
      }

      // Time analysis
      if (q.timeSpent > 0) {
        totalTime += q.timeSpent;
        if (q.timeSpent < fastestTime) {
          fastestTime = q.timeSpent;
          fastestQuestion = {
            questionNumber: index + 1,
            questionText: q.questionText,
            time: q.timeSpent
          };
        }
        if (q.timeSpent > slowestTime) {
          slowestTime = q.timeSpent;
          slowestQuestion = {
            questionNumber: index + 1,
            questionText: q.questionText,
            time: q.timeSpent
          };
        }
      }

      // Question performance
      analytics.questionPerformance.push({
        questionNumber: index + 1,
        isCorrect: q.isCorrect,
        timeSpent: q.timeSpent,
        topic: q.topic || undefined,
        difficulty: q.difficulty || undefined,
        bloomsLevel: q.bloomsLevel || undefined
      });
    });

    // Calculate percentages
    Object.keys(analytics.byDifficulty).forEach(key => {
      const diff = analytics.byDifficulty[key as keyof typeof analytics.byDifficulty];
      diff.percentage = diff.total > 0 ? Math.round((diff.correct / diff.total) * 100) : 0;
    });

    Object.keys(analytics.byBloomsLevel).forEach(key => {
      const bloom = analytics.byBloomsLevel[key];
      bloom.percentage = bloom.total > 0 ? Math.round((bloom.correct / bloom.total) * 100) : 0;
    });

    Object.keys(analytics.byTopic).forEach(key => {
      const topic = analytics.byTopic[key];
      topic.percentage = topic.total > 0 ? Math.round((topic.correct / topic.total) * 100) : 0;
    });

    analytics.timeAnalysis.averageTimePerQuestion = 
      questionsWithAnalytics.length > 0 ? Math.round(totalTime / questionsWithAnalytics.length) : 0;
    analytics.timeAnalysis.fastestQuestion = fastestQuestion;
    analytics.timeAnalysis.slowestQuestion = slowestQuestion;

    // Grading information
    const score = attempt.score || 0;
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
      studentName: attempt.studentName || "Unknown Student",
      studentEmail: attempt.studentEmail || "N/A",
      score: score,
      grade: gradeInfo.grade,
      gradePoints: gradeInfo.points,
      gradeDescription: gradeInfo.description,
      correctAnswers: attempt.totalCorrect || 0,
      totalQuestions: attempt.totalQuestions || 0,
      wrongAnswers: (attempt.totalQuestions || 0) - (attempt.totalCorrect || 0),
      timeTaken: attempt.timeSpent || 0,
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      status: attempt.status,
      questions: questionsWithAnalytics,
      analytics: analytics,
      // Educator can always see results immediately
      resultsAvailable: true
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch attempt details" },
      { status: 500 }
    );
  }
}