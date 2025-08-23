import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { session, user } from "@/lib/schema";
import { eq, lt, desc, and } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(_req: NextRequest) {
  try {
    // Verify admin authentication
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    logger.log(`Admin ${adminSession.email} initiating session cleanup`);
    
    // 1. First, analyze current sessions
    const allSessions = await db
      .select({
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        userName: user.name,
        userEmail: user.email
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .orderBy(desc(session.updatedAt));
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Categorize sessions
    const expiredSessions = allSessions.filter(s => s.expiresAt < now);
    const activeLastHour = allSessions.filter(s => s.updatedAt >= oneHourAgo && s.expiresAt >= now);
    const staleButNotExpired = allSessions.filter(s => 
      s.updatedAt < oneDayAgo && s.expiresAt >= now
    );
    
    // Prepare stats before deletion
    const beforeStats = {
      total: allSessions.length,
      expired: expiredSessions.length,
      activeLastHour: activeLastHour.length,
      stale: staleButNotExpired.length
    };
    
    // 2. Delete expired sessions
    let deletedExpired = 0;
    if (expiredSessions.length > 0) {
      await db
        .delete(session)
        .where(lt(session.expiresAt, now));
      deletedExpired = expiredSessions.length;
    }
    
    // 3. Delete stale sessions (not updated in 24+ hours)
    let deletedStale = 0;
    if (staleButNotExpired.length > 0) {
      await db
        .delete(session)
        .where(
          and(
            lt(session.updatedAt, oneDayAgo),
            // Make sure we don't delete truly active sessions
            lt(session.expiresAt, new Date(now.getTime() + 24 * 60 * 60 * 1000))
          )
        );
      deletedStale = staleButNotExpired.length;
    }
    
    // 4. Get remaining sessions for verification
    const remainingSessions = await db
      .select({
        id: session.id,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
      })
      .from(session);
    
    const activeNow = remainingSessions.filter(s => 
      s.updatedAt >= oneHourAgo && s.expiresAt >= now
    );
    
    // Prepare response
    const afterStats = {
      total: remainingSessions.length,
      activeLastHour: activeNow.length
    };
    
    const cleanupResult = {
      success: true,
      before: beforeStats,
      after: afterStats,
      deleted: {
        expired: deletedExpired,
        stale: deletedStale,
        total: deletedExpired + deletedStale
      },
      message: `Successfully cleaned up ${deletedExpired + deletedStale} sessions. ${activeNow.length} active sessions remain.`
    };
    
    logger.log("Session cleanup completed:", cleanupResult);
    
    return NextResponse.json(cleanupResult);
    
  } catch (error) {
    logger.error("Error during session cleanup:", error);
    return NextResponse.json(
      { error: "Failed to clean up sessions" },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  try {
    // Verify admin authentication
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }
    
    // Get session statistics without deleting
    const allSessions = await db
      .select({
        id: session.id,
        expiresAt: session.expiresAt,
        updatedAt: session.updatedAt,
      })
      .from(session);
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const stats = {
      total: allSessions.length,
      expired: allSessions.filter(s => s.expiresAt < now).length,
      activeLastHour: allSessions.filter(s => s.updatedAt >= oneHourAgo && s.expiresAt >= now).length,
      activeLastDay: allSessions.filter(s => s.updatedAt >= oneDayAgo && s.expiresAt >= now).length,
      stale: allSessions.filter(s => s.updatedAt < oneDayAgo && s.expiresAt >= now).length,
    };
    
    return NextResponse.json(stats);
    
  } catch (error) {
    logger.error("Error fetching session stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch session statistics" },
      { status: 500 }
    );
  }
}