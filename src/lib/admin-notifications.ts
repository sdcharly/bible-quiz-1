import { sendEmail } from './email-service';
import { logger } from './logger';


export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: Record<string, any>;
  createdAt: Date;
  adminEmail?: string;
}

export type NotificationEventType = 
  // Critical - Immediate action required
  | 'educator_signup_pending'
  | 'security_breach_attempt'
  | 'system_critical_error'
  | 'payment_failure'
  | 'database_connection_lost'
  
  // Important - Daily attention needed
  | 'educator_status_changed'
  | 'performance_degradation'
  | 'content_flagged'
  | 'bulk_user_registration'
  | 'api_rate_limit_exceeded'
  
  // Informational - Weekly summaries
  | 'weekly_platform_stats'
  | 'weekly_performance_report'
  | 'weekly_user_activity';

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AdminNotificationPreferences {
  adminEmail: string;
  enabledEventTypes: NotificationEventType[];
  emailFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string;   // HH:MM format
  timezone: string;
}

// Default admin notification preferences
export const DEFAULT_ADMIN_PREFERENCES: AdminNotificationPreferences = {
  adminEmail: process.env.ADMIN_EMAIL || 'admin@biblequiz.textr.in',
  enabledEventTypes: [
    'educator_signup_pending',
    'security_breach_attempt', 
    'system_critical_error',
    'payment_failure',
    'database_connection_lost',
    'educator_status_changed',
    'performance_degradation',
    'weekly_platform_stats'
  ],
  emailFrequency: 'immediate',
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  timezone: 'Asia/Kolkata'
};

class AdminNotificationService {
  private static instance: AdminNotificationService;
  private pendingNotifications: NotificationEvent[] = [];
  private preferences: AdminNotificationPreferences = DEFAULT_ADMIN_PREFERENCES;
  
  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  // Update admin preferences
  updatePreferences(newPreferences: Partial<AdminNotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPreferences };
  }

  // Get current preferences
  getPreferences(): AdminNotificationPreferences {
    return { ...this.preferences };
  }

  // Check if we're in quiet hours
  private isQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { 
      hour12: false, 
      timeZone: this.preferences.timezone 
    }).substring(0, 5);
    
    const { quietHoursStart, quietHoursEnd } = this.preferences;
    if (!quietHoursStart || !quietHoursEnd) return false;
    
    return currentTime >= quietHoursStart || currentTime <= quietHoursEnd;
  }

  // Check if event type is enabled
  private isEventTypeEnabled(eventType: NotificationEventType): boolean {
    return this.preferences.enabledEventTypes.includes(eventType);
  }

  // Get priority level for event type
  private getEventPriority(eventType: NotificationEventType): NotificationPriority {
    const priorityMap: Record<NotificationEventType, NotificationPriority> = {
      // Critical
      'educator_signup_pending': 'high',
      'security_breach_attempt': 'critical',
      'system_critical_error': 'critical', 
      'payment_failure': 'critical',
      'database_connection_lost': 'critical',
      
      // High
      'educator_status_changed': 'high',
      'performance_degradation': 'high',
      'content_flagged': 'high',
      'bulk_user_registration': 'high',
      'api_rate_limit_exceeded': 'high',
      
      // Medium/Low
      'weekly_platform_stats': 'medium',
      'weekly_performance_report': 'medium',
      'weekly_user_activity': 'low'
    };
    
    return priorityMap[eventType] || 'medium';
  }

  // Send notification based on preferences and priority
  async sendNotification(
    eventType: NotificationEventType,
    title: string,
    message: string, 
    data: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      // Check if this event type is enabled
      if (!this.isEventTypeEnabled(eventType)) {
        logger.log(`Admin notification skipped - event type disabled: ${eventType}`);
        return true;
      }

      const priority = this.getEventPriority(eventType);
      const notification: NotificationEvent = {
        id: crypto.randomUUID(),
        type: eventType,
        priority,
        title,
        message,
        data,
        createdAt: new Date(),
        adminEmail: this.preferences.adminEmail
      };

      // Critical priority always sends immediately, ignoring quiet hours
      if (priority === 'critical') {
        return await this.sendEmailNotification(notification);
      }

      // High priority sends immediately unless in quiet hours
      if (priority === 'high' && !this.isQuietHours()) {
        return await this.sendEmailNotification(notification);
      }

      // For medium/low priority or quiet hours, queue for later
      this.pendingNotifications.push(notification);
      logger.log(`Admin notification queued: ${eventType} - ${title}`);
      return true;

    } catch (error) {
      logger.error('Error sending admin notification:', error);
      return false;
    }
  }

  // Send the actual email notification
  private async sendEmailNotification(notification: NotificationEvent): Promise<boolean> {
    try {
      const { subject, html, text } = this.generateEmailTemplate(notification);
      
      const result = await sendEmail({
        to: this.preferences.adminEmail,
        subject,
        html,
        text
      });

      if (result.success) {
        logger.log(`Admin notification sent successfully: ${notification.type}`);
        return true;
      } else {
        logger.error('Failed to send admin notification:', result.error);
        return false;
      }
    } catch (error) {
      logger.error('Error sending admin email notification:', error);
      return false;
    }
  }

  // Generate email template based on notification type
  private generateEmailTemplate(notification: NotificationEvent): { subject: string; html: string; text: string } {
    const { type, title, message, data, createdAt, priority } = notification;
    
    // Get priority styling
    const priorityConfig = {
      critical: { color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
      high: { color: '#ea580c', bg: '#fff7ed', icon: '⚠️' },
      medium: { color: '#d97706', bg: '#fef3c7', icon: '📢' },
      low: { color: '#65a30d', bg: '#f7fee7', icon: 'ℹ️' }
    };

    const config = priorityConfig[priority];
    const timestamp = createdAt.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const subject = `${config.icon} [${priority.toUpperCase()}] ${title} - Scrolls of Wisdom Admin`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Notification - Scrolls of Wisdom</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #fef3c7; font-family: Georgia, 'Times New Roman', serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef3c7;">
          <tr>
            <td align="center" style="padding: 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(146, 64, 14, 0.1);">
                
                <!-- Header -->
                <tr>
                  <td bgcolor="#92400e" style="background-color: #92400e; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">⚖️ Admin Notification Center</h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Scrolls of Wisdom Platform Management</p>
                  </td>
                </tr>

                <!-- Priority Banner -->
                <tr>
                  <td bgcolor="${config.color}" style="background-color: ${config.color}; color: white; padding: 12px; text-align: center;">
                    <strong style="font-size: 16px;">${config.icon} ${priority.toUpperCase()} PRIORITY ALERT</strong>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="background-color: #fffbeb; padding: 30px;">
                    
                    <!-- Alert Info -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 20px; background-color: ${config.bg}; border-radius: 8px; border-left: 4px solid ${config.color};">
                      <tr>
                        <td style="padding: 15px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="color: #374151; font-weight: bold;">Event Type:</td>
                              <td align="right" style="color: ${config.color}; font-weight: bold;">${type.replace(/_/g, ' ').toUpperCase()}</td>
                            </tr>
                            <tr>
                              <td style="color: #374151; font-weight: bold; padding-top: 8px;">Timestamp:</td>
                              <td align="right" style="color: #6b7280; padding-top: 8px;">${timestamp} IST</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Main Message -->
                    <h2 style="color: #92400e; font-size: 20px; margin: 20px 0 15px 0; font-family: Georgia, 'Times New Roman', serif;">${title}</h2>
                    <div style="color: #451a03; line-height: 1.6; margin: 15px 0;">
                      ${message.replace(/\n/g, '<br>')}
                    </div>

                    <!-- Additional Data -->
                    ${Object.keys(data).length > 0 ? `
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0; background-color: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                      <tr>
                        <td style="padding: 15px;">
                          <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">Additional Details:</h3>
                          ${Object.entries(data).map(([key, value]) => `
                            <p style="margin: 5px 0; color: #374151;">
                              <strong>${key.replace(/_/g, ' ')}:</strong> 
                              <span style="color: #6b7280;">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
                            </p>
                          `).join('')}
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div style="text-align: center; margin: 25px 0;">
                      ${this.getActionButtons(type)}
                    </div>

                    <!-- Biblical Verse -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px; border-radius: 4px;">
                          <p style="margin: 0; color: #78350f; font-style: italic; text-align: center;">
                            ${this.getBiblicalVerse(type)}
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td bgcolor="#fef3c7" style="text-align: center; padding: 20px; background-color: #fef3c7; color: #78350f; font-size: 14px; border-top: 2px solid #f59e0b;">
                    <p style="margin: 5px 0;">🛡️ Platform Guardian • Protecting God's Digital Vineyard</p>
                    <p style="margin: 5px 0;">© 2024 Scrolls of Wisdom • Admin Alert System</p>
                    <p style="margin: 5px 0; font-size: 12px;">Generated at ${timestamp} IST</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const text = `
ADMIN NOTIFICATION - SCROLLS OF WISDOM
${config.icon} ${priority.toUpperCase()} PRIORITY ALERT

Event Type: ${type.replace(/_/g, ' ').toUpperCase()}
Timestamp: ${timestamp} IST

${title}

${message}

${Object.keys(data).length > 0 ? `
Additional Details:
${Object.entries(data).map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : value}`).join('\n')}
` : ''}

Access Admin Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard

Platform Guardian • Protecting God's Digital Vineyard
Generated at ${timestamp} IST
    `;

    return { subject, html, text };
  }

  // Get action buttons based on notification type
  private getActionButtons(type: NotificationEventType): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in';
    
    const actionMap: Record<NotificationEventType, string> = {
      'educator_signup_pending': `
        <a href="${baseUrl}/admin/educators" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">👥 Review Educators</a>
        <a href="${baseUrl}/admin/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #92400e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">📊 Admin Dashboard</a>
      `,
      'security_breach_attempt': `
        <a href="${baseUrl}/admin/activity" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">🔍 View Activity Logs</a>
        <a href="${baseUrl}/admin/settings/system" style="display: inline-block; padding: 12px 24px; background-color: #92400e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">🛡️ Security Settings</a>
      `,
      'system_critical_error': `
        <a href="${baseUrl}/admin/performance" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">⚡ System Performance</a>
        <a href="${baseUrl}/admin/activity" style="display: inline-block; padding: 12px 24px; background-color: #92400e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">📋 Activity Logs</a>
      `,
      'database_connection_lost': `
        <a href="${baseUrl}/admin/performance" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">🗄️ Database Status</a>
      `,
      'educator_status_changed': `
        <a href="${baseUrl}/admin/educators" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">👨‍🏫 Manage Educators</a>
      `,
      'performance_degradation': `
        <a href="${baseUrl}/admin/performance" style="display: inline-block; padding: 12px 24px; background-color: #ea580c; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">📈 Performance Monitor</a>
      `,
      'payment_failure': `
        <a href="${baseUrl}/admin/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">💳 Payment Dashboard</a>
      `,
      'content_flagged': `
        <a href="${baseUrl}/admin/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #ea580c; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">🚩 Review Content</a>
      `,
      'bulk_user_registration': `
        <a href="${baseUrl}/admin/students" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">👥 User Management</a>
      `,
      'api_rate_limit_exceeded': `
        <a href="${baseUrl}/admin/performance" style="display: inline-block; padding: 12px 24px; background-color: #ea580c; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">⚡ API Monitor</a>
      `,
      'weekly_platform_stats': `
        <a href="${baseUrl}/admin/analytics" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">📊 Full Analytics</a>
      `,
      'weekly_performance_report': `
        <a href="${baseUrl}/admin/performance" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">📈 Performance Report</a>
      `,
      'weekly_user_activity': `
        <a href="${baseUrl}/admin/activity" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 0 10px;">👥 User Activity</a>
      `
    };

    return actionMap[type] || `
      <a href="${baseUrl}/admin/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #92400e; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">📊 Admin Dashboard</a>
    `;
  }

  // Get biblical verse based on notification type
  private getBiblicalVerse(type: NotificationEventType): string {
    const verseMap: Record<NotificationEventType, string> = {
      'educator_signup_pending': '"Go ye therefore, and teach all nations" - Matthew 28:19',
      'security_breach_attempt': '"Be sober, be vigilant; because your adversary the devil walketh about" - 1 Peter 5:8',
      'system_critical_error': '"The Lord is my rock, and my fortress, and my deliverer" - Psalm 18:2',
      'database_connection_lost': '"He restoreth my soul: he leadeth me in the paths of righteousness" - Psalm 23:3',
      'educator_status_changed': '"And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers" - Ephesians 4:11',
      'performance_degradation': '"But they that wait upon the Lord shall renew their strength" - Isaiah 40:31',
      'payment_failure': '"But my God shall supply all your need according to his riches in glory" - Philippians 4:19',
      'content_flagged': '"Whatsoever things are true, whatsoever things are honest... think on these things" - Philippians 4:8',
      'bulk_user_registration': '"For where two or three are gathered together in my name, there am I" - Matthew 18:20',
      'api_rate_limit_exceeded': '"To every thing there is a season, and a time to every purpose" - Ecclesiastes 3:1',
      'weekly_platform_stats': '"Well done, thou good and faithful servant" - Matthew 25:21',
      'weekly_performance_report': '"Let us run with patience the race that is set before us" - Hebrews 12:1',
      'weekly_user_activity': '"Iron sharpeneth iron; so a man sharpeneth the countenance of his friend" - Proverbs 27:17'
    };

    return verseMap[type] || '"The Lord shall preserve thy going out and thy coming in" - Psalm 121:8';
  }

  // Send queued notifications (called by cron job)
  async sendQueuedNotifications(): Promise<void> {
    if (this.pendingNotifications.length === 0) return;

    logger.log(`Sending ${this.pendingNotifications.length} queued admin notifications`);
    
    const notifications = [...this.pendingNotifications];
    this.pendingNotifications = [];

    for (const notification of notifications) {
      await this.sendEmailNotification(notification);
    }
  }

  // Get pending notification count
  getPendingNotificationCount(): number {
    return this.pendingNotifications.length;
  }
}

// Export singleton instance
export const adminNotifications = AdminNotificationService.getInstance();

// Convenience functions for common notification types
export const notifyEducatorSignup = (educatorData: { name: string; email: string; id: string }) => {
  return adminNotifications.sendNotification(
    'educator_signup_pending',
    'New Educator Awaiting Approval',
    `A new educator has signed up and is awaiting your approval.\n\nEducator Details:\n- Name: ${educatorData.name}\n- Email: ${educatorData.email}\n\nPlease review their application and approve or reject as appropriate.`,
    educatorData
  );
};

export const notifySecurityBreach = (details: { ip: string; userAgent: string; attempts: number }) => {
  return adminNotifications.sendNotification(
    'security_breach_attempt',
    'Security Alert: Suspicious Login Activity Detected',
    `Multiple failed login attempts detected from a suspicious source.\n\nDetails:\n- IP Address: ${details.ip}\n- Failed Attempts: ${details.attempts}\n- User Agent: ${details.userAgent}\n\nImmediate attention recommended.`,
    details
  );
};

export const notifySystemError = (error: { message: string; stack?: string; component: string }) => {
  return adminNotifications.sendNotification(
    'system_critical_error',
    'Critical System Error Detected',
    `A critical error has occurred in the system that requires immediate attention.\n\nError Details:\n- Component: ${error.component}\n- Message: ${error.message}\n\nPlease investigate immediately to prevent service disruption.`,
    error
  );
};

export const notifyEducatorStatusChange = (educatorData: { name: string; email: string; oldStatus: string; newStatus: string; adminName: string }) => {
  return adminNotifications.sendNotification(
    'educator_status_changed',
    `Educator Status Changed: ${educatorData.name}`,
    `An educator's status has been updated.\n\nEducator: ${educatorData.name} (${educatorData.email})\nStatus Change: ${educatorData.oldStatus} → ${educatorData.newStatus}\nChanged by: ${educatorData.adminName}`,
    educatorData
  );
};

export const notifyPerformanceDegradation = (metrics: { responseTime: number; errorRate: number; activeUsers: number }) => {
  return adminNotifications.sendNotification(
    'performance_degradation',
    'Platform Performance Alert',
    `System performance has degraded and may require attention.\n\nCurrent Metrics:\n- Average Response Time: ${metrics.responseTime}ms\n- Error Rate: ${metrics.errorRate}%\n- Active Users: ${metrics.activeUsers}\n\nConsider investigating system resources and optimizations.`,
    metrics
  );
};