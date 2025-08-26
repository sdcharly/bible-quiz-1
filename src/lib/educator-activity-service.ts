import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { 
  user, 
  session, 
  quizzes, 
  documents, 
  educatorStudents,
  educatorActivityMetrics,
  educatorReminderEmails 
} from "@/lib/schema";
import { eq, and, gte, desc, count, isNull, or } from "drizzle-orm";
import { logger } from "@/lib/logger";

export interface EducatorActivitySnapshot {
  educatorId: string;
  lastLoginAt?: Date;
  lastQuizCreatedAt?: Date;
  lastQuizPublishedAt?: Date;
  lastStudentAddedAt?: Date;
  lastDocumentUploadedAt?: Date;
  lastDashboardVisitAt?: Date;
  totalQuizzes: number;
  totalStudents: number;
  totalDocuments: number;
  totalLogins: number;
  engagementScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ReminderEligibility {
  isEligible: boolean;
  reason?: string;
  triggerReason?: string;
  reminderLevel: number;
  daysSinceLastActivity: number;
  activitySnapshot: EducatorActivitySnapshot;
  spamRisk: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Intelligent Educator Activity Tracking Service
 * 
 * This service provides sophisticated tracking and analysis of educator engagement
 * to send meaningful, non-spammy reminders that encourage continued use.
 */
export class EducatorActivityService {
  
  /**
   * Updates or creates activity metrics for an educator
   * Should be called whenever an educator performs any significant action
   */
  async updateEducatorActivity(
    activityType: 'login' | 'quiz_created' | 'quiz_published' | 'student_added' | 'document_uploaded' | 'dashboard_visit',
    educatorId: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const now = new Date();
      
      // Get current metrics or create new one
      let currentMetrics = await db
        .select()
        .from(educatorActivityMetrics)
        .where(eq(educatorActivityMetrics.educatorId, educatorId))
        .limit(1);

      let updateData: Partial<typeof educatorActivityMetrics.$inferInsert> = {
        updatedAt: now
      };

      // Update specific activity timestamps and counters
      switch (activityType) {
        case 'login':
          updateData.lastLoginAt = now;
          updateData.totalLogins = sql`${educatorActivityMetrics.totalLogins} + 1` as any;
          break;
        case 'quiz_created':
          updateData.lastQuizCreatedAt = now;
          updateData.totalQuizzes = sql`${educatorActivityMetrics.totalQuizzes} + 1` as any;
          break;
        case 'quiz_published':
          updateData.lastQuizPublishedAt = now;
          break;
        case 'student_added':
          updateData.lastStudentAddedAt = now;
          updateData.totalStudents = sql`${educatorActivityMetrics.totalStudents} + 1` as any;
          break;
        case 'document_uploaded':
          updateData.lastDocumentUploadedAt = now;
          updateData.totalDocuments = sql`${educatorActivityMetrics.totalDocuments} + 1` as any;
          break;
        case 'dashboard_visit':
          updateData.lastDashboardVisitAt = now;
          break;
      }

      if (currentMetrics.length === 0) {
        // Create new metrics record
        await db.insert(educatorActivityMetrics).values({
          id: `eam_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          educatorId,
          ...updateData,
          // Initialize counters for new records
          totalQuizzes: activityType === 'quiz_created' ? 1 : 0,
          totalStudents: activityType === 'student_added' ? 1 : 0,
          totalDocuments: activityType === 'document_uploaded' ? 1 : 0,
          totalLogins: activityType === 'login' ? 1 : 0,
          engagementScore: await this.calculateEngagementScore(educatorId, updateData as any),
          riskLevel: 'low'
        });
      } else {
        // Update existing metrics
        await db
          .update(educatorActivityMetrics)
          .set(updateData)
          .where(eq(educatorActivityMetrics.educatorId, educatorId));
      }

      // Recalculate engagement score after update
      await this.recalculateEngagementScore(educatorId);

      logger.debug('Educator activity updated', {
        educatorId,
        activityType,
        metadata
      });

    } catch (error) {
      logger.error('Failed to update educator activity', {
        educatorId,
        activityType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get comprehensive activity snapshot for an educator
   */
  async getEducatorActivitySnapshot(educatorId: string): Promise<EducatorActivitySnapshot | null> {
    try {
      const metrics = await db
        .select()
        .from(educatorActivityMetrics)
        .where(eq(educatorActivityMetrics.educatorId, educatorId))
        .limit(1);

      if (metrics.length === 0) {
        // Create initial snapshot from database queries
        return await this.createInitialSnapshot(educatorId);
      }

      const metric = metrics[0];
      return {
        educatorId,
        lastLoginAt: metric.lastLoginAt || undefined,
        lastQuizCreatedAt: metric.lastQuizCreatedAt || undefined,
        lastQuizPublishedAt: metric.lastQuizPublishedAt || undefined,
        lastStudentAddedAt: metric.lastStudentAddedAt || undefined,
        lastDocumentUploadedAt: metric.lastDocumentUploadedAt || undefined,
        lastDashboardVisitAt: metric.lastDashboardVisitAt || undefined,
        totalQuizzes: metric.totalQuizzes || 0,
        totalStudents: metric.totalStudents || 0,
        totalDocuments: metric.totalDocuments || 0,
        totalLogins: metric.totalLogins || 0,
        engagementScore: metric.engagementScore || 0,
        riskLevel: metric.riskLevel as 'low' | 'medium' | 'high'
      };

    } catch (error) {
      logger.error('Failed to get educator activity snapshot', {
        educatorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check if an educator is eligible for a reminder email
   * This is the core intelligence that prevents spam
   */
  async checkReminderEligibility(educatorId: string): Promise<ReminderEligibility> {
    try {
      // Get educator info
      const educator = await db
        .select()
        .from(user)
        .where(and(
          eq(user.id, educatorId),
          eq(user.role, 'educator'),
          eq(user.approvalStatus, 'approved')
        ))
        .limit(1);

      if (educator.length === 0) {
        return {
          isEligible: false,
          reason: 'Educator not found or not approved',
          reminderLevel: 0,
          daysSinceLastActivity: 0,
          activitySnapshot: {} as any,
          spamRisk: 'high'
        };
      }

      // Get activity snapshot
      const activitySnapshot = await this.getEducatorActivitySnapshot(educatorId);
      if (!activitySnapshot) {
        return {
          isEligible: false,
          reason: 'Unable to retrieve activity data',
          reminderLevel: 0,
          daysSinceLastActivity: 0,
          activitySnapshot: {} as any,
          spamRisk: 'medium'
        };
      }

      // Calculate days since last significant activity
      const daysSinceLastActivity = this.calculateDaysSinceLastActivity(activitySnapshot);
      
      // Check spam risk based on recent email history
      const spamRisk = await this.assessSpamRisk(educatorId);
      if (spamRisk === 'high') {
        return {
          isEligible: false,
          reason: 'Too many recent reminders sent',
          reminderLevel: 0,
          daysSinceLastActivity,
          activitySnapshot,
          spamRisk
        };
      }

      // Get reminder history to determine level
      const reminderHistory = await db
        .select()
        .from(educatorReminderEmails)
        .where(eq(educatorReminderEmails.educatorId, educatorId))
        .orderBy(desc(educatorReminderEmails.sentAt))
        .limit(5);

      const reminderLevel = this.determineReminderLevel(reminderHistory, daysSinceLastActivity);

      // Core eligibility logic
      const eligibilityRules = this.applyEligibilityRules(
        activitySnapshot,
        daysSinceLastActivity,
        reminderHistory,
        spamRisk
      );

      return {
        isEligible: eligibilityRules.isEligible,
        reason: eligibilityRules.reason,
        triggerReason: eligibilityRules.triggerReason,
        reminderLevel,
        daysSinceLastActivity,
        activitySnapshot,
        spamRisk
      };

    } catch (error) {
      logger.error('Failed to check reminder eligibility', {
        educatorId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        isEligible: false,
        reason: 'System error occurred',
        reminderLevel: 0,
        daysSinceLastActivity: 0,
        activitySnapshot: {} as any,
        spamRisk: 'high'
      };
    }
  }

  /**
   * Get all educators eligible for reminders
   */
  async getEducatorsEligibleForReminders(): Promise<ReminderEligibility[]> {
    try {
      // Get all approved educators
      const educators = await db
        .select()
        .from(user)
        .where(and(
          eq(user.role, 'educator'),
          eq(user.approvalStatus, 'approved')
        ));

      const eligibleEducators: ReminderEligibility[] = [];

      // Check each educator individually (this ensures we respect rate limits per educator)
      for (const educator of educators) {
        const eligibility = await this.checkReminderEligibility(educator.id);
        if (eligibility.isEligible) {
          eligibleEducators.push(eligibility);
        }
      }

      logger.info('Checked educators for reminder eligibility', {
        totalEducators: educators.length,
        eligibleEducators: eligibleEducators.length
      });

      return eligibleEducators;

    } catch (error) {
      logger.error('Failed to get eligible educators', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Record that a reminder email was sent
   */
  async recordReminderSent(
    educatorId: string,
    emailType: string,
    reminderLevel: number,
    triggerReason: string,
    emailSubject: string,
    activitySnapshot: EducatorActivitySnapshot
  ): Promise<void> {
    try {
      await db.insert(educatorReminderEmails).values({
        id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        educatorId,
        emailType,
        reminderLevel,
        triggerReason,
        emailSubject,
        activityMetricsSnapshot: {
          lastLoginDaysAgo: this.daysSince(activitySnapshot.lastLoginAt),
          lastQuizCreatedDaysAgo: this.daysSince(activitySnapshot.lastQuizCreatedAt),
          totalQuizzes: activitySnapshot.totalQuizzes,
          totalStudents: activitySnapshot.totalStudents,
          engagementScore: activitySnapshot.engagementScore,
          riskLevel: activitySnapshot.riskLevel
        }
      });

      logger.info('Reminder email recorded', {
        educatorId,
        emailType,
        reminderLevel,
        triggerReason
      });

    } catch (error) {
      logger.error('Failed to record reminder email', {
        educatorId,
        emailType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private async createInitialSnapshot(educatorId: string): Promise<EducatorActivitySnapshot> {
    // Query database to get initial data
    const [quizCount] = await db
      .select({ count: count() })
      .from(quizzes)
      .where(eq(quizzes.educatorId, educatorId));

    const [studentCount] = await db
      .select({ count: count() })
      .from(educatorStudents)
      .where(eq(educatorStudents.educatorId, educatorId));

    const [documentCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.educatorId, educatorId));

    // Get latest session for login info
    const latestSession = await db
      .select()
      .from(session)
      .where(eq(session.userId, educatorId))
      .orderBy(desc(session.createdAt))
      .limit(1);

    const snapshot: EducatorActivitySnapshot = {
      educatorId,
      lastLoginAt: latestSession[0]?.createdAt || undefined,
      totalQuizzes: quizCount.count,
      totalStudents: studentCount.count,
      totalDocuments: documentCount.count,
      totalLogins: 0, // We don't track this historically
      engagementScore: await this.calculateEngagementScore(educatorId, {} as any),
      riskLevel: 'low'
    };

    return snapshot;
  }

  private async calculateEngagementScore(educatorId: string, metrics: any): Promise<number> {
    let score = 0;
    
    // Base engagement factors
    const hasQuizzes = (metrics.totalQuizzes || 0) > 0;
    const hasStudents = (metrics.totalStudents || 0) > 0;
    const hasDocuments = (metrics.totalDocuments || 0) > 0;
    const recentLogin = metrics.lastLoginAt && this.daysSince(metrics.lastLoginAt) < 7;
    
    // Scoring algorithm
    if (hasQuizzes) score += 30;
    if (hasStudents) score += 25;
    if (hasDocuments) score += 20;
    if (recentLogin) score += 25;
    
    // Bonus for activity combinations
    if (hasQuizzes && hasStudents) score += 15;
    if (hasQuizzes && hasDocuments) score += 10;
    
    return Math.min(100, score);
  }

  private async recalculateEngagementScore(educatorId: string): Promise<void> {
    const snapshot = await this.getEducatorActivitySnapshot(educatorId);
    if (snapshot) {
      const newScore = await this.calculateEngagementScore(educatorId, snapshot);
      const newRiskLevel = this.calculateRiskLevel(snapshot);
      
      await db
        .update(educatorActivityMetrics)
        .set({ 
          engagementScore: newScore,
          riskLevel: newRiskLevel
        })
        .where(eq(educatorActivityMetrics.educatorId, educatorId));
    }
  }

  private calculateRiskLevel(snapshot: EducatorActivitySnapshot): 'low' | 'medium' | 'high' {
    const daysSinceLogin = this.daysSince(snapshot.lastLoginAt);
    const daysSinceQuiz = this.daysSince(snapshot.lastQuizCreatedAt);
    
    if (daysSinceLogin > 30 || (daysSinceQuiz > 30 && snapshot.totalQuizzes === 0)) {
      return 'high';
    }
    if (daysSinceLogin > 14 || daysSinceQuiz > 14) {
      return 'medium';
    }
    return 'low';
  }

  private calculateDaysSinceLastActivity(snapshot: EducatorActivitySnapshot): number {
    const activities = [
      snapshot.lastLoginAt,
      snapshot.lastQuizCreatedAt,
      snapshot.lastQuizPublishedAt,
      snapshot.lastStudentAddedAt,
      snapshot.lastDocumentUploadedAt,
      snapshot.lastDashboardVisitAt
    ].filter(Boolean);

    if (activities.length === 0) return 999; // Very old account

    const mostRecent = new Date(Math.max(...activities.map(d => d!.getTime())));
    return this.daysSince(mostRecent);
  }

  private async assessSpamRisk(educatorId: string): Promise<'none' | 'low' | 'medium' | 'high'> {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentEmails = await db
      .select()
      .from(educatorReminderEmails)
      .where(and(
        eq(educatorReminderEmails.educatorId, educatorId),
        gte(educatorReminderEmails.sentAt, last7Days)
      ));

    const emailsIn24h = recentEmails.filter(e => e.sentAt >= last24Hours);
    
    // Strict spam prevention rules
    if (emailsIn24h.length > 0) return 'high'; // No more than 1 email per day
    if (recentEmails.length >= 2) return 'high'; // No more than 2 emails per week
    if (recentEmails.length === 1) return 'medium';
    return 'none';
  }

  private determineReminderLevel(reminderHistory: any[], daysSinceLastActivity: number): number {
    if (reminderHistory.length === 0) return 1;
    
    const lastReminder = reminderHistory[0];
    const daysSinceLastReminder = this.daysSince(lastReminder.sentAt);
    
    // Only increase level if significant time has passed and they're still inactive
    if (daysSinceLastReminder >= 7 && daysSinceLastActivity >= 7) {
      return Math.min(3, lastReminder.reminderLevel + 1);
    }
    
    return lastReminder.reminderLevel;
  }

  private applyEligibilityRules(
    snapshot: EducatorActivitySnapshot,
    daysSinceLastActivity: number,
    reminderHistory: any[],
    spamRisk: 'none' | 'low' | 'medium' | 'high'
  ): { isEligible: boolean; reason?: string; triggerReason?: string } {
    
    // Rule 1: Must have some inactivity
    if (daysSinceLastActivity < 7) {
      return {
        isEligible: false,
        reason: 'Educator is still active (less than 7 days since last activity)'
      };
    }

    // Rule 2: Spam prevention
    if (spamRisk === 'high') {
      return {
        isEligible: false,
        reason: 'Spam risk too high - recent emails sent'
      };
    }

    // Rule 3: Don't send too many reminders to completely disengaged users
    if (reminderHistory.length >= 3 && snapshot.engagementScore < 10) {
      return {
        isEligible: false,
        reason: 'Maximum reminders sent to disengaged user'
      };
    }

    // Rule 4: Different triggers for different scenarios
    if (snapshot.totalQuizzes === 0 && daysSinceLastActivity >= 7) {
      return {
        isEligible: true,
        triggerReason: 'no_quizzes_created'
      };
    }

    if (snapshot.totalStudents === 0 && snapshot.totalQuizzes > 0 && daysSinceLastActivity >= 10) {
      return {
        isEligible: true,
        triggerReason: 'has_quizzes_no_students'
      };
    }

    if (snapshot.engagementScore > 50 && daysSinceLastActivity >= 14) {
      return {
        isEligible: true,
        triggerReason: 'previously_engaged_now_inactive'
      };
    }

    if (daysSinceLastActivity >= 14) {
      return {
        isEligible: true,
        triggerReason: '14_days_inactive'
      };
    }

    return {
      isEligible: false,
      reason: 'No applicable trigger conditions met'
    };
  }

  private daysSince(date?: Date): number {
    if (!date) return 999;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Singleton instance
export const educatorActivityService = new EducatorActivityService();