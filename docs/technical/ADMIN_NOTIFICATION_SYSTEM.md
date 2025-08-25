# Admin Notification System

## Overview

The Admin Notification System provides comprehensive email alerts for critical platform events, ensuring administrators stay informed about important activities requiring their attention.

## 🚨 **Critical Events Requiring Immediate Action**

### **Priority 1 - Critical (Immediate Email)**
- **New Educator Signups** - When educators register and need approval
- **Security Breach Attempts** - Multiple failed login attempts from suspicious sources
- **System Critical Errors** - Database failures, API failures, system crashes
- **Payment Failures** - Billing and payment processing issues
- **Database Connection Lost** - Database connectivity problems

### **Priority 2 - High (Respects Quiet Hours)**
- **Educator Status Changes** - Approvals, suspensions, reactivations
- **Performance Degradation** - System performance issues
- **Content Flagged** - Quiz content requiring moderation
- **Bulk User Registration** - Unusual user registration patterns
- **API Rate Limits Exceeded** - Unusual API usage patterns

### **Priority 3 - Medium/Low (Batched/Weekly)**
- **Weekly Platform Statistics** - Growth metrics and usage summaries
- **Weekly Performance Reports** - System health summaries
- **Weekly User Activity** - Engagement and activity patterns

## 📧 **Email Configuration**

### Environment Variables Required:
```bash
# Admin email for notifications
ADMIN_EMAIL=admin@biblequiz.textr.in

# SMTP configuration for sending emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Scrolls of Wisdom <noreply@biblequiz.textr.in>"
```

### Email Templates
All notification emails follow the biblical theme with:
- **Golden amber color scheme** matching the platform
- **Responsive table-based layouts** for email client compatibility
- **Biblical verses** contextually related to each notification type
- **Action buttons** linking to relevant admin dashboard sections
- **Priority badges** (Critical, High, Medium, Low) with appropriate styling

## 🔔 **Notification Management**

### Admin Panel Access:
Navigate to **Admin Dashboard → Settings → Admin Notifications**

### Configuration Options:
1. **Email Settings**
   - Admin email address
   - Timezone preferences

2. **Quiet Hours**
   - Set hours when non-critical notifications are delayed
   - Critical alerts always sent immediately

3. **Event Type Selection**
   - Enable/disable specific notification types
   - Granular control over what gets sent

4. **Test Notifications**
   - Send test emails for different priority levels
   - Verify email delivery and formatting

## 🛡️ **Security Features**

### Anti-Spam Protection:
- **Priority-based filtering** - Only enabled events trigger emails
- **Quiet hours respect** - Non-critical alerts delayed during specified hours
- **Rate limiting** - Prevents email flooding
- **Deduplication** - Similar events within timeframes are batched

### Authentication:
- All notification APIs require **admin-level authentication**
- **CSRF protection** on configuration changes
- **Audit logging** of all preference changes

## 📊 **Integration Points**

### Automatic Triggers:
1. **Educator Signup** → `src/app/api/auth/educator-signup/route.ts`
2. **Educator Approval/Rejection** → `src/app/api/admin/educators/[id]/(approve|reject)/route.ts`
3. **Security Monitoring** → Can be integrated with failed login tracking
4. **Performance Monitoring** → Can be integrated with system health checks

### Manual Triggers:
```typescript
import { notifyEducatorSignup, notifySystemError } from '@/lib/admin-notifications';

// Example: Notify about new educator
await notifyEducatorSignup({
  id: 'user-123',
  name: 'John Educator',
  email: 'john@example.com'
});

// Example: Notify about system error
await notifySystemError({
  message: 'Database connection timeout',
  component: 'quiz-service',
  stack: error.stack
});
```

## 🎨 **Biblical Theme Integration**

### Design Elements:
- **Scripture Verses** - Each notification type includes relevant biblical passages
- **Color Palette** - Consistent amber/gold theme throughout emails
- **Typography** - Georgia serif fonts for traditional, reverent appearance
- **Icons & Imagery** - Biblical and educational symbols (scrolls, shields, etc.)

### Example Notification Types & Verses:
- **Educator Signup**: *"Go ye therefore, and teach all nations"* - Matthew 28:19
- **Security Alert**: *"Be sober, be vigilant; because your adversary walketh about"* - 1 Peter 5:8
- **System Error**: *"The Lord is my rock, and my fortress, and my deliverer"* - Psalm 18:2

## 🔧 **Technical Architecture**

### Core Components:
1. **`/src/lib/admin-notifications.ts`** - Main notification service
2. **`/src/app/api/admin/notifications/preferences/route.ts`** - API for managing preferences
3. **`/src/app/admin/(protected)/notifications/page.tsx`** - Admin UI panel
4. **`/src/lib/email-service.ts`** - Email delivery service (existing, enhanced)

### Notification Flow:
1. **Event Occurs** → Code calls notification function
2. **Priority Check** → System determines urgency level
3. **Preference Check** → Verifies if event type is enabled
4. **Quiet Hours Check** → Respects admin quiet hours (except critical)
5. **Email Generation** → Creates themed HTML and text versions
6. **Delivery** → Sends via SMTP with fallback logging

## 🚀 **Getting Started**

### 1. Configure Environment:
Add required environment variables to `.env.local`

### 2. Set Admin Email:
```bash
ADMIN_EMAIL=your-admin-email@domain.com
```

### 3. Configure SMTP:
Set up email service (Gmail, SendGrid, etc.)

### 4. Access Admin Panel:
1. Login as super admin
2. Go to Admin Dashboard
3. Click "Settings" tab
4. Select "Admin Notifications"

### 5. Test System:
Use the built-in test notification feature to verify setup

## 📈 **Monitoring & Maintenance**

### Health Checks:
- **Email Delivery Status** - Monitor SMTP connection and delivery rates
- **Notification Queue** - Track pending notifications during quiet hours
- **Error Handling** - Failed notifications are logged, system continues operating

### Logs to Monitor:
```bash
# Successful notifications
✅ Admin notified of new educator signup: user@example.com

# Failed notifications (non-critical)
❌ Failed to send admin notification: SMTP connection failed

# Critical system events
🚨 CRITICAL: Database connection lost - immediate attention required
```

## 🔒 **Security Best Practices**

### For Administrators:
1. **Use strong passwords** for admin accounts
2. **Enable 2FA** when available
3. **Monitor admin activity logs** regularly
4. **Update contact information** immediately when needed
5. **Test notifications quarterly** to ensure delivery

### For Developers:
1. **Never log sensitive data** in notification content
2. **Validate all inputs** before sending notifications
3. **Use parameterized queries** for database operations
4. **Rate limit notification APIs** to prevent abuse
5. **Encrypt sensitive notification content** if stored

## 📝 **Customization Options**

### Adding New Notification Types:
1. Add new event type to `NotificationEventType` enum
2. Set priority level in `getEventPriority()` method
3. Add email template and biblical verse
4. Create convenience function for easy triggering
5. Add to admin UI configuration panel

### Modifying Email Templates:
All templates use the biblical theme wrapper and support:
- **Custom colors** and styling
- **Dynamic content** based on event data
- **Action buttons** linking to relevant admin sections
- **Responsive design** for mobile email clients

## 🙏 **Biblical Foundation**

*"And he gave some, apostles; and some, prophets; and some, evangelists; and some, pastors and teachers"* - Ephesians 4:11

This notification system serves as a digital tool for faithful stewardship of the educational platform, ensuring administrators can properly shepherd and protect the online community dedicated to biblical learning and growth.

---

**Created with ❤️ for the Kingdom** | Scrolls of Wisdom Admin Team