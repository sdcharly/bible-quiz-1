import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user, enrollments, quizAttempts, educatorStudents, quizzes } from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import StudentDetails from "./StudentDetails";

async function getStudentDetails(studentId: string) {
  const [student] = await db
    .select()
    .from(user)
    .where(eq(user.id, studentId))
    .limit(1);

  if (!student || student.role !== "student") {
    return null;
  }

  // Get statistics
  const [enrollmentCount] = await db
    .select({ count: sql`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.studentId, studentId));

  const [attemptCount] = await db
    .select({ count: sql`count(*)` })
    .from(quizAttempts)
    .where(eq(quizAttempts.studentId, studentId));

  const [completedCount] = await db
    .select({ count: sql`count(*)` })
    .from(quizAttempts)
    .where(eq(quizAttempts.studentId, studentId))
    .where(eq(quizAttempts.status, "completed"));

  // Get average score
  const [avgScore] = await db
    .select({ avg: sql`AVG(score)` })
    .from(quizAttempts)
    .where(eq(quizAttempts.studentId, studentId))
    .where(eq(quizAttempts.status, "completed"));

  // Get recent quiz attempts
  const recentAttempts = await db
    .select({
      id: quizAttempts.id,
      quizTitle: quizzes.title,
      score: quizAttempts.score,
      totalQuestions: quizAttempts.totalQuestions,
      status: quizAttempts.status,
      startTime: quizAttempts.startTime,
      endTime: quizAttempts.endTime,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
    .where(eq(quizAttempts.studentId, studentId))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(10);

  // Get educators
  const educators = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      enrolledAt: educatorStudents.enrolledAt,
    })
    .from(educatorStudents)
    .innerJoin(user, eq(educatorStudents.educatorId, user.id))
    .where(eq(educatorStudents.studentId, studentId))
    .limit(10);

  // Get enrollments
  const studentEnrollments = await db
    .select({
      id: enrollments.id,
      quizTitle: quizzes.title,
      status: enrollments.status,
      enrolledAt: enrollments.enrolledAt,
      startedAt: enrollments.startedAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .innerJoin(quizzes, eq(enrollments.quizId, quizzes.id))
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(10);

  return {
    ...student,
    enrollmentCount: Number(enrollmentCount?.count || 0),
    attemptCount: Number(attemptCount?.count || 0),
    completedCount: Number(completedCount?.count || 0),
    averageScore: Number(avgScore?.avg || 0),
    recentAttempts,
    educators,
    enrollments: studentEnrollments,
  };
}

export default async function StudentDetailsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const student = await getStudentDetails(params.id);

  if (!student) {
    redirect("/admin/students");
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentDetails student={student} />
    </Suspense>
  );
}