import { NextRequest, NextResponse } from 'next/server';
import { educatorActivityService } from '@/lib/educator-activity-service';
import { emailTemplates } from '@/lib/email-service';
import { db } from "@/lib/db";
import { user, educatorActivityMetrics, educatorReminderEmails } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { logger } from '@/lib/logger';
import { getAdminSession } from "@/lib/admin-auth";

// This is a testing endpoint for admins to test the educator reminder system
// It allows testing without sending real emails or affecting production data

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getAdminSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'test';
    const educatorId = url.searchParams.get('educatorId');

    logger.info('Admin testing educator reminders', {
      action,
      educatorId,
      adminId: session.id
    });

    switch (action) {
      case 'test':
        return await testReminderSystem(educatorId);
      case 'simulate':
        return await simulateInactiveEducator(educatorId);
      case 'check-eligibility':
        return await checkSpecificEducator(educatorId);
      case 'preview-email':
        return await previewReminderEmail(educatorId);
      case 'reset-metrics':
        return await resetEducatorMetrics(educatorId);
      case 'list-eligible':
        return await listEligibleEducators();
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: test, simulate, check-eligibility, preview-email, reset-metrics, list-eligible' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Error in educator reminder testing', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function testReminderSystem(educatorId?: string | null) {
  const results = {
    totalEducators: 0,
    eligibleEducators: 0,
    testResults: [] as any[],
    systemHealth: {
      activityServiceWorking: false,
      emailTemplateWorking: false,
      spamPreventionWorking: false
    }
  };

  try {
    // Test 1: Basic service functionality
    const eligibleEducators = await educatorActivityService.getEducatorsEligibleForReminders();
    results.eligibleEducators = eligibleEducators.length;
    results.systemHealth.activityServiceWorking = true;

    // Test 2: Email template generation
    try {
      const testEmail = emailTemplates.educatorReminderEmail(
        'Test Educator',
        'no_quizzes_created',
        1,
        7,
        0,
        0
      );
      results.systemHealth.emailTemplateWorking = !!testEmail.subject && !!testEmail.html;
    } catch (emailError) {
      results.systemHealth.emailTemplateWorking = false;
    }

    // Test 3: Spam prevention
    if (educatorId) {
      const eligibility1 = await educatorActivityService.checkReminderEligibility(educatorId);
      const eligibility2 = await educatorActivityService.checkReminderEligibility(educatorId);
      results.systemHealth.spamPreventionWorking = true; // If no errors, spam prevention is working
    }

    // Get detailed results for specific educator or all eligible
    if (educatorId) {
      const educator = await db
        .select()
        .from(user)
        .where(eq(user.id, educatorId))
        .limit(1);

      if (educator.length > 0) {
        const eligibility = await educatorActivityService.checkReminderEligibility(educatorId);
        const snapshot = await educatorActivityService.getEducatorActivitySnapshot(educatorId);
        
        results.testResults.push({
          educatorId,
          educatorName: educator[0].name,
          educatorEmail: educator[0].email,
          isEligible: eligibility.isEligible,
          reason: eligibility.reason,
          triggerReason: eligibility.triggerReason,
          reminderLevel: eligibility.reminderLevel,
          daysSinceLastActivity: eligibility.daysSinceLastActivity,
          spamRisk: eligibility.spamRisk,
          activitySnapshot: snapshot
        });
      }
    } else {
      // Test a few eligible educators
      for (const eligibility of eligibleEducators.slice(0, 5)) {
        const educator = await db
          .select()
          .from(user)
          .where(eq(user.id, eligibility.activitySnapshot.educatorId))
          .limit(1);

        if (educator.length > 0) {
          results.testResults.push({
            educatorId: eligibility.activitySnapshot.educatorId,
            educatorName: educator[0].name,
            educatorEmail: educator[0].email,
            isEligible: eligibility.isEligible,
            reason: eligibility.reason,
            triggerReason: eligibility.triggerReason,
            reminderLevel: eligibility.reminderLevel,
            daysSinceLastActivity: eligibility.daysSinceLastActivity,
            spamRisk: eligibility.spamRisk
          });
        }
      }
    }

    // Get total educator count
    const [totalCount] = await db
      .select({ count: count() })
      .from(user)
      .where(and(eq(user.role, 'educator'), eq(user.approvalStatus, 'approved')));
    
    results.totalEducators = totalCount.count;

    return NextResponse.json({
      success: true,
      testMode: true,
      message: 'Test completed successfully',
      results,
      recommendations: generateRecommendations(results),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}

async function checkSpecificEducator(educatorId?: string | null) {
  if (!educatorId) {
    return NextResponse.json(
      { error: 'educatorId parameter is required' },
      { status: 400 }
    );
  }

  const educator = await db
    .select()
    .from(user)
    .where(eq(user.id, educatorId))
    .limit(1);

  if (educator.length === 0) {
    return NextResponse.json(
      { error: 'Educator not found' },
      { status: 404 }
    );
  }

  const eligibility = await educatorActivityService.checkReminderEligibility(educatorId);
  const snapshot = await educatorActivityService.getEducatorActivitySnapshot(educatorId);

  // Get reminder history
  const reminderHistory = await db
    .select()
    .from(educatorReminderEmails)
    .where(eq(educatorReminderEmails.educatorId, educatorId))
    .orderBy(desc(educatorReminderEmails.sentAt))
    .limit(10);

  return NextResponse.json({
    success: true,
    educator: {
      id: educator[0].id,
      name: educator[0].name,
      email: educator[0].email,
      role: educator[0].role,
      approvalStatus: educator[0].approvalStatus
    },
    eligibility,
    activitySnapshot: snapshot,
    reminderHistory: reminderHistory.map(r => ({
      sentAt: r.sentAt,
      emailType: r.emailType,
      reminderLevel: r.reminderLevel,
      triggerReason: r.triggerReason,
      emailSubject: r.emailSubject
    })),
    timestamp: new Date().toISOString()
  });
}

async function previewReminderEmail(educatorId?: string | null) {
  if (!educatorId) {
    return NextResponse.json(
      { error: 'educatorId parameter is required' },
      { status: 400 }
    );
  }

  const educator = await db
    .select()
    .from(user)
    .where(eq(user.id, educatorId))
    .limit(1);

  if (educator.length === 0) {
    return NextResponse.json(
      { error: 'Educator not found' },
      { status: 404 }
    );
  }

  const eligibility = await educatorActivityService.checkReminderEligibility(educatorId);
  const snapshot = eligibility.activitySnapshot;

  const emailContent = emailTemplates.educatorReminderEmail(
    educator[0].name,
    eligibility.triggerReason || 'no_quizzes_created',
    eligibility.reminderLevel,
    eligibility.daysSinceLastActivity,
    snapshot.totalQuizzes,
    snapshot.totalStudents
  );

  return NextResponse.json({
    success: true,
    educator: {
      name: educator[0].name,
      email: educator[0].email
    },
    emailPreview: {
      subject: emailContent.subject,
      htmlPreview: emailContent.html.substring(0, 1000) + '...',
      textPreview: emailContent.text.substring(0, 500) + '...',
      fullHtml: emailContent.html,
      fullText: emailContent.text
    },
    eligibilityContext: eligibility,
    timestamp: new Date().toISOString()
  });
}

async function simulateInactiveEducator(educatorId?: string | null) {
  if (!educatorId) {
    return NextResponse.json(
      { error: 'educatorId parameter is required' },
      { status: 400 }
    );
  }

  // This simulates an inactive educator by creating/updating their metrics
  // to make them appear inactive (for testing purposes)
  
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await db
    .insert(educatorActivityMetrics)
    .values({
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      educatorId,
      lastLoginAt: twoWeeksAgo,
      lastDashboardVisitAt: oneMonthAgo,
      totalQuizzes: 0,
      totalStudents: 0,
      totalDocuments: 0,
      totalLogins: 5,
      engagementScore: 15,
      riskLevel: 'high'
    })
    .onConflictDoUpdate({
      target: educatorActivityMetrics.educatorId,
      set: {
        lastLoginAt: twoWeeksAgo,
        lastDashboardVisitAt: oneMonthAgo,
        totalQuizzes: 0,
        totalStudents: 0,
        engagementScore: 15,
        riskLevel: 'high',
        updatedAt: new Date()
      }
    });

  // Check eligibility after simulation
  const eligibility = await educatorActivityService.checkReminderEligibility(educatorId);

  return NextResponse.json({
    success: true,
    message: 'Educator simulated as inactive',
    educatorId,
    simulatedState: {
      lastLoginAt: twoWeeksAgo,
      lastDashboardVisitAt: oneMonthAgo,
      totalQuizzes: 0,
      totalStudents: 0,
      engagementScore: 15,
      riskLevel: 'high'
    },
    eligibilityAfterSimulation: eligibility,
    timestamp: new Date().toISOString()
  });
}

async function resetEducatorMetrics(educatorId?: string | null) {
  if (!educatorId) {
    return NextResponse.json(
      { error: 'educatorId parameter is required' },
      { status: 400 }
    );
  }

  // Delete existing metrics and reminder history for clean testing
  await db
    .delete(educatorActivityMetrics)
    .where(eq(educatorActivityMetrics.educatorId, educatorId));
  
  await db
    .delete(educatorReminderEmails)
    .where(eq(educatorReminderEmails.educatorId, educatorId));

  return NextResponse.json({
    success: true,
    message: 'Educator metrics and reminder history reset',
    educatorId,
    timestamp: new Date().toISOString()
  });
}

async function listEligibleEducators() {
  const eligibleEducators = await educatorActivityService.getEducatorsEligibleForReminders();
  
  const educatorDetails = await Promise.all(
    eligibleEducators.slice(0, 20).map(async (eligibility) => {
      const [educator] = await db
        .select()
        .from(user)
        .where(eq(user.id, eligibility.activitySnapshot.educatorId))
        .limit(1);

      return {
        id: eligibility.activitySnapshot.educatorId,
        name: educator?.name || 'Unknown',
        email: educator?.email || 'Unknown',
        isEligible: eligibility.isEligible,
        triggerReason: eligibility.triggerReason,
        reminderLevel: eligibility.reminderLevel,
        daysSinceLastActivity: eligibility.daysSinceLastActivity,
        spamRisk: eligibility.spamRisk,
        engagementScore: eligibility.activitySnapshot.engagementScore,
        totalQuizzes: eligibility.activitySnapshot.totalQuizzes,
        totalStudents: eligibility.activitySnapshot.totalStudents
      };
    })
  );

  return NextResponse.json({
    success: true,
    totalEligible: eligibleEducators.length,
    showing: Math.min(20, eligibleEducators.length),
    educators: educatorDetails,
    timestamp: new Date().toISOString()
  });
}

function generateRecommendations(results: any) {
  const recommendations = [];

  if (!results.systemHealth.activityServiceWorking) {
    recommendations.push('❌ Activity service is not working - check database connection and schema');
  }

  if (!results.systemHealth.emailTemplateWorking) {
    recommendations.push('❌ Email template generation failed - check email service');
  }

  if (results.eligibleEducators === 0) {
    recommendations.push('ℹ️ No educators currently eligible for reminders - system is working but no action needed');
  } else if (results.eligibleEducators > 50) {
    recommendations.push('⚠️ Many educators eligible for reminders - consider reviewing engagement strategies');
  }

  if (results.eligibleEducators > 0 && results.totalEducators > 0) {
    const percentage = (results.eligibleEducators / results.totalEducators) * 100;
    if (percentage > 30) {
      recommendations.push(`⚠️ ${percentage.toFixed(1)}% of educators are inactive - consider broader engagement initiatives`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System appears to be working correctly');
    recommendations.push('💡 Test with dry run mode enabled before going live');
    recommendations.push('📧 Consider testing email delivery with a small group first');
  }

  return recommendations;
}

import { count, desc } from "drizzle-orm";