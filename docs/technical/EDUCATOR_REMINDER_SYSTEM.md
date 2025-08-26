# Educator Reminder System Documentation

## Overview

The Educator Reminder System is an intelligent, non-spammy way to gently remind inactive educators to return to their teaching ministry on Scrolls of Wisdom. The system uses sophisticated metrics and spam prevention to ensure educators receive meaningful, contextual reminders without being overwhelmed.

## Key Features

### 🎯 Intelligent Targeting
- **Multi-signal Activity Tracking**: Tracks logins, quiz creation, student management, document uploads, and dashboard visits
- **Contextual Messaging**: Different messages based on educator's history (no quizzes vs. has quizzes but no students)
- **Graduated Reminders**: Escalating reminder levels with increased time gaps
- **Engagement Scoring**: 0-100 score based on multiple activity factors

### 🛡️ Spam Prevention
- **Maximum 1 email per 24 hours** per educator
- **Maximum 2 emails per week** per educator  
- **Maximum 3 total reminders** for completely disengaged educators
- **Intelligent cooldown periods** based on reminder history
- **Risk assessment** before every email

### 📧 Biblical-Themed Messaging
- **Positive, encouraging tone** - never pushy or guilt-inducing
- **Scripture-based encouragement** with relevant biblical quotes
- **Ministry-focused messaging** emphasizing eternal impact
- **Personalized content** based on educator's activity history

## Architecture

### Database Schema

#### `educator_activity_metrics` table
Tracks comprehensive educator engagement metrics:
- Activity timestamps (login, quiz creation, etc.)
- Counters (total quizzes, students, documents, logins)
- Engagement score (0-100)
- Risk level (low/medium/high)

#### `educator_reminder_emails` table
Tracks all reminder emails sent:
- Email type and reminder level
- Trigger reason and activity snapshot
- Delivery status and engagement tracking
- Response metrics (opens, clicks, subsequent activity)

### Core Services

#### `EducatorActivityService`
- **Activity Tracking**: Updates metrics when educators perform actions
- **Eligibility Assessment**: Determines who should receive reminders
- **Spam Prevention**: Enforces rate limits and cooldown periods
- **Engagement Scoring**: Calculates sophisticated engagement metrics

#### `EducatorActivityTracker`
- **Convenience Functions**: Easy-to-use functions for tracking activities
- **Batch Operations**: Support for bulk activity tracking
- **Error Handling**: Graceful degradation when tracking fails

## Usage

### 1. Activity Tracking Integration

Add tracking calls throughout your application:

```typescript
import { trackLogin, trackQuizCreated, trackDashboardVisit } from '@/lib/educator-activity-tracker';

// In login handler
await trackLogin(educatorId, { ip, userAgent });

// When quiz is created
await trackQuizCreated(educatorId, { quizId, isPublished: true });

// On dashboard page load
await trackDashboardVisit(educatorId, { page: 'main-dashboard' });
```

### 2. Cron Job Setup

The reminder system runs via `/api/cron/educator-reminders`:

#### Option A: Vercel Cron (Recommended)
Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/educator-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

#### Option B: External Cron Service
Use services like cron-job.org or UptimeRobot:
- **URL**: `https://yourdomain.com/api/cron/educator-reminders`
- **Method**: GET or POST
- **Schedule**: Daily at 9:00 AM UTC
- **Headers**: `x-cron-secret: YOUR_CRON_SECRET`

#### Option C: Server Cron
```bash
# Add to crontab (crontab -e)
0 9 * * * curl -H "x-cron-secret: YOUR_SECRET" https://yourdomain.com/api/cron/educator-reminders
```

### 3. Environment Variables

Add these to your `.env`:

```env
# Required: Secret for cron security
CRON_SECRET=your-secure-random-secret

# Optional: Enable dry-run mode for testing
EDUCATOR_REMINDERS_DRY_RUN=true

# Email configuration (already configured)
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM="Scrolls of Wisdom <noreply@yourapp.com>"
```

### 4. Database Migration

Run database migrations to create the new tables:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

## Testing

### Manual Testing API

The system includes comprehensive testing via `/api/admin/test-educator-reminders`:

```bash
# Test overall system health
curl "https://yourapp.com/api/admin/test-educator-reminders?action=test"

# Check specific educator eligibility
curl "https://yourapp.com/api/admin/test-educator-reminders?action=check-eligibility&educatorId=edu_123"

# Preview email for educator
curl "https://yourapp.com/api/admin/test-educator-reminders?action=preview-email&educatorId=edu_123"

# Simulate inactive educator (for testing)
curl "https://yourapp.com/api/admin/test-educator-reminders?action=simulate&educatorId=edu_123"

# List currently eligible educators
curl "https://yourapp.com/api/admin/test-educator-reminders?action=list-eligible"

# Reset educator metrics (for clean testing)
curl "https://yourapp.com/api/admin/test-educator-reminders?action=reset-metrics&educatorId=edu_123"
```

### Testing Workflow

1. **Enable Dry Run Mode**: Set `EDUCATOR_REMINDERS_DRY_RUN=true`
2. **Create Test Educator**: Use simulate action to create inactive educator
3. **Test Eligibility**: Verify educator shows as eligible
4. **Preview Email**: Check email content is appropriate
5. **Run Cron Job**: Test the full reminder flow
6. **Check Logs**: Verify no errors and appropriate filtering
7. **Test Spam Prevention**: Try running multiple times, verify rate limiting
8. **Live Test**: Send test email to yourself with dry run disabled

## Monitoring

### Key Metrics to Monitor

1. **Eligibility Rate**: What percentage of educators are eligible for reminders?
2. **Email Success Rate**: Are emails being delivered successfully?
3. **Response Rate**: Do educators engage after receiving reminders?
4. **Spam Risk Events**: Are we hitting rate limits?
5. **System Health**: Are all services working correctly?

### Logging

The system logs detailed information about:
- Eligibility checks and reasons
- Email sending success/failure
- Spam prevention triggers
- Activity tracking events
- System errors

### Dashboard Integration

Consider adding to admin dashboard:
- Recent reminder activity
- Educator engagement trends
- System health status
- Email delivery metrics

## Intelligent Reminder Logic

### Eligibility Rules

An educator is eligible for a reminder if:

1. **Inactivity Period**: 7+ days since last significant activity
2. **Spam Safety**: No emails in last 24h, max 2 per week, max 3 total for disengaged
3. **Engagement Level**: Not completely disengaged (engagement score > 10) or limited reminders
4. **Trigger Conditions**: Matches specific trigger patterns

### Trigger Scenarios

1. **No Quizzes Created** (7+ days inactive)
   - Message: Encourages creating first quiz
   - Focus: Getting started with the platform

2. **Has Quizzes, No Students** (10+ days inactive)
   - Message: Encourages inviting students
   - Focus: Building their student community

3. **Previously Engaged, Now Inactive** (14+ days inactive, engagement > 50)
   - Message: "We miss you" style reminder
   - Focus: Returning to active teaching

4. **General Inactivity** (14+ days inactive)
   - Message: General encouragement to return
   - Focus: Ministry importance and impact

### Spam Prevention Algorithm

```
For each educator:
  1. Check last 24h: If any email sent, SKIP
  2. Check last 7 days: If 2+ emails sent, SKIP  
  3. Check total history: If 3+ emails to disengaged user, SKIP
  4. Check response history: If never responded to 2+ emails, INCREASE cooldown
  5. Apply dynamic cooldown based on engagement level
```

## Customization

### Modifying Email Templates

Edit `src/lib/email-service.ts`, `educatorReminderEmail` function:
- Adjust messaging tone
- Add/remove trigger scenarios  
- Modify biblical quotes
- Update call-to-action buttons

### Adjusting Eligibility Rules

Edit `src/lib/educator-activity-service.ts`, `applyEligibilityRules` method:
- Change inactivity thresholds
- Add new trigger conditions
- Modify spam prevention rules
- Adjust engagement scoring

### Adding Activity Types

1. Add new activity type to the service
2. Add tracking function to activity tracker
3. Integrate tracking calls in relevant app locations
4. Update eligibility logic if needed

## Security Considerations

1. **Cron Secret**: Always use a strong, random secret for cron endpoints
2. **Admin Only Testing**: Test endpoints are admin-only
3. **Rate Limiting**: Built-in spam prevention protects against abuse
4. **Email Privacy**: No sensitive information in email content
5. **Unsubscribe Links**: Include preference management links
6. **Logging**: Avoid logging sensitive personal information

## Performance Considerations

1. **Batch Processing**: System processes educators in batches with delays
2. **Database Indexing**: Consider adding indexes on activity timestamp columns
3. **Email Rate Limiting**: Built-in delays prevent overwhelming email service
4. **Efficient Queries**: Eligibility checks are optimized for performance
5. **Caching**: Consider caching educator metrics for high-traffic scenarios

## Troubleshooting

### Common Issues

1. **No Educators Eligible**
   - Check activity tracking integration
   - Verify educators exist and are approved
   - Check eligibility rules haven't become too restrictive

2. **Emails Not Sending**
   - Verify SMTP configuration
   - Check email service rate limits
   - Review delivery logs

3. **Too Many Emails**
   - Check spam prevention settings
   - Review eligibility thresholds
   - Verify cron job isn't running too frequently

4. **System Errors**
   - Check database connectivity
   - Review error logs
   - Verify all required environment variables

### Health Check

Use the test endpoint to verify system health:
```bash
curl "https://yourapp.com/api/admin/test-educator-reminders?action=test"
```

This provides a comprehensive health check and recommendations.

## Future Enhancements

### Potential Improvements
1. **Machine Learning**: Predict optimal reminder timing based on educator behavior
2. **A/B Testing**: Test different message variations
3. **Preference Center**: Allow educators to customize reminder preferences
4. **Advanced Analytics**: Track long-term engagement trends
5. **Multi-channel**: SMS or in-app notifications as alternatives
6. **Seasonal Adjustments**: Account for holidays or ministry seasons
7. **Cohort Analysis**: Compare reminder effectiveness across educator segments

### Integration Opportunities
1. **CRM Integration**: Sync with customer relationship management systems
2. **Analytics Platforms**: Send data to Google Analytics or similar
3. **Notification Systems**: Integrate with Slack or Discord for admin alerts
4. **Feedback Collection**: Gather educator feedback on reminder effectiveness

## Conclusion

The Educator Reminder System provides a sophisticated, respectful way to re-engage inactive educators while maintaining the biblical values and positive tone of Scrolls of Wisdom. The comprehensive spam prevention ensures educators never feel overwhelmed, while the intelligent targeting ensures only relevant, helpful reminders are sent.

The system is designed to be maintainable, testable, and scalable, with comprehensive logging and monitoring to ensure ongoing effectiveness.