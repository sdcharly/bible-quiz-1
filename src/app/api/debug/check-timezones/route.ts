import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { sql, ilike, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Check JAhez user
    const jahezUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        role: user.role,
      })
      .from(user)
      .where(ilike(user.name, '%jahez%'));

    // Get overall statistics
    const stats = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        students: sql<number>`COUNT(CASE WHEN role = 'student' THEN 1 END)`,
        istUsers: sql<number>`COUNT(CASE WHEN timezone = 'Asia/Kolkata' THEN 1 END)`,
        nullTimezone: sql<number>`COUNT(CASE WHEN timezone IS NULL THEN 1 END)`,
      })
      .from(user);

    // Get timezone distribution
    const timezoneDistribution = await db
      .select({
        timezone: user.timezone,
        count: sql<number>`COUNT(*)`,
      })
      .from(user)
      .groupBy(user.timezone)
      .orderBy(sql`COUNT(*) DESC`);

    // Sample of recent students
    const recentStudents = await db
      .select({
        name: user.name,
        timezone: user.timezone,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.role, 'student'))
      .orderBy(sql`created_at DESC NULLS LAST`)
      .limit(5);

    return NextResponse.json({
      jahezUsers: jahezUsers.length > 0 ? jahezUsers : "No users found with 'JAhez' in name",
      statistics: stats[0],
      timezoneDistribution,
      recentStudents,
      summary: {
        allUsersHaveTimezone: stats[0].nullTimezone === 0,
        defaultTimezone: "Asia/Kolkata",
        note: "All existing users got Asia/Kolkata as default when timezone column was added"
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error checking timezones:", error);
    return NextResponse.json(
      { error: "Failed to check timezones", details: error },
      { status: 500 }
    );
  }
}