import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { session, user } from "@/lib/schema";
import { gte, sql, eq } from "drizzle-orm";

/**
 * Active users metrics endpoint
 * Tracks concurrent users in the system
 */
export async function GET(req: NextRequest) {
  try {
    // Simple token guard; switch to your session/admin check if available
    const token = req.headers.get('x-metrics-token');
    if (process.env.METRICS_API_TOKEN && token !== process.env.METRICS_API_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Get active sessions (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Get active sessions with user roles
    const activeSessions = await db
      .select({
        userId: session.userId,
        updatedAt: session.updatedAt,
        role: user.role
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .where(gte(session.updatedAt, thirtyMinutesAgo));

    // Count distinct users (not sessions) to avoid double-counting users with multiple sessions
    const globalUserSet = new Set<string>();
    const roleUserMap = new Map<string, Set<string>>();
    
    // Single pass through sessions to build Sets
    activeSessions.forEach(sess => {
      // Skip sessions without valid userIds
      if (!sess.userId) return;
      
      // Add to global Set
      globalUserSet.add(sess.userId);
      
      // Add to role-specific Set
      const role = sess.role || 'unknown';
      if (!roleUserMap.has(role)) {
        roleUserMap.set(role, new Set<string>());
      }
      roleUserMap.get(role)!.add(sess.userId);
    });
    
    // Build breakdown from role Sets
    const breakdown: Record<string, number> = {};
    roleUserMap.forEach((userSet, role) => {
      breakdown[role] = userSet.size;
    });

    const stats = {
      activeUsers: globalUserSet.size,
      students: roleUserMap.get('student')?.size || 0,
      educators: roleUserMap.get('educator')?.size || 0,
      admins: roleUserMap.get('admin')?.size || 0,
      breakdown: breakdown,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stats);
  } catch (error) {
    // Return explicit failure response instead of fake metrics
    return NextResponse.json({
      ok: false,
      error: 'Session tracking unavailable',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}