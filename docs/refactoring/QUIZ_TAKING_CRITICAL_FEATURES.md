# Quiz Taking Pages - Critical Features to Preserve

## ⚠️ CRITICAL: These optimizations MUST be preserved during refactoring

### 1. Performance Optimizations

#### useRef Pattern (CRITICAL)
```javascript
// These prevent stale closures in timers
const timeRemainingRef = useRef(0);
const quizRef = useRef<QuizAttempt | null>(null);
const questionStartTimeRef = useRef(Date.now());
const timerRef = useRef<NodeJS.Timeout | null>(null);
const attemptIdRef = useRef<string | null>(null);
```
**DO NOT CHANGE TO useState** - This will break timer functionality

#### useMemo for Current Question
```javascript
const currentQuestion = useMemo(() => {
  if (!quiz || !quiz.questions[currentQuestionIndex]) return null;
  return quiz.questions[currentQuestionIndex];
}, [quiz, currentQuestionIndex]);
```
Prevents recalculation on every render

#### useCallback for Event Handlers
- `handleSubmit` - Optimized with refs
- `formatTime` - Memoized formatter
- `handleAnswerSelect` - With time tracking
- `handleMarkForReview`
- `handleNext`, `handlePrevious`
- `handleJumpToQuestion`

### 2. Session Management (CRITICAL)

```javascript
const {
  sessionState,
  isWarning,
  isExpired,
  extendSession,
  resetActivity,
} = useSessionManager({
  isQuizActive: true,
  enableAutoExtend: true,
  onSessionExpired: () => { /* auto-submit */ },
  onSessionWarning: (remaining) => { /* warning */ }
});
```
- Auto-extends session during quiz
- Auto-submits on session expiry
- Shows warning messages
- Resets activity on answer selection

### 3. Timer Management (CRITICAL)

#### Timer with Cleanup
```javascript
useEffect(() => {
  if (timeRemaining <= 0 || !quiz) return;
  
  if (timerRef.current) {
    clearInterval(timerRef.current);
  }
  
  timerRef.current = setInterval(() => {
    timeRemainingRef.current -= 1;
    setTimeRemaining(timeRemainingRef.current);
    
    if (timeRemainingRef.current <= 0) {
      handleSubmit(true); // Auto-submit
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Warning alerts at 10min, 5min, 1min
  }, 1000);
  
  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, [quiz, handleSubmit, timeRemaining]);
```

### 4. Quiz Resumption (CRITICAL)

```javascript
if (data.resumed) {
  setIsResumed(true);
  const minutesRemaining = Math.floor(remainingTime / 60);
  alert(`Welcome back! You have ${minutesRemaining} minutes remaining...`);
}
```
Allows students to resume interrupted quizzes

### 5. Answer Tracking with Time Spent

```javascript
interface Answer {
  questionId: string;
  answer: string;
  markedForReview: boolean;
  timeSpent: number; // Tracks time per question
}

// Time tracking on answer selection
const timeSpent = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
```

### 6. Auto-Submit Features

- Auto-submit on timer expiry
- Auto-submit on session expiry
- No confirmation on auto-submit
- Proper cleanup after submit

### 7. Mobile Optimizations

- Touch-manipulation class for better mobile response
- Fixed bottom navigator on mobile
- Responsive button sizes and spacing
- Hidden elements on small screens

### 8. Network Error Handling

```javascript
} catch (error) {
  logger.error("Error loading quiz:", error);
  if (mounted) {
    setLoading(false);
    alert("Network error. Please check your connection and try again.");
    router.push("/student/quizzes");
  }
}
```

### 9. Quiz State Management

- Quiz already completed check
- Quiz not started yet (425 status)
- Enrollment verification
- Proper error messages with timezone formatting

### 10. Question Navigator Features

- Jump to any question
- Color coding (answered, marked, unanswered)
- Current question highlight
- Mobile progress indicator
- Review marked questions button

## ⚠️ DO NOT CHANGE

1. **useRef pattern** - Breaking this breaks timers
2. **Timer cleanup logic** - Memory leaks if broken
3. **Session management hooks** - Security feature
4. **Auto-submit logic** - Academic integrity
5. **Time tracking per question** - Analytics requirement
6. **Network error handling** - User experience
7. **425 status handling** - Timezone support

## Theme Changes ALLOWED

✅ You CAN change:
- Colors to amber theme
- Border styles
- Shadow styles
- Spacing (carefully)
- Button variants (keep functionality)

❌ You CANNOT change:
- Any useRef to useState
- Timer logic
- Session management
- Submit flow
- Answer tracking structure
- Error handling logic

## Testing Requirements After Refactor

1. Start a quiz and let timer expire - should auto-submit
2. Start a quiz and let session expire - should auto-submit
3. Close browser mid-quiz and resume - should work
4. Answer questions and verify time tracking
5. Mark for review and verify navigation
6. Test on mobile device - all features work
7. Test with poor network - proper error handling
8. Submit with unanswered questions - confirmation dialog
9. Try to retake completed quiz - proper message
10. Start quiz before start time - 425 error handled