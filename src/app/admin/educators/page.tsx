import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user, quizzes, educatorStudents, permissionTemplates } from "@/lib/schema";
import { eq, or, desc, sql } from "drizzle-orm";
import EducatorsManagement from "./EducatorsManagement";

async function getEducators() {
  const educators = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      approvedBy: user.approvedBy,
      approvedAt: user.approvedAt,
      rejectionReason: user.rejectionReason,
      permissions: user.permissions,
      permissionTemplateId: user.permissionTemplateId,
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      templateName: permissionTemplates.name,
      templateDescription: permissionTemplates.description,
    })
    .from(user)
    .leftJoin(permissionTemplates, eq(user.permissionTemplateId, permissionTemplates.id))
    .where(or(eq(user.role, "educator"), eq(user.role, "pending_educator")))
    .orderBy(desc(user.createdAt));

  // Get quiz and student counts for each educator
  const educatorsWithStats = await Promise.all(
    educators.map(async (educator) => {
      const [quizCount] = await db
        .select({ count: sql`count(*)` })
        .from(quizzes)
        .where(eq(quizzes.educatorId, educator.id));

      const [studentCount] = await db
        .select({ count: sql`count(*)` })
        .from(educatorStudents)
        .where(eq(educatorStudents.educatorId, educator.id));

      return {
        ...educator,
        permissionTemplate: educator.templateName ? {
          id: educator.permissionTemplateId!,
          name: educator.templateName,
          description: educator.templateDescription,
        } : undefined,
        quizCount: Number(quizCount?.count || 0),
        studentCount: Number(studentCount?.count || 0),
      };
    })
  );

  return educatorsWithStats;
}

export default async function EducatorsPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const educators = await getEducators();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EducatorsManagement educators={educators} />
    </Suspense>
  );
}