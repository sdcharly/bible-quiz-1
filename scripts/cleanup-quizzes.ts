import { db } from "../src/lib/db";
import { quizzes, questions, enrollments, quizAttempts, questionResponses } from "../src/lib/schema";
import { sql } from "drizzle-orm";

async function cleanupDatabase() {
  console.log("Starting database cleanup...");
  
  try {
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

    console.log("\n✅ Database cleanup completed successfully!");
    console.log("All quiz-related data has been removed.");
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupDatabase();