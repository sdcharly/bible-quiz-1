# Quiz Timing System Refactoring Plan

## Problem Statement
Multiple points of failure in quiz timing calculations:
1. Backend calculates availability in `quiz-scheduling.ts`
2. Frontend recalculates in `QuizzesContent.tsx`
3. Field name mismatches between API and frontend
4. IST timezone showing "In 5 hours" when quiz is actually active

## Root Causes
1. **Math.ceil bug**: Rounds negative numbers incorrectly
2. **Duplicate logic**: Both frontend and backend calculate times
3. **Field mismatch**: API sends `message`, frontend expects `availabilityMessage`
4. **No single source of truth**: Multiple functions doing same calculations

## Solution Architecture

### 1. Single Source of Truth
- Create `/src/lib/quiz-availability.ts` as the ONLY place for availability calculations
- All components and APIs use this service
- Remove duplicate calculations from frontend

### 2. Data Flow
```
Database (UTC) 
    ↓
API (uses quiz-availability.ts)
    ↓
Frontend (displays pre-calculated data)
```

### 3. Key Functions
- `calculateQuizAvailability()` - Main calculation function
- `formatQuizTimeForDisplay()` - Display formatting only

## Files to Update

### High Priority (Breaking Issues)
1. ✅ `/src/lib/quiz-availability.ts` - NEW SERVICE (created)
2. `/src/lib/quiz-scheduling.ts` - Use new service
3. `/src/app/api/student/quizzes/route.ts` - Use new service
4. ✅ `/src/app/student/quizzes/QuizzesContent.tsx` - Remove calculations (updated)

### Medium Priority (Consistency)
5. `/src/app/api/educator/quiz/[id]/bulk-enroll/route.ts`
6. `/src/app/api/educator/quiz/[id]/enroll/route.ts`
7. `/src/app/api/educator/quiz/[id]/assign-group/route.ts`

### Low Priority (Cleanup)
8. `/src/lib/timezone.ts` - Keep for timezone conversion only
9. `/src/hooks/useTimezone.ts` - Simplify, remove quiz-specific logic

## Implementation Steps

### Step 1: Update quiz-scheduling.ts
Replace `getQuizAvailabilityStatus` to use new service:
```typescript
import { calculateQuizAvailability } from '@/lib/quiz-availability';

export function getQuizAvailabilityStatus(quiz: QuizSchedulingInfo) {
  return calculateQuizAvailability({
    startTime: getEffectiveStartTime(quiz),
    timezone: quiz.timezone,
    duration: quiz.duration,
    status: quiz.status,
    isReassignment: false,
    attempted: false
  });
}
```

### Step 2: Update API routes
Ensure consistent field names:
```typescript
const availability = calculateQuizAvailability(quizData);
return {
  ...quiz,
  availabilityMessage: availability.message,
  availabilityStatus: availability.status,
  available: availability.available
};
```

### Step 3: Frontend uses backend data
Frontend only displays, never calculates:
```typescript
const getQuizStatus = (quiz: SafeQuiz) => ({
  available: quiz.available,
  text: quiz.availabilityMessage,
  status: quiz.availabilityStatus
});
```

## Testing Checklist

### Functional Tests
- [ ] Quiz shows "active" when within time window
- [ ] Quiz shows correct countdown when upcoming
- [ ] Quiz shows "ended" after time expires
- [ ] Reassignments work correctly
- [ ] All timezones display correctly

### Edge Cases
- [ ] Quiz starting in 1 minute
- [ ] Quiz ending in 1 minute
- [ ] Midnight crossover
- [ ] DST transitions
- [ ] Invalid dates handled gracefully

### Performance
- [ ] No duplicate API calls
- [ ] No unnecessary recalculations
- [ ] Cache working properly

## Benefits
1. **Single source of truth** - One place for all calculations
2. **No duplicate logic** - Frontend trusts backend
3. **Consistent behavior** - Same calculation everywhere
4. **Easier debugging** - One place to fix issues
5. **Better performance** - No redundant calculations

## Rollback Plan
If issues occur:
1. Revert quiz-availability.ts changes
2. Restore original getQuizAvailabilityStatus
3. Re-enable frontend calculations

## Success Metrics
- Zero "In X hours" bugs for active quizzes
- Consistent time display across all components
- Reduced code complexity
- Faster page loads (no duplicate calcs)