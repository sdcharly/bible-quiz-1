import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eq, desc, and, or, notInArray, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user, quizzes, enrollments, activityLogs, educatorStudents } from "@/lib/schema";

// Using the new V2 dashboard with admin-v2 components
import AdminDashboardV2 from "./AdminDashboardV2";

async function getAdminStats() {
  const [
    totalEducators,
    pendingEducators,
    totalStudents,
    totalQuizzes,
    totalEnrollments,
    recentActivities,
  ] = await Promise.all([
    db.select()
      .from(user)
      .where(or(eq(user.role, "educator"), eq(user.role, "pending_educator"))),
    db.select()
      .from(user)
      .where(and(
        or(eq(user.role, "educator"), eq(user.role, "pending_educator")),
        eq(user.approvalStatus, "pending")
      )),
    db.select()
      .from(user)
      .where(eq(user.role, "student")),
    db.select()
      .from(quizzes),
    db.select()
      .from(enrollments),
    db.select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(10),
  ]);

  return {
    totalEducators: totalEducators.length,
    pendingEducators: pendingEducators.length,
    totalStudents: totalStudents.length,
    totalQuizzes: totalQuizzes.length,
    totalEnrollments: totalEnrollments.length,
    recentActivities,
  };
}

async function getPendingEducators() {
  return await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    approvalStatus: user.approvalStatus,
  })
    .from(user)
    .where(and(
      or(eq(user.role, "educator"), eq(user.role, "pending_educator")),
      eq(user.approvalStatus, "pending")
    ))
    .orderBy(desc(user.createdAt))
    .limit(5);
}

async function getAllEducators() {
  return await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt,
  })
    .from(user)
    .where(or(eq(user.role, "educator"), eq(user.role, "pending_educator")))
    .orderBy(desc(user.createdAt))
    .limit(10);
}

async function getAllStudents() {
  return await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  })
    .from(user)
    .where(eq(user.role, "student"))
    .orderBy(desc(user.createdAt))
    .limit(10);
}

async function getOrphanedUsers() {
  const studentsWithEducators = db
    .select({ studentId: educatorStudents.studentId })
    .from(educatorStudents)
    .where(eq(educatorStudents.status, "active"));

  const orphanedUsers = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        eq(user.role, "student"),
        notInArray(user.id, sql`(${studentsWithEducators})`)
      )
    )
    .orderBy(desc(user.createdAt));

  return orphanedUsers;
}

async function getApprovedEducators() {
  return await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(
      and(
        eq(user.role, "educator"),
        eq(user.approvalStatus, "approved")
      )
    )
    .orderBy(user.name);
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const [stats, pendingEducators, allEducators, allStudents, orphanedUsers, approvedEducators] = await Promise.all([
    getAdminStats(),
    getPendingEducators(),
    getAllEducators(),
    getAllStudents(),
    getOrphanedUsers(),
    getApprovedEducators(),
  ]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardV2 
        stats={stats} 
        pendingEducators={pendingEducators}
        allEducators={allEducators}
        allStudents={allStudents}
        orphanedUsers={orphanedUsers}
        approvedEducators={approvedEducators}
        adminEmail={session.email}
      />
    </Suspense>
  );
}