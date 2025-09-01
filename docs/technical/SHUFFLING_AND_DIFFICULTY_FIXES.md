# Quiz Shuffling Logic and Difficulty Mapping - Technical Documentation

## Last Updated: 2025-01-02

This document contains critical information about the quiz shuffling implementation and difficulty mapping fixes that must be maintained for the system to work correctly.

---

## 1. Quiz Shuffling Logic Implementation

### Problem Solved
When quiz options were shuffled for students, the review/results page showed incorrect option letters. The correct answer would be marked at position A (original position) even though it had moved to position C during shuffling.

### Solution Architecture

#### Database Changes
- **Added Field**: `question_order` (JSONB) to `quiz_attempts` table
- **Migration**: `drizzle/0018_glossy_grim_reaper.sql`
- **Purpose**: Stores the exact shuffled order of questions and options as seen by each student

#### Schema Update
```typescript
// src/lib/schema.ts
export const quizAttempts = pgTable("quiz_attempts", {
  // ... other fields
  questionOrder: jsonb("question_order").$type<{
    questionId: string, 
    options: {id: string, text: string}[]
  }[]>(),
  // ... other fields
});
```

### How It Works

#### 1. When Student Starts Quiz
**File**: `/src/app/api/student/quiz/[id]/start/route.ts`
- Questions are shuffled (if enabled)
- Options within each question are shuffled
- The shuffled order is stored in `questionOrder` field
- Option letters (A, B, C, D) are assigned based on array index

#### 2. When Student Resumes Quiz
- Retrieved `questionOrder` from the attempt
- Questions and options displayed in exact same order
- Maintains consistency across sessions

#### 3. When Viewing Results
**Files**: 
- `/src/app/api/student/results/[id]/route.ts`
- `/src/app/api/educator/attempt/[id]/route.ts`
- Uses stored `questionOrder` to reconstruct exact layout
- Option letters match what student actually saw

### Key Implementation Details

#### Option Letter Assignment
```typescript
// Letters are ALWAYS based on array index, not option ID
options.map((option, index) => {
  const letter = String.fromCharCode(65 + index); // A=0, B=1, C=2, D=3
  return `${letter}: ${option.text}`;
});
```

#### Storing Shuffled Order
```typescript
const questionOrderForAttempt = preparedQuestions.map(q => ({
  questionId: q.id,
  options: q.options // Preserves the shuffled order
}));
```

#### Reconstructing for Display
```typescript
if (attempt.questionOrder && Array.isArray(attempt.questionOrder)) {
  const storedOrder = attempt.questionOrder;
  // Reconstruct questions in the same order the student saw them
  questionsWithResults = storedOrder.map(stored => {
    const question = questionsWithResults.find(q => q.id === stored.questionId);
    if (question) {
      return {
        ...question,
        options: stored.options // Use the shuffled options order
      };
    }
  }).filter(Boolean);
}
```

### Backward Compatibility
- Old attempts without `questionOrder` field continue to work
- Falls back to original order if `questionOrder` is null
- No breaking changes to existing data

---

## 2. Difficulty Mapping Issue

### Problem
The "Performance by Difficulty" analytics showed 0% for all categories because of a terminology mismatch.

### Root Cause
- **Database stores**: `easy`, `intermediate`, `hard`
- **Analytics expects**: `easy`, `medium`, `hard`
- The word "intermediate" vs "medium" caused data to not be counted

### Database Schema
```sql
CREATE TYPE "public"."difficulty" AS ENUM('easy', 'intermediate', 'hard');
```

### Current Data Distribution
- easy: 102 questions
- intermediate: 224 questions
- hard: 22 questions

### Fix Applied
**File**: `/src/app/api/educator/attempt/[id]/route.ts`

```typescript
// Difficulty analysis - map intermediate to medium
let difficulty = (q.difficulty || 'medium').toLowerCase();
// Map intermediate to medium for consistency
if (difficulty === 'intermediate') {
  difficulty = 'medium';
}
```

### Bloom's Taxonomy to Difficulty Mapping
**File**: `/src/lib/analytics-helpers.ts`

```typescript
function getBloomsDifficulty(bloomsLevel: string | null): string {
  if (!bloomsLevel) return 'Unknown';
  
  const level = bloomsLevel.toLowerCase();
  
  // Easy
  if (level === 'knowledge' || level === 'remember') {
    return 'Easy';
  }
  
  // Medium
  if (level === 'comprehension' || level === 'understand' || 
      level === 'application' || level === 'apply') {
    return 'Medium';
  }
  
  // Hard
  if (level === 'analysis' || level === 'analyze' || 
      level === 'synthesis' || level === 'create' || 
      level === 'evaluation' || level === 'evaluate') {
    return 'Hard';
  }
  
  return 'Medium';
}
```

---

## 3. Critical Files Reference

### Shuffling Logic Files
1. **API Routes**:
   - `/src/app/api/student/quiz/[id]/start/route.ts` - Stores shuffled order
   - `/src/app/api/student/results/[id]/route.ts` - Uses stored order for results
   - `/src/app/api/educator/attempt/[id]/route.ts` - Educator view with shuffling

2. **Schema**:
   - `/src/lib/schema.ts` - Database schema with `questionOrder` field

3. **Utilities**:
   - `/src/lib/quiz-utils.ts` - Shuffling functions

4. **Frontend**:
   - `/src/app/educator/quiz/[id]/review/ReviewPageSingleQuestion.tsx` - Displays with correct letters

### Difficulty Mapping Files
1. **Analytics**:
   - `/src/lib/analytics-helpers.ts` - Bloom's to difficulty mapping
   - `/src/app/api/educator/attempt/[id]/route.ts` - Intermediate to medium mapping

2. **Quiz Creation**:
   - `/src/app/educator/quiz/create/page.tsx` - Uses "intermediate" in UI
   - Various webhook routes - Handle difficulty during question generation

---

## 4. Testing

### Test Scripts Created
1. **Comprehensive Test**: `/scripts/test-shuffling-logic.js`
   - Tests option shuffling
   - Tests question shuffling
   - Tests resumed quiz order
   - Tests backward compatibility
   - All tests passing ✓

2. **Integration Test**: `/scripts/test-shuffling-integration.js`
   - Tests through actual API calls
   - Verifies student and educator panels

### Test Results Summary
- ✅ Option shuffling preserves correct answer IDs
- ✅ Question and option order stored with attempts
- ✅ Results display in exact order students saw
- ✅ Resumed quizzes maintain shuffled order
- ✅ Backward compatibility with old attempts
- ✅ Build successful with no type errors

---

## 5. Important Rules

### DO's
1. **Always map** `intermediate` to `medium` in analytics
2. **Always use** array index for option letters (A, B, C, D)
3. **Always store** shuffled order in `questionOrder` field
4. **Always retrieve** and use stored order for results display

### DON'Ts
1. **Don't change** the database enum without migration
2. **Don't use** option IDs for letter assignment
3. **Don't assume** option positions without checking stored order
4. **Don't forget** to handle backward compatibility

---

## 6. Common Issues and Solutions

### Issue: Difficulty showing 0%
**Solution**: Check that intermediate → medium mapping is in place

### Issue: Wrong option letters in results
**Solution**: Ensure using stored `questionOrder` from attempt

### Issue: Shuffling not consistent on resume
**Solution**: Verify `questionOrder` is being saved and retrieved

### Issue: Old quizzes breaking
**Solution**: Check backward compatibility fallbacks are working

---

## 7. Future Considerations

1. **Database Migration**: If changing difficulty enum, need to:
   - Update all existing "intermediate" values
   - Update enum definition
   - Update all code references

2. **Performance**: The `questionOrder` field adds ~2KB per attempt
   - Acceptable overhead for accuracy
   - Consider cleanup for very old attempts

3. **Analytics**: Consider adding:
   - Shuffle effectiveness metrics
   - Option position bias analysis
   - Difficulty calibration based on actual performance

---

## Quick Reference Commands

### Check if questionOrder exists
```bash
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT COUNT(*) FROM quiz_attempts WHERE question_order IS NOT NULL').then(r => {
  console.log('Attempts with questionOrder:', r.rows[0].count);
  pool.end();
});"
```

### Check difficulty distribution
```bash
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT difficulty, COUNT(*) as count FROM questions GROUP BY difficulty').then(r => {
  r.rows.forEach(row => console.log(row.difficulty + ':', row.count));
  pool.end();
});"
```

### Run shuffling tests
```bash
node scripts/test-shuffling-logic.js
```

---

## Maintenance Notes

**Last tested**: 2025-01-02
**Build status**: ✅ Passing
**Type check**: ✅ No errors
**Database migration**: ✅ Applied
**Production ready**: ✅ Yes

---

## Contact for Issues

If you encounter issues with:
- Shuffling logic not working correctly
- Difficulty analytics showing incorrect data
- Option letters not matching student view

Refer to this documentation first, then check the test scripts for debugging.