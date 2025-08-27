# Quiz Limit Logic Documentation

## Overview
The quiz creation limit system ensures educators don't exceed their allocated quiz quota based on their permission level. As of the latest update, **archived quizzes do NOT count against the educator's quiz limit**.

## How Quiz Limits Work

### Permission Levels and Default Limits
Educators have different quiz limits based on their approval status and permission template:

- **Pending Educators**: 0 quizzes (cannot create)
- **Approved Educators**: 50 quizzes (default)
- **Premium Educators**: Unlimited (-1 in system)
- **Suspended Educators**: 0 quizzes (cannot create)

### Quiz Status Types
Quizzes can have the following statuses:
- `draft` - Quiz created but not published (counts toward limit)
- `published` - Quiz is active and available to students (counts toward limit)
- `completed` - Quiz period has ended (counts toward limit)
- `archived` - Quiz has been archived/deactivated (**does NOT count toward limit**)

## Implementation Details

### Where Quiz Limits Are Checked
Quiz limits are enforced in three API endpoints:
1. `/api/educator/quiz/create/route.ts` - Standard quiz creation
2. `/api/educator/quiz/create-async/route.ts` - Async quiz creation
3. `/api/educator/quiz/create-deferred/route.ts` - Deferred quiz creation

### The Count Logic
```typescript
// Check if educator has reached their quiz limit (excluding archived quizzes)
const currentQuizCount = await db.select({ count: quizzes.id })
  .from(quizzes)
  .where(and(
    eq(quizzes.educatorId, educatorId),
    ne(quizzes.status, "archived")  // Archived quizzes don't count
  ));

const quizLimitCheck = await checkEducatorLimits(educatorId, 'maxQuizzes', currentQuizCount.length);
```

### Key Points
- Only **active quizzes** (draft, published, completed) count toward the limit
- **Archived quizzes** are excluded from the count
- This prevents educators from getting stuck when they reach their limit
- Educators can archive old quizzes to free up space for new ones

## Quiz Archiving Rules

### When Quizzes Get Archived
Quizzes are archived in the following scenarios:

1. **Manual Archiving**: Educator clicks "Archive" button on a quiz
2. **Forced Archiving on Delete**: 
   - If students have attempted the quiz, it gets archived instead of deleted
   - If students are enrolled but haven't attempted, it gets archived
   - Only quizzes with no enrollments can be fully deleted

### What Happens to Archived Quizzes
- Status changes to `archived`
- Quiz becomes inaccessible to students
- Quiz data is preserved for historical records
- **Quiz no longer counts toward educator's limit**
- Can be reactivated by educator if needed

### Archive vs Delete Decision Tree
```
Delete Request
├── Has Student Attempts?
│   └── Yes → Archive (preserve data)
├── Has Student Enrollments?
│   └── Yes → Archive (preserve data)
└── No Enrollments
    └── Delete (remove completely)
```

## Permissions System Integration

The quiz limit check integrates with the permissions system:

```typescript
// From /src/lib/permissions.ts
export async function checkEducatorLimits(
  userId: string,
  limitType: "maxStudents" | "maxQuizzes" | "maxQuestionsPerQuiz",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; remaining: number }>
```

The function returns:
- `allowed`: Whether the educator can create more quizzes
- `limit`: The maximum number of quizzes allowed (-1 for unlimited)
- `remaining`: How many more quizzes can be created

## Common Scenarios

### Scenario 1: Educator Reaches Limit
- Educator has 50 active quizzes (limit reached)
- Cannot create new quiz
- Solution: Archive old/completed quizzes to free up slots

### Scenario 2: Published Quiz No Longer Needed
- Quiz has been completed by students
- Educator archives it
- Quiz no longer counts toward limit
- Educator can create a new quiz

### Scenario 3: Reactivating Archived Quiz
- Educator reactivates an archived quiz
- Quiz status changes from `archived` to `draft` or `published`
- Quiz now counts toward limit again
- If at limit, reactivation may fail

## Error Messages

When quiz limit is reached:
```json
{
  "error": "You have reached your maximum quiz limit. Please contact support to upgrade your account.",
  "currentCount": 50,
  "limit": 50
}
```

## Best Practices for Educators

1. **Regular Cleanup**: Archive completed quizzes that are no longer needed
2. **Seasonal Management**: Archive quizzes from previous terms/semesters
3. **Before Creating New**: Check if any old quizzes can be archived
4. **Reuse When Possible**: Consider updating existing quizzes instead of creating new ones

## Technical Notes

### Database Queries
The exclusion of archived quizzes is handled at the database level using Drizzle ORM:
```typescript
import { and, ne } from "drizzle-orm";

// ne = "not equal" - excludes archived status
where(and(
  eq(quizzes.educatorId, educatorId),
  ne(quizzes.status, "archived")
))
```

### Performance Considerations
- The query uses indexed columns (`educatorId`, `status`)
- Excluding archived quizzes reduces the count operation size
- No additional database round trips required

## Related Documentation
- `/docs/technical/PERMISSION_TEMPLATES.md` - Permission template system
- `/docs/technical/URL_SYSTEM_ARCHITECTURE.md` - Quiz sharing and access
- `/src/lib/permissions.ts` - Permission checking implementation
- `/src/lib/schema.ts` - Database schema definitions

## Change History
- **2024-12-27**: Updated quiz limit logic to exclude archived quizzes from count
- Previous behavior: All quizzes (including archived) counted toward limit
- New behavior: Only active quizzes count, archived quizzes are excluded