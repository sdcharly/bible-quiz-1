import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions } from "@/lib/schema";


export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const body = await request.json();
    const params = await context.params;
    const { questionId } = params;

    // Update the question
    await db
      .update(questions)
      .set({
        questionText: body.questionText,
        options: body.options,
        correctAnswer: body.correctAnswer,
        explanation: body.explanation,
        difficulty: body.difficulty,
        bloomsLevel: body.bloomsLevel,
        topic: body.topic,
        book: body.book,
        chapter: body.chapter
      })
      .where(eq(questions.id, questionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}