# Archived vs Expired Quizzes - Technical Documentation

## Summary
**Yes, archived quizzes are effectively expired from a student's perspective**, but they work differently than time-based expiry.

## Key Differences

### Archived Quizzes
- **Status**: `status = 'archived'`
- **Visibility**: **NEVER shown to students** (filtered at API level)
- **Access**: Students cannot access or attempt archived quizzes
- **Purpose**: Manual educator action to hide/deactivate quizzes
- **Reversible**: Educators can reactivate archived quizzes
- **Reassignments**: Cannot reassign an archived quiz (must reactivate first)

### Expired Quizzes (Time-based)
- **Status**: `status = 'published'` but past end time
- **Visibility**: Shown to students with "Expired" indicator
- **Access**: Cannot start new attempts (unless reassigned)
- **Purpose**: Automatic based on time constraints
- **Reassignments**: Can be reassigned to specific students

## How Archiving Works

### API Level (`/api/student/quizzes`)
```typescript
// Line 59: Only fetches published quizzes
.where(
  and(
    eq(quizzes.status, "published"),  // ← Excludes archived
    inArray(quizzes.educatorId, educatorIds)
  )
)
```

### Database Level
- Archived quizzes remain in the database with `status = 'archived'`
- They are excluded from:
  - Student quiz lists
  - Quiz limit counts
  - Active quiz statistics

### Educator Actions
1. **Archive**: Changes quiz status from `published` → `archived`
2. **Reactivate**: Changes quiz status from `archived` → `published`

## When Quizzes Get Archived

1. **Manual Archive**: Educator clicks "Archive" button
2. **Delete with Enrollments**: If students are enrolled/attempted, delete becomes archive
3. **Cleanup**: Educator can archive old quizzes to declutter

## Important Notes

1. **Archived ≠ Deleted**: Archived quizzes are hidden but preserved
2. **No Student Access**: Students cannot see or access archived quizzes at all
3. **Different from Expiry**: 
   - Expired = time constraint passed (can be reassigned)
   - Archived = manually hidden (must be reactivated)
4. **Quiz Limits**: Archived quizzes don't count toward educator's quiz limit

## For Reassignments

- **Expired Quiz**: ✅ Can be reassigned to students
- **Archived Quiz**: ❌ Cannot be reassigned (must reactivate first)

## Code References

- API filtering: `/src/app/api/student/quizzes/route.ts:59`
- Archive action: `/src/app/api/educator/quiz/[id]/delete/route.ts`
- Status enum: `/src/lib/schema.ts` - `quizStatusEnum`
- UI handling: `/src/app/educator/quizzes/page.tsx`