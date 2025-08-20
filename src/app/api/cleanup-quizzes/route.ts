import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes, questions, enrollments, quizAttempts, questionResponses } from "@/lib/schema";

export async function DELETE(req: NextRequest) {
  try {
    console.log("Starting database cleanup...");
    
    // Delete all question responses first (due to foreign key constraints)
    console.log("Deleting question responses...");
    const deletedResponses = await db.delete(questionResponses).returning();
    console.log(`Deleted ${deletedResponses.length} question responses`);

    // Delete all quiz attempts
    console.log("Deleting quiz attempts...");
    const deletedAttempts = await db.delete(quizAttempts).returning();
    console.log(`Deleted ${deletedAttempts.length} quiz attempts`);

    // Delete all enrollments
    console.log("Deleting enrollments...");
    const deletedEnrollments = await db.delete(enrollments).returning();
    console.log(`Deleted ${deletedEnrollments.length} enrollments`);

    // Delete all questions
    console.log("Deleting questions...");
    const deletedQuestions = await db.delete(questions).returning();
    console.log(`Deleted ${deletedQuestions.length} questions`);

    // Delete all quizzes
    console.log("Deleting quizzes...");
    const deletedQuizzes = await db.delete(quizzes).returning();
    console.log(`Deleted ${deletedQuizzes.length} quizzes`);

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
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: "Failed to cleanup database", details: error },
      { status: 500 }
    );
  }
}