// Load environment variables first
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

import { db } from "../src/lib/db";
import { session, user } from "../src/lib/schema";
import { eq, lt, desc } from "drizzle-orm";
import { logger } from "../src/lib/logger";

async function cleanupStaleSessions() {
  logger.force("=== SESSION CLEANUP SCRIPT STARTED ===");
  
  try {
    // 1. First, let's analyze current sessions
    logger.force("Step 1: Analyzing current sessions...");
    
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
    
    logger.force(`Total sessions in database: ${allSessions.length}`);
    
    // 2. Categorize sessions
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const expiredSessions = allSessions.filter(s => s.expiresAt < now);
    const activeLastHour = allSessions.filter(s => s.updatedAt >= oneHourAgo && s.expiresAt >= now);
    const activeLastDay = allSessions.filter(s => s.updatedAt >= oneDayAgo && s.expiresAt >= now);
    const staleButNotExpired = allSessions.filter(s => 
      s.updatedAt < oneDayAgo && s.expiresAt >= now
    );
    const veryOldSessions = allSessions.filter(s => s.updatedAt < threeDaysAgo);
    
    logger.force("\n=== SESSION ANALYSIS ===");
    logger.force(`Expired sessions (past expiresAt): ${expiredSessions.length}`);
    logger.force(`Active in last hour (truly active): ${activeLastHour.length}`);
    logger.force(`Active in last 24 hours: ${activeLastDay.length}`);
    logger.force(`Stale but not expired (not updated in 24h): ${staleButNotExpired.length}`);
    logger.force(`Very old sessions (not updated in 3+ days): ${veryOldSessions.length}`);
    
    // 3. Show sample of each category
    logger.force("\n=== SAMPLE DATA ===");
    
    if (activeLastHour.length > 0) {
      logger.force("\nTruly Active Sessions (last hour):");
      activeLastHour.slice(0, 3).forEach(s => {
        logger.force(`  - User: ${s.userEmail}, Updated: ${s.updatedAt?.toISOString()}`);
      });
    }
    
    if (expiredSessions.length > 0) {
      logger.force("\nExpired Sessions (to be deleted):");
      expiredSessions.slice(0, 5).forEach(s => {
        logger.force(`  - User: ${s.userEmail}, Expired: ${s.expiresAt.toISOString()}, Updated: ${s.updatedAt?.toISOString()}`);
      });
    }
    
    if (staleButNotExpired.length > 0) {
      logger.force("\nStale but not expired (suspicious - to be deleted):");
      staleButNotExpired.slice(0, 5).forEach(s => {
        logger.force(`  - User: ${s.userEmail}, Last Updated: ${s.updatedAt?.toISOString()}, Expires: ${s.expiresAt.toISOString()}`);
      });
    }
    
    // 4. Identify sessions to delete
    const sessionsToDelete = [
      ...expiredSessions.map(s => s.id),
      ...staleButNotExpired.map(s => s.id),
      ...veryOldSessions.map(s => s.id)
    ];
    
    // Remove duplicates
    const uniqueSessionsToDelete = [...new Set(sessionsToDelete)];
    
    logger.force(`\n=== CLEANUP PLAN ===`);
    logger.force(`Sessions to delete: ${uniqueSessionsToDelete.length}`);
    logger.force(`Sessions to keep (truly active): ${activeLastHour.length}`);
    
    // 5. Ask for confirmation
    logger.force("\nPreparing to delete stale sessions...");
    
    // 6. Perform cleanup
    if (uniqueSessionsToDelete.length > 0) {
      logger.force(`Deleting ${uniqueSessionsToDelete.length} stale sessions...`);
      
      // Delete all stale sessions with proper conditions
      // We delete sessions that meet ANY of these criteria:
      // 1. Already expired (past expiresAt)
      // 2. Not updated in last 24 hours (likely abandoned)
      // 3. Very old (not updated in 3+ days)
      
      const deleteResult = await db
        .delete(session)
        .where(
          // Delete if expired OR not updated in 24 hours
          lt(session.expiresAt, now)
        );
      
      logger.force(`Deleted ${expiredSessions.length} expired sessions`);
      
      // Also delete stale sessions not updated in 24 hours
      const deleteStale = await db
        .delete(session)
        .where(
          lt(session.updatedAt, oneDayAgo)
        );
      
      logger.force(`Deleted stale sessions not updated in 24+ hours`);
      
      logger.force("Cleanup completed!");
    } else {
      logger.force("No stale sessions to delete. All sessions appear to be active.");
    }
    
    // 7. Verify results
    logger.force("\n=== POST-CLEANUP VERIFICATION ===");
    
    const remainingSessions = await db
      .select({
        id: session.id,
        userId: session.userId,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        userName: user.name,
        userEmail: user.email
      })
      .from(session)
      .leftJoin(user, eq(session.userId, user.id))
      .orderBy(desc(session.updatedAt));
    
    const activeNow = remainingSessions.filter(s => 
      s.updatedAt >= oneHourAgo && s.expiresAt >= now
    );
    
    logger.force(`Total sessions remaining: ${remainingSessions.length}`);
    logger.force(`Active sessions (last hour): ${activeNow.length}`);
    
    logger.force("\nCurrent active users:");
    activeNow.forEach(s => {
      logger.force(`  - ${s.userEmail} (Last active: ${s.updatedAt?.toISOString()})`);
    });
    
    logger.force("\n=== SESSION CLEANUP COMPLETED SUCCESSFULLY ===");
    
  } catch (error) {
    logger.force("ERROR during session cleanup:", error);
    throw error;
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the cleanup
cleanupStaleSessions().catch(error => {
  logger.force("Fatal error:", error);
  process.exit(1);
});