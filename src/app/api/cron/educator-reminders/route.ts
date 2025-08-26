import { NextRequest, NextResponse } from 'next/server';
import { eq } from "drizzle-orm";
import { educatorActivityService } from '@/lib/educator-activity-service';
import { sendEmail, emailTemplates } from '@/lib/email-service';
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { logger } from '@/lib/logger';


// This should be called by a cron job once daily
// Configure in Vercel, your hosting provider, or use a service like cron-job.org
// Recommended: Run once daily at 9:00 AM UTC (morning for most timezones)

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret (for security)
    const cronSecret = request.headers.get('x-cron-secret');
    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      logger.warn('Unauthorized cron request for educator reminders', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('Starting educator reminder check...');

    // Get all educators eligible for reminders
    const eligibleEducators = await educatorActivityService.getEducatorsEligibleForReminders();
    
    const results = {
      totalEligible: eligibleEducators.length,
      emailsSent: 0,
      emailsFailed: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Process each eligible educator
    for (const eligibility of eligibleEducators) {
      try {
        // Get educator details
        const [educator] = await db
          .select()
          .from(user)
          .where(eq(user.id, eligibility.activitySnapshot.educatorId))
          .limit(1);

        if (!educator) {
          results.skipped++;
          results.errors.push(`Educator ${eligibility.activitySnapshot.educatorId} not found`);
          continue;
        }

        // Generate the reminder email
        const emailContent = emailTemplates.educatorReminderEmail(
          educator.name,
          eligibility.triggerReason!,
          eligibility.reminderLevel,
          eligibility.daysSinceLastActivity,
          eligibility.activitySnapshot.totalQuizzes,
          eligibility.activitySnapshot.totalStudents,
          `${process.env.NEXT_PUBLIC_APP_URL}/educator/dashboard`
        );

        // Check if we're in dry-run mode (for testing)
        const isDryRun = process.env.EDUCATOR_REMINDERS_DRY_RUN === 'true';
        
        let emailResult;
        if (isDryRun) {
          // In dry-run mode, just log what we would send
          logger.info('DRY RUN: Would send educator reminder email', {
            educatorId: educator.id,
            educatorEmail: educator.email,
            educatorName: educator.name,
            subject: emailContent.subject,
            triggerReason: eligibility.triggerReason,
            reminderLevel: eligibility.reminderLevel,
            daysSinceLastActivity: eligibility.daysSinceLastActivity
          });
          
          emailResult = { success: true, messageId: 'dry-run', simulated: true };
        } else {
          // Send the actual email
          emailResult = await sendEmail({
            to: educator.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          });
        }

        if (emailResult.success) {
          // Record the reminder in our tracking system
          await educatorActivityService.recordReminderSent(
            educator.id,
            'inactivity_reminder',
            eligibility.reminderLevel,
            eligibility.triggerReason!,
            emailContent.subject,
            eligibility.activitySnapshot
          );

          results.emailsSent++;
          results.details.push({
            educatorId: educator.id,
            educatorName: educator.name,
            emailSent: true,
            dryRun: isDryRun,
            triggerReason: eligibility.triggerReason,
            reminderLevel: eligibility.reminderLevel,
            daysSinceLastActivity: eligibility.daysSinceLastActivity,
            messageId: emailResult.messageId
          });

          logger.info('Educator reminder sent successfully', {
            educatorId: educator.id,
            educatorName: educator.name,
            triggerReason: eligibility.triggerReason,
            reminderLevel: eligibility.reminderLevel,
            dryRun: isDryRun
          });

        } else {
          results.emailsFailed++;
          results.errors.push(`Failed to send to ${educator.email}: ${emailResult.error}`);
          
          logger.error('Failed to send educator reminder', {
            educatorId: educator.id,
            educatorEmail: educator.email,
            error: emailResult.error
          });
        }

        // Small delay to prevent overwhelming the email service
        if (!isDryRun && eligibleEducators.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }

      } catch (error) {
        results.emailsFailed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Error processing educator ${eligibility.activitySnapshot.educatorId}: ${errorMsg}`);
        
        logger.error('Error processing educator for reminder', {
          educatorId: eligibility.activitySnapshot.educatorId,
          error: errorMsg
        });
      }
    }

    const duration = Date.now() - startTime;

    // Log summary
    logger.info('Educator reminder job completed', {
      duration: `${duration}ms`,
      totalEligible: results.totalEligible,
      emailsSent: results.emailsSent,
      emailsFailed: results.emailsFailed,
      skipped: results.skipped,
      errorCount: results.errors.length,
      isDryRun: process.env.EDUCATOR_REMINDERS_DRY_RUN === 'true'
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalEligible: results.totalEligible,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed,
        skipped: results.skipped,
        errorCount: results.errors.length,
        duration: `${duration}ms`,
        isDryRun: process.env.EDUCATOR_REMINDERS_DRY_RUN === 'true'
      },
      details: results.details,
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Educator reminder job failed', {
      error: errorMsg,
      duration: `${duration}ms`
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMsg,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}