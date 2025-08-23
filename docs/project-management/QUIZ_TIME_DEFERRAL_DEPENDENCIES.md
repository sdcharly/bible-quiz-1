# Quiz Time Deferral Project - Dependency Analysis
**Phase 0.2: Complete Dependency Mapping**
**Date**: 2024
**Status**: In Progress

## 📁 Files Referencing `startTime`

### API Routes (Backend)
- [ ] `/src/app/api/educator/quiz/create-async/route.ts` - Lines 66, 73, 82-89 (validation)
- [ ] `/src/app/api/educator/quiz/[id]/bulk-enroll/route.ts` - Line 176 (email notification)
- [ ] `/src/app/api/educator/quiz/[id]/assign-group/route.ts` - Email notifications
- [ ] `/src/app/api/educator/quiz/[id]/reassign/route.ts` - Reassignment logic
- [ ] `/src/app/api/student/quiz/[id]/start/route.ts` - Lines 278-286 (validation)
- [ ] `/src/app/api/student/quizzes/route.ts` - Fetching published quizzes

### Frontend Components
- [ ] `/src/app/educator/quiz/create/page.tsx` - Lines 640-662 (time input fields)
- [ ] `/src/app/educator/quiz/[id]/manage/page.tsx` - Display quiz time
- [ ] `/src/app/educator/quiz/[id]/review/page.tsx` - Review before publish
- [ ] `/src/app/student/quizzes/page.tsx` - Lines 238-241 (display time)
- [ ] `/src/app/student/quiz/[id]/page.tsx` - Start time validation
- [ ] `/src/app/quiz/share/[shareCode]/page.tsx` - Share link display

### Database Schema
- [ ] `/src/lib/schema.ts` - Line 140 (`startTime: timestamp("start_time").notNull()`)

### Email Templates
- [ ] `/src/lib/email-service.ts` - Lines 572, 726-728 (enrollment notification)
- [ ] `/src/lib/email-service.ts` - Lines 795, 918 (reassignment notification)

### Utility Functions
- [ ] `/src/lib/timezone.ts` - Time formatting utilities
- [ ] `/src/hooks/use-timezone.tsx` - Time display hooks

## 🔒 Database Constraints

### Current Constraints on `quizzes` table:
```sql
- start_time: NOT NULL constraint
- timezone: NOT NULL with DEFAULT 'Asia/Kolkata'
- duration: NOT NULL (integer in minutes)
```

### Related Tables Affected:
1. **enrollments** - No direct time reference
2. **quiz_attempts** - Has its own `start_time`
3. **quiz_share_links** - No time reference
4. **group_enrollments** - No time reference

## 📧 Email Templates Using Time

### 1. Quiz Enrollment Notification
**File**: `/src/lib/email-service.ts:565-787`
**Uses**: 
- `startTime` parameter (Line 572)
- Displays as "Start Time: [date]" (Line 726-728)

### 2. Quiz Reassignment Notification  
**File**: `/src/lib/email-service.ts:789-973`
**Uses**:
- Optional `newDeadline` parameter (Line 795)
- Displays as "New Completion Time" (Line 918)

### 3. Group Assignment Email
**Uses**: Same enrollment template with time

### 4. Bulk Enrollment Email
**Uses**: Same enrollment template with time

## 🎨 UI Components Displaying Time

### Educator Views:
1. **Quiz Creation** - 3-step form with time in Step 1
2. **Quiz Management** - Shows scheduled time
3. **Quiz Dashboard** - List view with start times
4. **Analytics** - Time-based reporting

### Student Views:
1. **Available Quizzes** - Shows "Starts: [time]"
2. **Quiz Card** - Relative time display
3. **Dashboard** - Upcoming quizzes by time
4. **Share Link Page** - No time display (✅ Safe)

### Admin Views:
1. **Admin Dashboard** - Quiz overview with times
2. **Educator Management** - Quiz schedules
3. **Performance Metrics** - Time-based analytics

## 🚦 API Endpoints Validating Time

### Critical Validations:
1. **POST `/api/educator/quiz/create-async`**
   - Validates startTime is valid Date
   - Ensures startTime is 5+ minutes in future
   
2. **POST `/api/student/quiz/[id]/start`**
   - Checks if current time >= quiz.startTime
   - Returns error with formatted time if not ready

3. **POST `/api/educator/quiz/[id]/bulk-enroll`**
   - Requires published status (which requires time)

4. **POST `/api/educator/quiz/[id]/reassign`**
   - Optional newDeadline validation

## 🔄 Process Flows Affected

### 1. Quiz Creation Flow
```
Current: Create (with time) → Generate → Review → Publish → Enroll
New:     Create (no time) → Generate → Review → Publish (set time) → Enroll
```

### 2. Enrollment Flow
```
Current: Can only enroll after publish (time already set)
New:     Need to handle enrollment without time
```

### 3. Student Access Flow
```
Current: Check startTime <= now
New:     Check if time set, then check if started
```

### 4. Email Notification Flow
```
Current: Send time immediately in enrollment email
New:     Send "TBA" then follow-up when time set
```

## ⚠️ High-Risk Areas

1. **Email System** - All enrollment emails expect time
2. **Student Quiz Start** - Validation expects time to exist
3. **Database Migration** - NOT NULL constraint on start_time
4. **Quiz Status Logic** - Published status assumes time is set
5. **Timezone Handling** - Complex timezone conversions

## ✅ Safe Areas (No Changes Needed)

1. **Share Links** - Don't display time
2. **Quiz Attempts** - Have own start_time
3. **Question Management** - Time independent
4. **Document Processing** - Time independent
5. **User Authentication** - Time independent

## 🔧 Required New Components

### Backend:
- [ ] Feature flag system
- [ ] Time configuration API endpoint
- [ ] Notification queue for delayed time announcements
- [ ] Migration scripts for schema changes

### Frontend:
- [ ] TimeConfigurationModal component
- [ ] "Time Not Set" badge component
- [ ] Updated quiz creation flow (2 screens)
- [ ] Time setting UI in publish modal

### Database:
- [ ] New columns for deferred time support
- [ ] Notification queue table
- [ ] Feature flags table

## 📊 Impact Assessment

### High Impact (Requires Major Changes):
- Quiz creation page (complete restructure)
- Email notification system
- Database schema

### Medium Impact (Requires Modifications):
- Student quiz list
- Enrollment APIs
- Quiz management page

### Low Impact (Minor Updates):
- Admin dashboard
- Analytics
- Share links (already safe)

## 🚀 Next Steps

1. Run database audit queries
2. Take screenshots of current flow
3. Create feature flag implementation
4. Design new database schema
5. Create rollback procedures

---

**Document Status**: This is a living document that will be updated as we discover more dependencies during Phase 0.