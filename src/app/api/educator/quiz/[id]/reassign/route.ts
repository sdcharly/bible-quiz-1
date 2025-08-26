import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray, or } from "drizzle-orm";
import * as crypto from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { enrollments, user, quizzes, quizAttempts, quizShareLinks } from "@/lib/schema";
import { sendEmail, emailTemplates } from "@/lib/email-service";
import { createShortUrl, getShortUrl } from "@/lib/link-shortener";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;
    const { 
      studentIds, 
      reason = "Missed original attempt",
      sendNotifications = false,
      newDeadline // Optional: new deadline for reassigned quiz
    } = await req.json();

    // Get current user (educator)
    const session = await auth.api.getSession({
      headers: await headers()
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const educatorId = session.user.id;

    // Check if quiz exists and belongs to educator
    const quiz = await db
      .select()
      .from(quizzes)
      .where(and(
        eq(quizzes.id, quizId),
        eq(quizzes.educatorId, educatorId)
      ))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found or unauthorized" },
        { status: 404 }
      );
    }

    if (quiz[0].status !== "published") {
      return NextResponse.json(
        { error: "Quiz must be published before reassigning" },
        { status: 400 }
      );
    }

    // Get original enrollments for these students
    const originalEnrollments = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        status: enrollments.status,
        isReassignment: enrollments.isReassignment,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          inArray(enrollments.studentId, studentIds),
          eq(enrollments.isReassignment, false) // Only get original enrollments
        )
      );

    // Check which students have already completed
    const completedStudents = originalEnrollments
      .filter(e => e.status === "completed")
      .map(e => e.studentId);

    if (completedStudents.length > 0) {
      const students = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, completedStudents));
      
      const names = students.map(s => s.name).join(", ");
      logger.warn("Attempted to reassign to completed students", { completedStudents, names });
    }

    // Filter students who haven't completed (enrolled, in_progress, or abandoned)
    const eligibleEnrollments = originalEnrollments.filter(
      e => e.status !== "completed"
    );

    if (eligibleEnrollments.length === 0) {
      return NextResponse.json(
        { error: "No eligible students for reassignment (all have completed or no original enrollment)" },
        { status: 400 }
      );
    }

    // Check for existing reassignments to prevent duplicates
    const existingReassignments = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.quizId, quizId),
          inArray(enrollments.studentId, eligibleEnrollments.map(e => e.studentId)),
          eq(enrollments.isReassignment, true)
        )
      );

    const alreadyReassigned = new Set(existingReassignments.map(e => e.studentId));
    const toReassign = eligibleEnrollments.filter(
      e => !alreadyReassigned.has(e.studentId)
    );

    if (toReassign.length === 0) {
      return NextResponse.json(
        { error: "All selected students have already been reassigned" },
        { status: 400 }
      );
    }

    // Create reassignment enrollments
    const reassignmentRecords = toReassign.map(originalEnrollment => ({
      id: crypto.randomUUID(),
      quizId,
      studentId: originalEnrollment.studentId,
      enrolledAt: new Date(),
      status: "enrolled" as const,
      isReassignment: true,
      parentEnrollmentId: originalEnrollment.id,
      reassignmentReason: reason,
      reassignedAt: new Date(),
      reassignedBy: educatorId,
    }));

    await db.insert(enrollments).values(reassignmentRecords);

    // Get student details for response and notifications
    const reassignedStudentDetails = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(inArray(user.id, toReassign.map(e => e.studentId)));

    // Send email notifications if requested
    if (sendNotifications && reassignedStudentDetails.length > 0) {
      const [educator] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, educatorId));
      
      // Get or create share link
      const shareLink = await db
        .select()
        .from(quizShareLinks)
        .where(eq(quizShareLinks.quizId, quizId))
        .limit(1);

      let shareCode: string;
      let shortUrl: string | null = null;
      
      if (shareLink.length === 0) {
        shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const id = crypto.randomUUID();
        
        await db.insert(quizShareLinks).values({
          id,
          quizId,
          educatorId: quiz[0].educatorId,
          shareCode,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        const shortCode = await createShortUrl(shareCode);
        shortUrl = shortCode ? getShortUrl(shortCode) : null;
      } else {
        shareCode = shareLink[0].shareCode;
        shortUrl = shareLink[0].shortUrl ? getShortUrl(shareLink[0].shortUrl) : null;
      }
      
      // Send reassignment emails
      const emailPromises = reassignedStudentDetails.map(async (student) => {
        const quizUrl = shortUrl || (shareCode ? `${process.env.NEXT_PUBLIC_APP_URL}/quiz/share/${shareCode}` : undefined);
        
        const emailContent = emailTemplates.quizReassignmentNotification(
          student.name || "Student",
          educator?.name || "Your Educator",
          quiz[0].title,
          reason,
          newDeadline ? new Date(newDeadline) : undefined,
          quiz[0].totalQuestions,
          quiz[0].duration,
          quizUrl
        );
        
        return sendEmail({
          to: student.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      });
      
      Promise.all(emailPromises).catch(error => {
        logger.error("Error sending reassignment emails", error);
      });
    }

    // Return summary
    return NextResponse.json({
      success: true,
      message: `Successfully reassigned quiz to ${toReassign.length} student(s)`,
      reassignedCount: toReassign.length,
      alreadyReassignedCount: alreadyReassigned.size,
      completedCount: completedStudents.length,
      reassignedStudents: reassignedStudentDetails,
      notificationsSent: sendNotifications
    });

  } catch (error) {
    logger.error("Error reassigning quiz", error);
    return NextResponse.json(
      { error: "Failed to reassign quiz" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch students eligible for reassignment
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Get current user (educator)
    const session = await auth.api.getSession({
      headers: await headers()
    });
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const educatorId = session.user.id;

    // Get quiz
    const quiz = await db
      .select()
      .from(quizzes)
      .where(and(
        eq(quizzes.id, quizId),
        eq(quizzes.educatorId, educatorId)
      ))
      .limit(1);

    if (!quiz.length) {
      return NextResponse.json(
        { error: "Quiz not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get all enrollments for this quiz
    const allEnrollments = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        status: enrollments.status,
        isReassignment: enrollments.isReassignment,
        enrolledAt: enrollments.enrolledAt,
        completedAt: enrollments.completedAt,
        parentEnrollmentId: enrollments.parentEnrollmentId,
        reassignmentReason: enrollments.reassignmentReason,
        reassignedAt: enrollments.reassignedAt,
      })
      .from(enrollments)
      .where(eq(enrollments.quizId, quizId));

    // Get attempts for these enrollments
    const studentIds = [...new Set(allEnrollments.map(e => e.studentId))];
    const attempts = await db
      .select({
        studentId: quizAttempts.studentId,
        enrollmentId: quizAttempts.enrollmentId,
        score: quizAttempts.score,
        status: quizAttempts.status,
      })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.quizId, quizId),
          inArray(quizAttempts.studentId, studentIds)
        )
      );

    // Get student details
    const students = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(inArray(user.id, studentIds));

    // Create student map
    const studentMap = new Map(students.map(s => [s.id, s]));
    const attemptMap = new Map(attempts.map(a => [a.enrollmentId, a]));

    // Process enrollments to determine eligibility
    const studentStatus = new Map<string, {
      student: typeof students[0];
      originalEnrollment?: typeof allEnrollments[0];
      reassignments: typeof allEnrollments[0][];
      latestAttempt?: typeof attempts[0];
      isEligibleForReassignment: boolean;
      reason: string;
    }>();

    allEnrollments.forEach(enrollment => {
      const student = studentMap.get(enrollment.studentId);
      if (!student) return;

      if (!studentStatus.has(enrollment.studentId)) {
        studentStatus.set(enrollment.studentId, {
          student,
          reassignments: [],
          isEligibleForReassignment: false,
          reason: ""
        });
      }

      const status = studentStatus.get(enrollment.studentId)!;
      const attempt = attemptMap.get(enrollment.id);

      if (!enrollment.isReassignment) {
        status.originalEnrollment = enrollment;
        if (attempt) {
          status.latestAttempt = attempt;
        }
      } else {
        status.reassignments.push(enrollment);
        if (attempt && (!status.latestAttempt || enrollment.reassignedAt! > status.reassignments[0].reassignedAt!)) {
          status.latestAttempt = attempt;
        }
      }
    });

    // Determine eligibility
    studentStatus.forEach((status) => {
      if (!status.originalEnrollment) {
        status.reason = "No original enrollment";
        return;
      }

      // Check if completed (either original or reassignment)
      const hasCompletedAny = status.originalEnrollment.status === "completed" || 
        status.reassignments.some(r => r.status === "completed");

      if (hasCompletedAny) {
        status.reason = "Already completed";
        status.isEligibleForReassignment = false;
      } else if (status.reassignments.length > 0 && status.reassignments.some(r => r.status === "enrolled")) {
        status.reason = "Has pending reassignment";
        status.isEligibleForReassignment = false;
      } else {
        status.reason = "Eligible for reassignment";
        status.isEligibleForReassignment = true;
      }
    });

    // Format response
    const studentList = Array.from(studentStatus.values()).map(({ 
      student, 
      originalEnrollment, 
      reassignments, 
      latestAttempt,
      isEligibleForReassignment,
      reason 
    }) => ({
      studentId: student.id,
      name: student.name,
      email: student.email,
      originalStatus: originalEnrollment?.status || "not_enrolled",
      reassignmentCount: reassignments.length,
      lastReassignedAt: reassignments.length > 0 
        ? reassignments[reassignments.length - 1].reassignedAt 
        : null,
      latestScore: latestAttempt?.score || null,
      isEligibleForReassignment,
      eligibilityReason: reason
    }));

    return NextResponse.json({
      students: studentList,
      summary: {
        total: studentList.length,
        eligible: studentList.filter(s => s.isEligibleForReassignment).length,
        completed: studentList.filter(s => s.eligibilityReason === "Already completed").length,
        pendingReassignment: studentList.filter(s => s.eligibilityReason === "Has pending reassignment").length,
      }
    });

  } catch (error) {
    logger.error("Error fetching reassignment eligibility", error);
    return NextResponse.json(
      { error: "Failed to fetch student status" },
      { status: 500 }
    );
  }
}