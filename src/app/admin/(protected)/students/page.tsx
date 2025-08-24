import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user, enrollments, quizAttempts, educatorStudents } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import StudentsManagement from "./StudentsManagement";

async function getStudents() {
  const students = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      timezone: user.timezone,
    })
    .from(user)
    .where(eq(user.role, "student"))
    .orderBy(desc(user.createdAt));

  // Get enrollment and attempt counts for each student
  const studentsWithStats = await Promise.all(
    students.map(async (student) => {
      const [enrollmentCount] = await db
        .select({ count: sql`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.studentId, student.id));

      const [attemptCount] = await db
        .select({ count: sql`count(*)` })
        .from(quizAttempts)
        .where(eq(quizAttempts.studentId, student.id));

      const [educatorCount] = await db
        .select({ count: sql`count(*)` })
        .from(educatorStudents)
        .where(eq(educatorStudents.studentId, student.id));

      return {
        ...student,
        enrollmentCount: Number(enrollmentCount?.count || 0),
        attemptCount: Number(attemptCount?.count || 0),
        educatorCount: Number(educatorCount?.count || 0),
      };
    })
  );

  return studentsWithStats;
}

export default async function StudentsPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const students = await getStudents();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentsManagement students={students} />
    </Suspense>
  );
}