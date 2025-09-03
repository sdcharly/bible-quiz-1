# Timezone and Time Function Cleanup Plan

## Functions to Keep

### `/src/lib/quiz-availability.ts` (NEW - PRIMARY)
- `calculateQuizAvailability()` - Single source of truth for quiz availability
- `formatQuizTimeForDisplay()` - Display formatting only

### `/src/lib/timezone.ts` (KEEP ONLY GENERIC)
Keep only:
- `convertUserTimezoneToUTC()` - Generic UTC conversion
- `convertUTCToUserTimezone()` - Generic timezone conversion
- `formatDateInTimezone()` - Generic date formatting
- `getCurrentTimeInUserTimezone()` - Get current time in user timezone
- `convertUTCToDateTimeLocal()` - For HTML datetime inputs
- `TIMEZONE_OPTIONS` - List of supported timezones

Remove:
- `isQuizAvailable()` - Use calculateQuizAvailability instead
- `getRelativeTime()` - Use calculateQuizAvailability instead
- `isQuizTimeValid()` - Move validation to quiz-specific files

### `/src/hooks/useTimezone.ts`
Simplify to only provide:
- `timezone` - User's current timezone
- `formatDate()` - Generic date formatting
- `toUTC()` - Convert to UTC
- `toUserTimezone()` - Convert from UTC

Remove:
- `isQuizAvailable` - Use API data instead
- `getRelativeTime` - Use API data instead

## Functions to Remove/Deprecate

### `/src/lib/quiz-scheduling.ts`
- Keep `getQuizAvailabilityStatus()` but make it delegate to `calculateQuizAvailability()`
- Remove any duplicate time calculation logic

## Migration Guide

### OLD WAY (Multiple calculation points):
```typescript
// Frontend calculates
const available = isQuizAvailable(quiz.startTime);
const relativeTime = getRelativeTime(quiz.startTime);

// Backend calculates
const availability = getQuizAvailabilityStatus(quiz);
```

### NEW WAY (Single source of truth):
```typescript
// Backend calculates once
const availability = calculateQuizAvailability(quizData);

// Frontend just displays
<span>{quiz.availabilityMessage}</span>
```

## Benefits
1. No duplicate calculations
2. Consistent behavior everywhere
3. Easier to debug (one place to check)
4. Better performance
5. Less confusion about which function to use