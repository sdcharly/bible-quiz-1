import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, enrollments, quizAttempts, questionResponses } from "@/lib/schema";


export async function DELETE(req: NextRequest) {
  try {
    // [REMOVED: Console statement for performance]
    
    // Delete all question responses first (due to foreign key constraints)
    // [REMOVED: Console statement for performance]
    const deletedResponses = await db.delete(questionResponses).returning();
    // [REMOVED: Console statement for performance]

    // Delete all quiz attempts
    // [REMOVED: Console statement for performance]
    const deletedAttempts = await db.delete(quizAttempts).returning();
    // [REMOVED: Console statement for performance]

    // Delete all enrollments
    // [REMOVED: Console statement for performance]
    const deletedEnrollments = await db.delete(enrollments).returning();
    // [REMOVED: Console statement for performance]

    // Delete all questions
    // [REMOVED: Console statement for performance]
    const deletedQuestions = await db.delete(questions).returning();
    // [REMOVED: Console statement for performance]

    // Delete all quizzes
    // [REMOVED: Console statement for performance]
    const deletedQuizzes = await db.delete(quizzes).returning();
    // [REMOVED: Console statement for performance]

    return NextResponse.json({
      success: true,
      message: "Database cleanup completed successfully",
      deleted: {
        quizzes: deletedQuizzes.length,
        questions: deletedQuestions.length,
        enrollments: deletedEnrollments.length,
        attempts: deletedAttempts.length,
        responses: deletedResponses.length
      }
    });
    
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to cleanup database", details: error },
      { status: 500 }
    );
  }
}