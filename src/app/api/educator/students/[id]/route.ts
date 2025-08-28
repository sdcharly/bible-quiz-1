import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { educatorStudents, user, enrollments, quizAttempts, quizzes, questionResponses, questions } from "@/lib/schema";
import { auth } from "@/lib/auth";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const studentId = params.id;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // For testing, allow without session
    const educatorId = session?.user?.id || "default-educator-id";

    // Fetch student details
    const [studentData] = await db
      .select({
        studentId: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        createdAt: user.createdAt,
        relationshipId: educatorStudents.id,
        enrolledAt: educatorStudents.enrolledAt,
      })
      .from(educatorStudents)
      .innerJoin(user, eq(educatorStudents.studentId, user.id))
      .where(
        and(
          eq(educatorStudents.studentId, studentId),
          eq(educatorStudents.educatorId, educatorId)
        )
      );

    if (!studentData) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Fetch enrollment statistics - get unique quiz IDs
    const studentEnrollments = await db
      .select({ quizId: enrollments.quizId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    // Fetch quiz attempts
    const attempts = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        totalQuestions: quizAttempts.totalQuestions,
        totalCorrect: quizAttempts.totalCorrect,
        timeSpent: quizAttempts.timeSpent,
        endTime: quizAttempts.endTime,
        status: quizAttempts.status,
        quizTitle: quizzes.title,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(
        and(
          eq(quizAttempts.studentId, studentId),
          eq(quizAttempts.status, "completed")
        )
      )
      .orderBy(desc(quizAttempts.endTime))
      .limit(20);

    // Calculate performance by topic
    const performanceByTopic: Record<string, { total: number; correct: number; percentage: number }> = {};
    
    // Get all question responses for this student
    for (const attempt of attempts) {
      const responses = await db
        .select({
          isCorrect: questionResponses.isCorrect,
          topic: questions.topic,
        })
        .from(questionResponses)
        .innerJoin(questions, eq(questionResponses.questionId, questions.id))
        .where(eq(questionResponses.attemptId, attempt.attemptId));

      responses.forEach(response => {
        if (response.topic) {
          if (!performanceByTopic[response.topic]) {
            performanceByTopic[response.topic] = { total: 0, correct: 0, percentage: 0 };
          }
          performanceByTopic[response.topic].total++;
          if (response.isCorrect) {
            performanceByTopic[response.topic].correct++;
          }
        }
      });
    }

    // Calculate percentages for topics
    Object.keys(performanceByTopic).forEach(topic => {
      const stats = performanceByTopic[topic];
      stats.percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    });

    // Calculate statistics
    const completedQuizzes = attempts.length;
    const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const averageScore = completedQuizzes > 0
      ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / completedQuizzes
      : 0;

    return NextResponse.json({
      studentId: studentData.studentId,
      name: studentData.name || "Unknown Student",
      email: studentData.email || "",
      phoneNumber: studentData.phoneNumber,
      role: studentData.role || "student",
      joinedAt: studentData.enrolledAt || studentData.createdAt,
      totalEnrollments: new Set(studentEnrollments.map(e => e.quizId)).size, // Count unique quizzes only
      completedQuizzes,
      averageScore,
      totalTimeSpent,
      recentAttempts: attempts.map(a => ({
        attemptId: a.attemptId,
        quizId: a.quizId,
        quizTitle: a.quizTitle,
        score: a.score || 0,
        totalQuestions: a.totalQuestions || 0,
        correctAnswers: a.totalCorrect || 0,
        completedAt: a.endTime,
        timeSpent: a.timeSpent || 0,
        status: a.status,
      })),
      performanceByTopic,
    });

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch student details" },
      { status: 500 }
    );
  }
}