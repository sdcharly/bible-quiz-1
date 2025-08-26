import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { adminNotifications, AdminNotificationPreferences } from "@/lib/admin-notifications";
import { logger } from "@/lib/logger";


export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Get current notification preferences
    const preferences = adminNotifications.getPreferences();
    
    return NextResponse.json({
      success: true,
      preferences,
      pendingCount: adminNotifications.getPendingNotificationCount()
    });

  } catch (error) {
    logger.error("Error fetching admin notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const updates: Partial<AdminNotificationPreferences> = await request.json();
    
    // Validate the updates
    if (updates.adminEmail && !isValidEmail(updates.adminEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (updates.quietHoursStart && !isValidTimeFormat(updates.quietHoursStart)) {
      return NextResponse.json(
        { error: "Invalid quiet hours start time format (use HH:MM)" },
        { status: 400 }
      );
    }

    if (updates.quietHoursEnd && !isValidTimeFormat(updates.quietHoursEnd)) {
      return NextResponse.json(
        { error: "Invalid quiet hours end time format (use HH:MM)" },
        { status: 400 }
      );
    }

    // Update preferences
    adminNotifications.updatePreferences(updates);
    
    logger.log(`Admin ${session.email} updated notification preferences`);

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully",
      preferences: adminNotifications.getPreferences()
    });

  } catch (error) {
    logger.error("Error updating admin notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update notification preferences" },
      { status: 500 }
    );
  }
}

// Test notification endpoint
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const { testType } = await request.json();
    
    // Send a test notification
    let success = false;
    
    switch (testType) {
      case 'low':
        success = await adminNotifications.sendNotification(
          'weekly_platform_stats',
          'Test Notification - Low Priority',
          'This is a test notification to verify your email delivery settings are working correctly.',
          { testBy: session.email, timestamp: new Date().toISOString() }
        );
        break;
        
      case 'high':
        success = await adminNotifications.sendNotification(
          'educator_signup_pending',
          'Test Notification - High Priority',
          'This is a test high priority notification to verify urgent alerts are being delivered promptly.',
          { testBy: session.email, timestamp: new Date().toISOString() }
        );
        break;
        
      case 'critical':
        success = await adminNotifications.sendNotification(
          'security_breach_attempt',
          'Test Notification - Critical Priority',
          'This is a test critical notification to verify emergency alerts are being delivered immediately.',
          { testBy: session.email, timestamp: new Date().toISOString() }
        );
        break;
        
      default:
        return NextResponse.json(
          { error: "Invalid test type. Use 'low', 'high', or 'critical'" },
          { status: 400 }
        );
    }

    logger.log(`Admin ${session.email} sent test notification: ${testType}`);

    return NextResponse.json({
      success,
      message: success 
        ? `Test ${testType} priority notification sent successfully` 
        : 'Failed to send test notification'
    });

  } catch (error) {
    logger.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}