import { educatorActivityService } from './educator-activity-service';
import { logger } from './logger';


/**
 * Utility functions to track educator activity throughout the application
 * These should be called whenever educators perform significant actions
 */

export class EducatorActivityTracker {
  
  /**
   * Track login activity
   * Call this from login endpoints/middleware
   */
  static async trackLogin(educatorId: string, metadata?: { ip?: string; userAgent?: string }) {
    try {
      await educatorActivityService.updateEducatorActivity('login', educatorId, metadata);
    } catch (error) {
      logger.error('Failed to track educator login', { educatorId, error });
    }
  }

  /**
   * Track quiz creation
   * Call this when a quiz is created (draft or published)
   */
  static async trackQuizCreated(educatorId: string, metadata?: { quizId?: string; isPublished?: boolean }) {
    try {
      await educatorActivityService.updateEducatorActivity('quiz_created', educatorId, metadata);
      
      // Also track if it was immediately published
      if (metadata?.isPublished) {
        await educatorActivityService.updateEducatorActivity('quiz_published', educatorId, metadata);
      }
    } catch (error) {
      logger.error('Failed to track quiz creation', { educatorId, error });
    }
  }

  /**
   * Track quiz publishing
   * Call this when a draft quiz is published
   */
  static async trackQuizPublished(educatorId: string, metadata?: { quizId?: string }) {
    try {
      await educatorActivityService.updateEducatorActivity('quiz_published', educatorId, metadata);
    } catch (error) {
      logger.error('Failed to track quiz publishing', { educatorId, error });
    }
  }

  /**
   * Track student addition
   * Call this when a student is added to educator's class
   */
  static async trackStudentAdded(educatorId: string, metadata?: { studentId?: string; method?: 'invitation' | 'enrollment' }) {
    try {
      await educatorActivityService.updateEducatorActivity('student_added', educatorId, metadata);
    } catch (error) {
      logger.error('Failed to track student addition', { educatorId, error });
    }
  }

  /**
   * Track document upload
   * Call this when a document is uploaded
   */
  static async trackDocumentUploaded(educatorId: string, metadata?: { documentId?: string; filename?: string }) {
    try {
      await educatorActivityService.updateEducatorActivity('document_uploaded', educatorId, metadata);
    } catch (error) {
      logger.error('Failed to track document upload', { educatorId, error });
    }
  }

  /**
   * Track dashboard visits
   * Call this from dashboard pages/API routes
   */
  static async trackDashboardVisit(educatorId: string, metadata?: { page?: string; section?: string }) {
    try {
      await educatorActivityService.updateEducatorActivity('dashboard_visit', educatorId, metadata);
    } catch (error) {
      logger.error('Failed to track dashboard visit', { educatorId, error });
    }
  }

  /**
   * Batch track multiple activities (useful for bulk operations)
   */
  static async trackBatchActivities(
    educatorId: string, 
    activities: Array<{
      type: 'login' | 'quiz_created' | 'quiz_published' | 'student_added' | 'document_uploaded' | 'dashboard_visit';
      metadata?: Record<string, unknown>;
    }>
  ) {
    try {
      for (const activity of activities) {
        await educatorActivityService.updateEducatorActivity(activity.type, educatorId, activity.metadata);
      }
    } catch (error) {
      logger.error('Failed to track batch activities', { educatorId, activities: activities.length, error });
    }
  }

  /**
   * Get educator activity summary (useful for debugging/admin purposes)
   */
  static async getActivitySummary(educatorId: string) {
    try {
      return await educatorActivityService.getEducatorActivitySnapshot(educatorId);
    } catch (error) {
      logger.error('Failed to get activity summary', { educatorId, error });
      return null;
    }
  }

  /**
   * Check if educator needs reminder (useful for proactive UI hints)
   */
  static async checkReminderEligibility(educatorId: string) {
    try {
      return await educatorActivityService.checkReminderEligibility(educatorId);
    } catch (error) {
      logger.error('Failed to check reminder eligibility', { educatorId, error });
      return null;
    }
  }
}

// Export individual functions for convenience
export const trackLogin = EducatorActivityTracker.trackLogin;
export const trackQuizCreated = EducatorActivityTracker.trackQuizCreated;
export const trackQuizPublished = EducatorActivityTracker.trackQuizPublished;
export const trackStudentAdded = EducatorActivityTracker.trackStudentAdded;
export const trackDocumentUploaded = EducatorActivityTracker.trackDocumentUploaded;
export const trackDashboardVisit = EducatorActivityTracker.trackDashboardVisit;