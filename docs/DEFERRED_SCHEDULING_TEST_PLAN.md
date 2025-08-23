# Deferred Quiz Scheduling - Test Plan
**Phase 7: Testing & Validation**

## 🎯 Overview
This document outlines the testing procedures for the new deferred quiz scheduling feature.

## ✅ Test Scenarios

### 1. Legacy Mode (Backward Compatibility)
- [ ] Create quiz with immediate time setting (existing flow)
- [ ] Verify quiz publishes with time already set
- [ ] Confirm students can enroll and start quiz as before
- [ ] Check that legacy quizzes cannot be rescheduled

### 2. Deferred Mode - Basic Flow
- [ ] Create quiz without setting time (feature flag enabled)
- [ ] Verify quiz saves as draft with `schedulingStatus: 'deferred'`
- [ ] Attempt to publish - should prompt for scheduling
- [ ] Set time in scheduling modal
- [ ] Verify quiz publishes after scheduling
- [ ] Confirm database has correct time configuration

### 3. Student Experience - Unscheduled Quiz
- [ ] Student views published quiz without scheduled time
- [ ] Verify "Time to be announced" message appears
- [ ] Student can enroll despite no time set
- [ ] Student sees "Awaiting Schedule" status
- [ ] Cannot start quiz until time is set

### 4. Student Experience - Scheduled Quiz
- [ ] Student sees scheduled time in quiz list
- [ ] Countdown appears for upcoming quizzes
- [ ] "Start Quiz" button enables at scheduled time
- [ ] Quiz ends at correct time (start + duration)

### 5. Rescheduling Flow
- [ ] Educator publishes quiz with deferred scheduling
- [ ] Set initial time
- [ ] Use "Reschedule" button to change time
- [ ] Verify enrolled students see updated time
- [ ] Check notification system (if implemented)

### 6. Feature Flag Testing
- [ ] Disable feature flag for educator
- [ ] Verify scheduling mode selector doesn't appear
- [ ] Confirm legacy mode is enforced
- [ ] Enable feature flag
- [ ] Verify deferred options appear

### 7. Edge Cases
- [ ] Try to publish without time (deferred mode) - should block
- [ ] Set time in the past - should show validation error
- [ ] Change timezone after setting time
- [ ] Multiple students starting quiz simultaneously
- [ ] Quiz with 0 questions but scheduled time

### 8. Migration Testing
- [ ] Run migration script on database with existing quizzes
- [ ] Verify all quizzes get `schedulingStatus: 'legacy'`
- [ ] Confirm `timeConfiguration` populated correctly
- [ ] Check that existing enrollments still work

## 🔍 Validation Checks

### Database Validation
```sql
-- Check scheduling status distribution
SELECT 
    scheduling_status,
    COUNT(*) as count,
    COUNT(CASE WHEN start_time IS NOT NULL THEN 1 END) as with_time
FROM quizzes
GROUP BY scheduling_status;

-- Verify time configuration
SELECT 
    id,
    title,
    scheduling_status,
    time_configuration->>'isLegacy' as is_legacy,
    time_configuration->>'startTime' as config_time,
    start_time
FROM quizzes
WHERE scheduling_status IS NOT NULL
LIMIT 10;
```

### API Validation
- [ ] `POST /api/educator/quiz/create-deferred` - Creates without time
- [ ] `POST /api/educator/quiz/[id]/schedule` - Sets time successfully
- [ ] `GET /api/educator/quiz/[id]/schedule` - Returns scheduling info
- [ ] `GET /api/student/quizzes/enhanced` - Shows availability status

### UI Component Validation
- [ ] `SchedulingModeSelector` - Shows only when feature enabled
- [ ] `SchedulingModal` - Validates time constraints
- [ ] `PublishButton` - Adapts based on scheduling state
- [ ] `QuizCard` - Shows correct status for students
- [ ] `QuizStatusBadge` - Displays scheduling info

## 🐛 Known Issues & Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| Build warnings for unused vars | ✅ Fixed | Updated type definitions |
| Missing email service | ⚠️ TODO | Commented out, needs implementation |
| Legacy quiz migration | ✅ Ready | Script created |

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Run migration script on staging
- [ ] Test with feature flag OFF (legacy mode)
- [ ] Test with feature flag at 10% rollout
- [ ] Verify no performance degradation

### Deployment Steps
1. [ ] Deploy code with feature flag OFF
2. [ ] Run database migration
3. [ ] Verify legacy quizzes work
4. [ ] Enable feature flag for test educators
5. [ ] Monitor for 24 hours
6. [ ] Gradual rollout to all educators

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check quiz creation metrics
- [ ] Gather educator feedback
- [ ] Track student enrollment rates

## 🎉 Success Criteria

The feature is considered successful when:
1. ✅ All existing quizzes continue to work
2. ✅ Educators can create quizzes without setting time
3. ✅ Students can enroll in unscheduled quizzes
4. ✅ Time can be set during publish phase
5. ✅ Published quizzes can be rescheduled
6. ✅ No increase in error rates
7. ✅ Build completes without errors

## 📝 Test Results

| Date | Tester | Environment | Result | Notes |
|------|--------|-------------|--------|-------|
| TBD | - | Local | - | - |
| TBD | - | Staging | - | - |
| TBD | - | Production | - | - |

---

**Status**: Ready for Testing
**Last Updated**: 2024
**Phase**: 7 of 8