# Session Management System

## Overview

This document describes the comprehensive session management system implemented for SimpleBibleQuiz, following international security standards (OWASP, NIST SP 800-63B, ISO/IEC 27001:2013).

## Key Features

### 1. Session Timeouts

#### Student Sessions
- **Idle Timeout**: 30 minutes
- **Absolute Timeout**: 4 hours  
- **Warning Before Expiry**: 5 minutes
- **Quiz Active Timeout**: 3 hours (extended during quiz)

#### Admin/Educator Sessions
- **Idle Timeout**: 15 minutes
- **Absolute Timeout**: 2 hours
- **Warning Before Expiry**: 3 minutes

### 2. Activity Tracking

The system tracks user activity through:
- Mouse movements
- Clicks
- Keyboard input
- Scroll events
- Touch events (mobile)
- API calls
- Quiz interactions

Activity is debounced (1 second) to prevent excessive server calls.

### 3. Session Extension

- **Automatic Extension**: Sessions can be auto-extended up to 3 times
- **Manual Extension**: Users can click "Extend Session" when warned
- **Extension Duration**: 30 minutes per extension
- **Quiz Protection**: Active quiz sessions are automatically extended

### 4. Session States

```typescript
enum SessionState {
  ACTIVE = 'active',           // User is actively using the system
  IDLE = 'idle',              // No recent activity
  WARNING = 'warning',         // Approaching timeout
  EXPIRED = 'expired',         // Session has expired
  QUIZ_ACTIVE = 'quiz_active', // User is taking a quiz
  EXTENDED = 'extended',       // Session was recently extended
}
```

### 5. Inactivity Logout

- Users are automatically logged out after idle timeout
- Warning shown 5 minutes before logout
- Quiz submissions are auto-saved before logout
- Session data is preserved for 24 hours after expiry

## Implementation Details

### Client-Side Components

#### 1. useSessionManager Hook
```typescript
// Usage in React components
const {
  sessionState,
  isWarning,
  isExpired,
  extendSession,
  resetActivity,
} = useSessionManager({
  isQuizActive: true,
  enableAutoExtend: true,
  onSessionExpired: () => {
    // Custom expiry handler
  }
});
```

#### 2. Activity Detection
- Listens to user events
- Sends heartbeat to server every 5 minutes
- Checks session status every minute

### Server-Side Components

#### 1. Session Middleware
- Validates session on every API call
- Updates last activity timestamp
- Handles session extension requests
- Manages quiz session state

#### 2. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/heartbeat` | POST | Updates session activity |
| `/api/session/extend` | POST | Extends session duration |
| `/api/session/status` | GET | Gets current session state |
| `/api/session/quiz-start` | POST | Starts quiz session |
| `/api/session/quiz-end` | POST | Ends quiz session |

#### 3. Cleanup Job
- Runs every 10 minutes
- Removes expired sessions older than 24 hours
- Clears session cache
- Maintains system performance

## Security Considerations

### 1. Token Security
- HTTP-only cookies
- Secure flag in production
- SameSite=lax for CSRF protection
- Token rotation every 15 minutes

### 2. Session Fixation Prevention
- New session ID on login
- Session invalidation on logout
- IP address validation
- User agent tracking

### 3. Concurrent Session Control
- Device ID tracking
- Maximum session limits
- Alert on suspicious activity

## Performance Optimizations

### 1. Caching
- Session metadata cached for 1 minute
- Reduces database queries
- Automatic cache invalidation

### 2. Batch Processing
- Cleanup processes 100 sessions per batch
- Prevents database overload
- Maintains responsiveness

### 3. Debouncing
- Activity updates debounced by 1 second
- Reduces server load
- Improves client performance

## Configuration

### Environment Variables
```env
# Session timeouts (optional - uses defaults if not set)
SESSION_IDLE_TIMEOUT=1800000      # 30 minutes in ms
SESSION_ABSOLUTE_TIMEOUT=14400000 # 4 hours in ms
SESSION_WARNING_TIME=300000        # 5 minutes in ms

# Cleanup job secret (for cron job authentication)
CRON_SECRET=your-secret-key
```

### Custom Configuration
Administrators can customize session settings through the admin panel:
1. Navigate to Settings → Security
2. Adjust session timeouts
3. Configure extension rules
4. Save changes

## Monitoring

### Session Statistics
```typescript
// Get current session statistics
const stats = await getSessionStats();
// Returns: { total, active, idle, warning, quiz }
```

### Logging
- All session events are logged
- Activity tracking for audit trail
- Error logging for debugging

## Testing

### Manual Testing
1. Login as student
2. Remain idle for 25 minutes
3. Verify warning appears at 25 minutes
4. Click "Extend Session" to continue
5. Verify session extends by 30 minutes

### Automated Testing
```bash
# Run session management tests
npm test -- session-management
```

## Troubleshooting

### Common Issues

#### 1. Premature Logout
- Check browser console for errors
- Verify network connectivity
- Check server logs for session errors

#### 2. Session Not Extending
- Verify maximum extensions not reached
- Check absolute timeout not exceeded
- Ensure heartbeat requests succeeding

#### 3. Quiz Session Issues
- Verify quiz session properly started
- Check quiz timeout configuration
- Ensure quiz submission before timeout

### Debug Mode
Enable debug logging for session management:
```typescript
// In development
process.env.NEXT_PUBLIC_DEBUG_SESSIONS = 'true'
```

## Best Practices

1. **For Students**:
   - Save work frequently
   - Respond to session warnings
   - Complete quizzes promptly

2. **For Educators**:
   - Log out when finished
   - Use "Remember Me" carefully
   - Monitor session activity

3. **For Administrators**:
   - Review session settings regularly
   - Monitor cleanup job status
   - Check session statistics

## Compliance

This implementation complies with:
- **OWASP**: Session Management Cheat Sheet
- **NIST SP 800-63B**: Digital Identity Guidelines
- **ISO/IEC 27001:2013**: Information Security Management
- **GDPR**: Session data retention policies

## Migration Guide

For existing sessions after deployment:
1. All active sessions will adopt new timeout rules
2. Users may need to re-authenticate once
3. Session history preserved for continuity

## Future Enhancements

- [ ] Multi-device session management
- [ ] Session analytics dashboard
- [ ] Customizable per-role timeouts
- [ ] Session transfer between devices
- [ ] Biometric session extension