import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Update quiz status to published
    await db
      .update(quizzes)
      .set({
        status: "published",
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, quizId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error publishing quiz:", error);
    return NextResponse.json(
      { error: "Failed to publish quiz" },
      { status: 500 }
    );
  }
}