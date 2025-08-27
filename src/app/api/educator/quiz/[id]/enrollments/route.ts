import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { enrollments, user, quizAttempts } from "@/lib/schema";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const quizId = params.id;

    // Fetch all enrollments for this quiz with user details, reassignment info, and attempt status
    const quizEnrollments = await db
      .select({
        id: enrollments.id,
        studentId: enrollments.studentId,
        enrolledAt: enrollments.enrolledAt,
        status: enrollments.status,
        startedAt: enrollments.startedAt,
        completedAt: enrollments.completedAt,
        isReassignment: enrollments.isReassignment,
        parentEnrollmentId: enrollments.parentEnrollmentId,
        reassignmentReason: enrollments.reassignmentReason,
        reassignedAt: enrollments.reassignedAt,
        reassignedBy: enrollments.reassignedBy,
        name: user.name,
        email: user.email,
      })
      .from(enrollments)
      .leftJoin(user, eq(enrollments.studentId, user.id))
      .where(eq(enrollments.quizId, quizId))
      .orderBy(desc(enrollments.enrolledAt)); // Order by enrollment date, newest first

    // Get attempt data for all enrollments
    const attemptData = await db
      .select({
        studentId: quizAttempts.studentId,
        enrollmentId: quizAttempts.enrollmentId,
        score: quizAttempts.score,
        completedAt: quizAttempts.endTime,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.quizId, quizId));

    // Create a map to track reassignment count per student
    const reassignmentCountMap = new Map<string, number>();
    const studentEnrollmentsMap = new Map<string, typeof quizEnrollments>();
    
    // Group enrollments by student
    quizEnrollments.forEach(enrollment => {
      if (!studentEnrollmentsMap.has(enrollment.studentId)) {
        studentEnrollmentsMap.set(enrollment.studentId, []);
      }
      studentEnrollmentsMap.get(enrollment.studentId)!.push(enrollment);
      
      // Count reassignments
      if (enrollment.isReassignment) {
        reassignmentCountMap.set(
          enrollment.studentId, 
          (reassignmentCountMap.get(enrollment.studentId) || 0) + 1
        );
      }
    });

    // Combine enrollment data with attempt results
    const enrollmentsWithResults = quizEnrollments.map(enrollment => {
      // Find attempt specifically for this enrollment
      const attempt = attemptData.find(a => 
        a.enrollmentId === enrollment.id || 
        (a.studentId === enrollment.studentId && !enrollment.isReassignment)
      );
      
      // Get reassignment count for this student
      const reassignmentCount = reassignmentCountMap.get(enrollment.studentId) || 0;
      
      // Determine enrollment type label
      let enrollmentType = "Original";
      if (enrollment.isReassignment) {
        const studentEnrollments = studentEnrollmentsMap.get(enrollment.studentId) || [];
        const reassignmentIndex = studentEnrollments
          .filter(e => e.isReassignment)
          .findIndex(e => e.id === enrollment.id) + 1;
        enrollmentType = `Reassignment #${reassignmentIndex}`;
      }
      
      return {
        id: enrollment.id,
        studentId: enrollment.studentId,
        name: enrollment.name,
        email: enrollment.email,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        status: enrollment.status,
        score: attempt?.score ? Math.round(attempt.score) : undefined,
        completedAt: attempt?.completedAt?.toISOString() || enrollment.completedAt?.toISOString(),
        // New reassignment fields
        isReassignment: enrollment.isReassignment || false,
        reassignmentReason: enrollment.reassignmentReason,
        reassignedAt: enrollment.reassignedAt?.toISOString(),
        reassignmentCount: reassignmentCount,
        enrollmentType: enrollmentType,
        parentEnrollmentId: enrollment.parentEnrollmentId,
      };
    });

    // Sort enrollments to group by student and show newest reassignments first
    const sortedEnrollments = enrollmentsWithResults.sort((a, b) => {
      // First, group by student name
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      // Within same student, show newest enrollments first
      return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
    });

    return NextResponse.json({
      enrollments: sortedEnrollments,
      summary: {
        totalEnrollments: quizEnrollments.length,
        uniqueStudents: studentEnrollmentsMap.size,
        totalReassignments: Array.from(reassignmentCountMap.values()).reduce((a, b) => a + b, 0),
      }
    });
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}