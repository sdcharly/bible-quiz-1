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
- Create `/src/lib/quiz-availability.ts` as the ONLY place for availability calculations (pure, no I/O)
- All functions accept `nowUtc?: Date` (default: `new Date()`) to inject time during tests
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

### 3. Type Definitions and Contract

#### AvailabilityStatus Union Type
```typescript
type AvailabilityStatus = 
  | 'active'      // Quiz is currently available to take
  | 'upcoming'    // Quiz will be available in the future
  | 'ended'       // Quiz has ended
  | 'draft'       // Quiz is in draft state
  | 'archived';   // Quiz is archived
```

#### AvailabilityInput Interface
```typescript
interface AvailabilityInput {
  startTime: Date;        // UTC timestamp when quiz starts
  duration: number;       // Duration in milliseconds
  status?: 'draft' | 'published' | 'archived';  // Optional quiz status
  timezone: string;       // IANA timezone identifier (e.g., 'America/New_York')
  isReassignment?: boolean;  // Whether this is a reassigned quiz
  attempted?: boolean;    // Whether user has attempted the quiz
  nowUtc?: Date;         // Injected clock for testing (defaults to new Date())
}
```

#### AvailabilityResult Interface
```typescript
interface AvailabilityResult {
  status: AvailabilityStatus;  // One of the defined statuses
  available: boolean;           // Whether quiz can be taken now
  message: string;              // Human-readable message
  startsAtUtc: string;         // ISO 8601 string of start time (UTC)
  endsAtUtc: string;           // ISO 8601 string of end time (UTC)
}
```

### 4. Key Functions
- `calculateQuizAvailability(input: AvailabilityInput): AvailabilityResult` - Main calculation function that accepts UTC times and returns availability with ISO string timestamps
- `formatQuizTimeForDisplay(date: Date, timezone: string): string` - Display formatting only (no business logic)

**Important Contract Details:**
- All `Date` objects in `AvailabilityInput` MUST be UTC timestamps
- `startsAtUtc` and `endsAtUtc` in the result are ISO 8601 strings (e.g., "2024-01-15T10:00:00.000Z")
- The `nowUtc` parameter allows time injection for testing, defaults to current UTC time
- Timezone is only used for display formatting, never for calculations

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
Replace `getQuizAvailabilityStatus` to use new service with typed contract:
```typescript
import { 
  calculateQuizAvailability,
  type AvailabilityInput,
  type AvailabilityResult 
} from '@/lib/quiz-availability';

export function getQuizAvailabilityStatus(quiz: QuizSchedulingInfo): AvailabilityResult {
  const input: AvailabilityInput = {
    startTime: getEffectiveStartTime(quiz), // Must be UTC Date
    timezone: quiz.timezone,                // IANA timezone string
    duration: quiz.duration,                // milliseconds
    status: quiz.status,
    isReassignment: false,
    attempted: false
  };
  return calculateQuizAvailability(input);
}
```

### Step 2: Update API routes
Ensure consistent field names and use typed result:
```typescript
import type { AvailabilityResult } from '@/lib/quiz-availability';

const availability: AvailabilityResult = calculateQuizAvailability({
  startTime: quiz.startTime,  // Already UTC from database
  duration: quiz.duration,
  timezone: userTimezone,
  status: quiz.status,
  // ... other fields
});

// Return with ISO string timestamps
return {
  ...quiz,
  availabilityMessage: availability.message,
  availabilityStatus: availability.status,
  available: availability.available,
  startsAtUtc: availability.startsAtUtc,  // ISO 8601 string
  endsAtUtc: availability.endsAtUtc       // ISO 8601 string
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