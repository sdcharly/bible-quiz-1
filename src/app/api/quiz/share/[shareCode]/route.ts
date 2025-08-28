import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import * as crypto from "crypto";
import { db } from "@/lib/db";
import { quizShareLinks, quizzes, enrollments, user, educatorStudents, invitations } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";


export async function GET(
  req: NextRequest,
  context: { params: Promise<{ shareCode: string }> }
) {
  try {
    const params = await context.params;
    const shareCode = params.shareCode;

    // Find the share link
    const [shareLink] = await db
      .select()
      .from(quizShareLinks)
      .where(eq(quizShareLinks.shareCode, shareCode));

    if (!shareLink) {
      return NextResponse.json(
        { error: "Invalid share link" },
        { status: 404 }
      );
    }

    // Check if link has expired
    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 410 }
      );
    }

    // Increment click count
    await db
      .update(quizShareLinks)
      .set({ 
        clickCount: (shareLink.clickCount || 0) + 1,
        updatedAt: new Date()
      })
      .where(eq(quizShareLinks.id, shareLink.id));

    // Get quiz details
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, shareLink.quizId));

    if (!quiz || quiz.status !== 'published') {
      return NextResponse.json(
        { error: "Quiz not available" },
        { status: 404 }
      );
    }

    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Get educator info
    const [educator] = await db
      .select({
        name: user.name,
        email: user.email
      })
      .from(user)
      .where(eq(user.id, quiz.educatorId));

    interface QuizShareResponse {
      id: string;
      title: string;
      description: string | null;
      totalQuestions: number;
      duration: number;
      educatorName: string;
      isEnrolled: boolean;
      requiresAuth: boolean;
      hasEducatorRelation?: boolean;
      invitationToken?: string;
    }
    
    const response: QuizShareResponse = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      totalQuestions: quiz.totalQuestions,
      duration: quiz.duration,
      educatorName: educator?.name || "Educator",
      isEnrolled: false,
      requiresAuth: !session?.user
    };

    if (session?.user) {
      // Check if user is a student
      if (session.user.role !== 'student') {
        return NextResponse.json(
          { error: "Only students can access quiz through share links" },
          { status: 403 }
        );
      }

      const studentId = session.user.id;

      // Check if student is enrolled in the quiz
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.quizId, quiz.id),
            eq(enrollments.studentId, studentId)
          )
        );

      response.isEnrolled = !!enrollment;

      // Check if student is connected to educator
      const [educatorRelation] = await db
        .select()
        .from(educatorStudents)
        .where(
          and(
            eq(educatorStudents.studentId, studentId),
            eq(educatorStudents.educatorId, quiz.educatorId)
          )
        );

      response.hasEducatorRelation = !!educatorRelation;
    } else {
      // For non-authenticated users, always create an invitation token
      // This allows them to sign up and get auto-enrolled
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const invitationId = crypto.randomUUID();
      
      // Create an open invitation that can be used by anyone signing up through this link
      await db.insert(invitations).values({
        id: invitationId,
        educatorId: quiz.educatorId,
        quizId: quiz.id,
        email: '', // Empty email means any email can use this invitation
        token: invitationToken,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date()
      });
      
      response.invitationToken = invitationToken;
    }

    return NextResponse.json(response);

  } catch (error) {
    logger.error("Error fetching quiz info:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz information" },
      { status: 500 }
    );
  }
}