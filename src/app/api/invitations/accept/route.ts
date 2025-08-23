import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations, educatorStudents, enrollments, user } from "@/lib/schema";
import { eq, and, gte } from "drizzle-orm";
import * as crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { token, studentId } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find valid invitation
    const invitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.token, token),
          eq(invitations.status, "pending"),
          gte(invitations.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invitation.length) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Get the student ID (either from parameter or from email)
    let actualStudentId = studentId;
    if (!actualStudentId) {
      // If invitation has no email (open invitation), get the current user's ID from session
      if (!invitationData.email || invitationData.email === '') {
        // This will be passed from the signup/signin flow
        return NextResponse.json(
          { error: "Student ID required for open invitations" },
          { status: 400 }
        );
      }
      
      const student = await db
        .select()
        .from(user)
        .where(eq(user.email, invitationData.email))
        .limit(1);
      
      if (student.length) {
        actualStudentId = student[0].id;
      } else {
        return NextResponse.json(
          { error: "Student account not found" },
          { status: 404 }
        );
      }
    }

    // Create educator-student relationship
    const existingRelation = await db
      .select()
      .from(educatorStudents)
      .where(
        and(
          eq(educatorStudents.educatorId, invitationData.educatorId),
          eq(educatorStudents.studentId, actualStudentId)
        )
      )
      .limit(1);

    if (!existingRelation.length) {
      await db.insert(educatorStudents).values({
        id: crypto.randomUUID(),
        educatorId: invitationData.educatorId,
        studentId: actualStudentId,
        status: "active",
        enrolledAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // If invitation includes a quiz, enroll the student
    if (invitationData.quizId) {
      const existingEnrollment = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.quizId, invitationData.quizId),
            eq(enrollments.studentId, actualStudentId)
          )
        )
        .limit(1);

      if (!existingEnrollment.length) {
        await db.insert(enrollments).values({
          id: crypto.randomUUID(),
          quizId: invitationData.quizId,
          studentId: actualStudentId,
          enrolledAt: new Date(),
          status: "enrolled",
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
      .where(eq(invitations.id, invitationData.id));

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      educatorId: invitationData.educatorId,
      quizId: invitationData.quizId,
    });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}