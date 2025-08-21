import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user, quizzes, educatorStudents, quizAttempts, enrollments } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import EducatorDetails from "./EducatorDetails";

async function getEducatorDetails(educatorId: string) {
  const [educator] = await db
    .select()
    .from(user)
    .where(eq(user.id, educatorId))
    .limit(1);

  if (!educator) {
    return null;
  }

  // Get statistics
  const [quizCount] = await db
    .select({ count: sql`count(*)` })
    .from(quizzes)
    .where(eq(quizzes.educatorId, educatorId));

  const [studentCount] = await db
    .select({ count: sql`count(*)` })
    .from(educatorStudents)
    .where(eq(educatorStudents.educatorId, educatorId));

  // Get recent quizzes
  const recentQuizzes = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      status: quizzes.status,
      totalQuestions: quizzes.totalQuestions,
      createdAt: quizzes.createdAt,
    })
    .from(quizzes)
    .where(eq(quizzes.educatorId, educatorId))
    .orderBy(quizzes.createdAt)
    .limit(5);

  // Get students
  const students = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      enrolledAt: educatorStudents.enrolledAt,
    })
    .from(educatorStudents)
    .innerJoin(user, eq(educatorStudents.studentId, user.id))
    .where(eq(educatorStudents.educatorId, educatorId))
    .limit(10);

  const educatorInfo = {
    id: educator.id,
    name: educator.name,
    email: educator.email,
    role: educator.role,
    approvalStatus: educator.approvalStatus,
    approvedBy: educator.approvedBy,
    approvedAt: educator.approvedAt,
    rejectionReason: educator.rejectionReason,
    permissions: (educator.permissions || {}) as Record<string, unknown>,
    createdAt: educator.createdAt,
    phoneNumber: educator.phoneNumber,
    emailVerified: educator.emailVerified,
    timezone: educator.timezone,
    quizCount: Number(quizCount?.count || 0),
    studentCount: Number(studentCount?.count || 0),
    recentQuizzes,
    students,
  };
  
  return educatorInfo;
}

export default async function EducatorDetailsPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const educator = await getEducatorDetails(id);

  if (!educator) {
    redirect("/admin/educators");
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EducatorDetails educator={educator} />
    </Suspense>
  );
}