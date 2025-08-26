import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import * as crypto from "crypto";
import { db } from "@/lib/db";
import { invitations, educatorStudents, enrollments, user } from "@/lib/schema";
import { logger } from "@/lib/logger";


export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json();

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 }
      );
    }

    logger.log("Checking for pending invitations", { email, userId });

    // Find all pending invitations for this email
    const pendingInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.status, "pending"),
          gte(invitations.expiresAt, new Date())
        )
      );

    if (!pendingInvitations.length) {
      logger.log("No pending invitations found", { email });
      return NextResponse.json({
        success: true,
        message: "No pending invitations",
        acceptedCount: 0,
      });
    }

    logger.log(`Found ${pendingInvitations.length} pending invitations`, { email });

    let acceptedCount = 0;
    const enrolledQuizzes: string[] = [];

    // Process each pending invitation
    for (const invitation of pendingInvitations) {
      try {
        // Create educator-student relationship if it doesn't exist
        const existingRelation = await db
          .select()
          .from(educatorStudents)
          .where(
            and(
              eq(educatorStudents.educatorId, invitation.educatorId),
              eq(educatorStudents.studentId, userId)
            )
          )
          .limit(1);

        if (!existingRelation.length) {
          await db.insert(educatorStudents).values({
            id: crypto.randomUUID(),
            educatorId: invitation.educatorId,
            studentId: userId,
            status: "active",
            enrolledAt: new Date(),
            updatedAt: new Date(),
          });
          logger.log("Created educator-student relationship", { 
            educatorId: invitation.educatorId, 
            studentId: userId 
          });
        }

        // If invitation includes a quiz, enroll the student
        if (invitation.quizId) {
          const existingEnrollment = await db
            .select()
            .from(enrollments)
            .where(
              and(
                eq(enrollments.quizId, invitation.quizId),
                eq(enrollments.studentId, userId)
              )
            )
            .limit(1);

          if (!existingEnrollment.length) {
            await db.insert(enrollments).values({
              id: crypto.randomUUID(),
              quizId: invitation.quizId,
              studentId: userId,
              enrolledAt: new Date(),
              status: "enrolled",
            });
            enrolledQuizzes.push(invitation.quizId);
            logger.log("Enrolled student in quiz", { 
              quizId: invitation.quizId, 
              studentId: userId 
            });
          }
        }

        // Mark invitation as accepted
        await db
          .update(invitations)
          .set({
            status: "accepted",
            acceptedAt: new Date(),
          })
          .where(eq(invitations.id, invitation.id));

        acceptedCount++;
        logger.log("Accepted invitation", { invitationId: invitation.id });

      } catch (error) {
        logger.error("Error processing individual invitation", { 
          invitationId: invitation.id, 
          error 
        });
        // Continue processing other invitations even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Accepted ${acceptedCount} invitations`,
      acceptedCount,
      enrolledQuizzes,
    });

  } catch (error) {
    logger.error("Error checking and accepting invitations", error);
    return NextResponse.json(
      { error: "Failed to check and accept invitations" },
      { status: 500 }
    );
  }
}