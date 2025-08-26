import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import * as crypto from "crypto";
import { db } from "@/lib/db";
import { quizzes, quizShareLinks } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { createShortUrl } from "@/lib/link-shortener";
import { logger } from "@/lib/logger";


export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Get session to verify educator owns this quiz
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Basic auth check (optional but recommended)
    if (!session?.user || (session.user.role !== 'educator' && session.user.role !== 'pending_educator')) {
      return NextResponse.json(
        { error: "Unauthorized - Educator access required" },
        { status: 401 }
      );
    }

    const educatorId = session.user.id;

    // Fetch the quiz to validate before publishing
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(
        and(
          eq(quizzes.id, quizId),
          eq(quizzes.educatorId, educatorId)
        )
      );

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found or you don't have permission to publish it" },
        { status: 404 }
      );
    }

    // Check if quiz is already published
    if (quiz.status === "published") {
      return NextResponse.json(
        { error: "Quiz is already published" },
        { status: 400 }
      );
    }

    // CRITICAL: Check if deferred quiz has a scheduled time
    if (quiz.schedulingStatus === 'deferred' && !quiz.startTime) {
      return NextResponse.json(
        { 
          error: "Cannot publish quiz without scheduling",
          message: "This quiz requires a scheduled time before it can be published. Please set the quiz time first.",
          requiresScheduling: true,
          quizId: quizId,
          schedulingStatus: quiz.schedulingStatus
        },
        { status: 400 }
      );
    }

    // Validate that quiz has a valid start time (not too far in the past)
    if (quiz.startTime) {
      const now = new Date();
      const startTime = new Date(quiz.startTime);
      
      // Allow publishing if start time is in the future or within the last hour
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      if (startTime < oneHourAgo) {
        return NextResponse.json(
          { 
            error: "Cannot publish quiz with expired start time",
            message: "The quiz start time is too far in the past. Please update the schedule."
          },
          { status: 400 }
        );
      }
    }

    // All validations passed, update quiz status to published
    const [updatedQuiz] = await db
      .update(quizzes)
      .set({
        status: "published",
        updatedAt: new Date()
      })
      .where(eq(quizzes.id, quizId))
      .returning();

    // Create share link if it doesn't exist
    const existingShareLink = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.quizId, quizId))
      .limit(1);

    let shareCode: string;
    let shortUrl: string | null = null;
    
    if (existingShareLink.length === 0) {
      // Generate new share link
      shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      const id = crypto.randomUUID();
      
      await db.insert(quizShareLinks).values({
        id,
        quizId,
        educatorId,
        shareCode,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Generate short URL
      const shortCode = await createShortUrl(shareCode);
      if (shortCode) {
        shortUrl = `${process.env.NEXT_PUBLIC_APP_URL}/s/${shortCode}`;
        // Update the share link with short URL
        await db
          .update(quizShareLinks)
          .set({ shortUrl: shortCode })
          .where(eq(quizShareLinks.id, id));
      }
    } else {
      shareCode = existingShareLink[0].shareCode;
      shortUrl = existingShareLink[0].shortUrl 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/s/${existingShareLink[0].shortUrl}`
        : null;
    }

    return NextResponse.json({ 
      success: true,
      quiz: updatedQuiz,
      shareCode,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quiz/share/${shareCode}`,
      shortUrl,
      message: quiz.schedulingStatus === 'deferred' 
        ? "Quiz published successfully with scheduled time" 
        : "Quiz published successfully"
    });
  } catch (error) {
    logger.error("Error publishing quiz:", error);
    return NextResponse.json(
      { error: "Failed to publish quiz" },
      { status: 500 }
    );
  }
}