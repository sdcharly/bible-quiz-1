import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { activityLogs, user } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import ActivityLogsView from "./ActivityLogsView";

async function getActivityLogs() {
  const logs = await db
    .select({
      id: activityLogs.id,
      userId: activityLogs.userId,
      actionType: activityLogs.actionType,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      details: activityLogs.details,
      ipAddress: activityLogs.ipAddress,
      userAgent: activityLogs.userAgent,
      createdAt: activityLogs.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(activityLogs)
    .leftJoin(user, eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(500);

  return logs;
}

export default async function ActivityPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const logs = await getActivityLogs();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivityLogsView logs={logs} />
    </Suspense>
  );
}