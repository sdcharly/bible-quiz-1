# Shuffle Options Feature Documentation

## Overview
Implemented a shuffle options feature to randomize answer positions in quiz questions, preventing students from pattern recognition (e.g., "answer is always A").

## Problem Solved
- Previously, correct answers were often in position A
- Students could guess patterns without reading questions
- Made quizzes too easy to game

## Solution Implementation

### 1. **Core Utility Functions** (`/src/lib/quiz-utils.ts`)
- `shuffleArray()`: Fisher-Yates algorithm for true randomization
- `shuffleQuizOptions()`: Shuffles individual question options
- `checkOptionsDistribution()`: Analyzes answer position distribution
- `shuffleAllQuestionOptions()`: Batch shuffles all questions

### 2. **API Endpoints**

#### Individual Shuffle
- **Route**: `/api/educator/quiz/[id]/question/[questionId]/shuffle-options`
- **Method**: POST
- Shuffles options for a single question
- Updates database permanently

#### Bulk Shuffle
- **Route**: `/api/educator/quiz/[id]/shuffle-all-options`
- **Method**: POST
- Shuffles all questions in a quiz
- Returns distribution statistics
- **Method**: GET
- Checks current answer distribution

### 3. **UI Components**
- **Individual Shuffle Button**: Next to Edit button for each question
- **Shuffle All Button**: In header for bulk operations
- Visual feedback during shuffling
- Distribution stats display after bulk shuffle

## Key Features

### Smart Tracking
- Correct answers tracked by ID, not position
- Options array order changes, but correctAnswer ID remains constant
- No data loss or corruption

### Protection Mechanisms
- Cannot shuffle published quizzes
- Requires educator ownership
- Confirmation dialog for bulk operations

### Distribution Analysis
```javascript
// Example output after shuffling
{
  positionCounts: {
    A: 25,  // 25% of correct answers
    B: 26,  // 26% of correct answers
    C: 24,  // 24% of correct answers
    D: 25   // 25% of correct answers
  },
  isWellDistributed: true
}
```

## Usage Instructions

### For Individual Questions
1. Navigate to quiz review page
2. Click "Shuffle" button next to any question
3. Options instantly randomize
4. Changes save automatically

### For Entire Quiz
1. Click "Shuffle All" button in header
2. Confirm the action
3. All questions shuffle simultaneously
4. View distribution statistics

## Benefits
- **Eliminates Pattern Guessing**: No more "always pick A"
- **Improves Quiz Integrity**: Students must read questions
- **One-Click Solution**: Easy for educators to use
- **Permanent Changes**: Saves to database
- **Works with Existing Content**: No need to recreate quizzes

## Technical Details

### Database Schema
- Options stored as JSON array in `questions` table
- Order preserved in array structure
- `correctAnswer` field stores option ID

### Performance
- Shuffle operation: O(n) time complexity
- Bulk operations use parallel updates
- No impact on quiz-taking performance

## Testing
Run demo script to see functionality:
```bash
node scripts/test-shuffle-demo.js
```

## Future Enhancements
- Auto-shuffle on quiz creation
- Distribution targets (e.g., ensure 25% each)
- Shuffle history tracking
- Pattern detection alerts