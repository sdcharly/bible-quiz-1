import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizzes, quizAttempts, enrollments } from "@/lib/schema";


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Fetch quiz details
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quiz[0];

    // Check if quiz is in draft status
    if (quizData.status === "draft") {
      // Delete the quiz completely if it's a draft
      await db.delete(quizzes).where(eq(quizzes.id, quizId));
      
      return NextResponse.json({
        success: true,
        message: "Draft quiz deleted successfully",
        action: "deleted"
      });
    }

    // For published quizzes, check if there are any student attempts
    const attempts = await db
      .select()
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId))
      .limit(1);

    if (attempts.length > 0) {
      // If students have attempted the quiz, archive it instead of deleting
      await db
        .update(quizzes)
        .set({ 
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, quizId));

      return NextResponse.json({
        success: true,
        message: "Quiz has been archived as students have attempted it",
        action: "archived"
      });
    } else {
      // Check if there are enrollments
      const enrollmentsList = await db
        .select()
        .from(enrollments)
        .where(eq(enrollments.quizId, quizId))
        .limit(1);

      if (enrollmentsList.length > 0) {
        // If students are enrolled but haven't attempted, archive it
        await db
          .update(quizzes)
          .set({ 
            status: "archived",
            updatedAt: new Date()
          })
          .where(eq(quizzes.id, quizId));

        return NextResponse.json({
          success: true,
          message: "Quiz has been archived as students are enrolled",
          action: "archived"
        });
      } else {
        // No students enrolled or attempted, safe to delete
        await db.delete(quizzes).where(eq(quizzes.id, quizId));
        
        return NextResponse.json({
          success: true,
          message: "Published quiz deleted successfully",
          action: "deleted"
        });
      }
    }

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to delete/archive quiz" },
      { status: 500 }
    );
  }
}

// Endpoint to toggle archive status (activate/deactivate)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    const { action } = await req.json();

    if (!action || !["activate", "deactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'activate' or 'deactivate'" },
        { status: 400 }
      );
    }

    // Fetch quiz details
    const quiz = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quiz[0];
    
    if (action === "activate") {
      if (quizData.status !== "archived") {
        return NextResponse.json(
          { error: "Only archived quizzes can be activated" },
          { status: 400 }
        );
      }

      await db
        .update(quizzes)
        .set({ 
          status: "published",
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, quizId));

      return NextResponse.json({
        success: true,
        message: "Quiz has been activated",
        newStatus: "published"
      });
    } else {
      // Deactivate (archive) the quiz
      if (quizData.status !== "published") {
        return NextResponse.json(
          { error: "Only published quizzes can be deactivated" },
          { status: 400 }
        );
      }

      await db
        .update(quizzes)
        .set({ 
          status: "archived",
          updatedAt: new Date()
        })
        .where(eq(quizzes.id, quizId));

      return NextResponse.json({
        success: true,
        message: "Quiz has been deactivated",
        newStatus: "archived"
      });
    }

  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to update quiz status" },
      { status: 500 }
    );
  }
}