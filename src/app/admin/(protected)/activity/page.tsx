import { Suspense } from "react";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { activityLogs, user } from "@/lib/schema";
import ActivityLogsViewV2 from "./ActivityLogsViewV2";


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

  return logs.map(log => ({
    ...log,
    details: log.details as Record<string, unknown> | null,
    userName: log.userName || null,
    userEmail: log.userEmail || null,
  }));
}

export default async function ActivityPage() {
  const session = await getAdminSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  const logs = await getActivityLogs();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivityLogsViewV2 logs={logs} />
    </Suspense>
  );
}