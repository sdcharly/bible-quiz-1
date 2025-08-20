# 🍳 UI Cookbook

> Practical recipes for building delightful UI components in SimpleQuiz

## Table of Contents

1. [Buttons](#buttons)
2. [Cards](#cards)
3. [Forms](#forms)
4. [Quiz Components](#quiz-components)
5. [Loading States](#loading-states)
6. [Empty States](#empty-states)
7. [Navigation](#navigation)
8. [Modals & Overlays](#modals--overlays)
9. [Feedback & Notifications](#feedback--notifications)
10. [Mobile Patterns](#mobile-patterns)

---

## Buttons

### Primary Button - Call to Action

```jsx
// Friendly, prominent button for main actions
<button className="
  bg-gradient-to-r from-blue-500 to-blue-600
  text-white font-semibold
  px-6 py-3 rounded-lg
  min-h-[44px] min-w-[120px]
  shadow-md hover:shadow-lg
  transform transition-all duration-200
  hover:scale-[1.02] active:scale-[0.98]
  focus:outline-none focus:ring-4 focus:ring-blue-500/20
">
  Start Quiz 🚀
</button>
```

### Secondary Button - Supporting Actions

```jsx
<button className="
  bg-white border-2 border-gray-200
  text-gray-700 font-medium
  px-6 py-3 rounded-lg
  min-h-[44px]
  hover:border-blue-500 hover:text-blue-600
  transition-all duration-200
  focus:outline-none focus:ring-4 focus:ring-gray-500/20
">
  Save Draft
</button>
```

### Mobile-Optimized Button Group

```jsx
// Stack on mobile, inline on tablet+
<div className="flex flex-col sm:flex-row gap-3 w-full">
  <button className="flex-1 py-4 px-6 bg-blue-500 text-white rounded-lg">
    Continue
  </button>
  <button className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-lg">
    Go Back
  </button>
</div>
```

### Floating Action Button (Mobile)

```jsx
<button className="
  fixed bottom-6 right-6 z-30
  w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500
  text-white rounded-full shadow-lg
  flex items-center justify-center
  transform transition-all duration-300
  hover:scale-110 active:scale-95
">
  <PlusIcon className="w-6 h-6" />
</button>
```

---

## Cards

### Quiz Card - Interactive & Friendly

```jsx
<div className="
  bg-white rounded-2xl p-6
  border border-gray-100
  shadow-sm hover:shadow-md
  transition-all duration-200
  hover:translate-y-[-2px]
  cursor-pointer
">
  <div className="flex justify-between items-start mb-4">
    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full">
      Biology
    </span>
    <span className="text-gray-400 text-sm">5 min</span>
  </div>
  
  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    Cell Structure Quiz
  </h3>
  
  <p className="text-gray-600 text-sm mb-4">
    Test your knowledge of cell biology basics
  </p>
  
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {/* Student avatars */}
        <div className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white" />
        <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white" />
      </div>
      <span className="text-sm text-gray-500">12 students</span>
    </div>
    
    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
  </div>
</div>
```

### Statistics Card - Data Visualization

```jsx
<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6">
  <div className="flex items-center justify-between mb-4">
    <div className="p-3 bg-white rounded-xl shadow-sm">
      <TrophyIcon className="w-6 h-6 text-yellow-500" />
    </div>
    <span className="text-2xl">🎯</span>
  </div>
  
  <p className="text-gray-600 text-sm mb-1">Average Score</p>
  <p className="text-3xl font-bold text-gray-900">85%</p>
  
  <div className="mt-4 flex items-center gap-2">
    <span className="text-green-600 text-sm font-medium">↑ 12%</span>
    <span className="text-gray-500 text-sm">from last week</span>
  </div>
</div>
```

---

## Forms

### Mobile-Friendly Input

```jsx
<div className="space-y-2">
  <label className="text-sm font-medium text-gray-700">
    Quiz Title
  </label>
  <input
    type="text"
    className="
      w-full px-4 py-3
      border border-gray-200 rounded-lg
      text-base
      focus:outline-none focus:ring-4 focus:ring-blue-500/20
      focus:border-blue-500
      transition-all duration-200
      placeholder:text-gray-400
    "
    placeholder="Enter a catchy title..."
  />
  <p className="text-xs text-gray-500 mt-1">
    Make it memorable! Students will see this title
  </p>
</div>
```

### Select Dropdown - Touch Optimized

```jsx
<div className="relative">
  <select className="
    w-full px-4 py-3 pr-10
    bg-white border border-gray-200 rounded-lg
    text-base appearance-none
    focus:outline-none focus:ring-4 focus:ring-blue-500/20
    focus:border-blue-500
  ">
    <option>Easy - 5 minutes</option>
    <option>Medium - 10 minutes</option>
    <option>Hard - 15 minutes</option>
  </select>
  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
</div>
```

### Checkbox Group - Friendly Selection

```jsx
<div className="space-y-3">
  {options.map(option => (
    <label key={option.id} className="
      flex items-center p-4
      bg-white border-2 border-gray-200 rounded-lg
      cursor-pointer
      hover:border-blue-500 hover:bg-blue-50/50
      transition-all duration-200
      has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50
    ">
      <input
        type="checkbox"
        className="w-5 h-5 text-blue-600 rounded focus:ring-4 focus:ring-blue-500/20"
      />
      <span className="ml-3 text-gray-700">{option.label}</span>
    </label>
  ))}
</div>
```

---

## Quiz Components

### Question Card

```jsx
<div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
  {/* Progress indicator */}
  <div className="mb-6">
    <div className="flex justify-between text-sm text-gray-500 mb-2">
      <span>Question 3 of 10</span>
      <span>30%</span>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full w-[30%] bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" />
    </div>
  </div>
  
  {/* Question */}
  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-6">
    What is the main function of mitochondria in a cell?
  </h2>
  
  {/* Options */}
  <div className="space-y-3">
    {['A', 'B', 'C', 'D'].map((letter, index) => (
      <button
        key={letter}
        className="
          w-full p-4 text-left
          bg-gray-50 hover:bg-blue-50
          border-2 border-transparent hover:border-blue-200
          rounded-xl
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-500/20
          group
        "
      >
        <div className="flex items-center">
          <span className="
            w-8 h-8 rounded-lg
            bg-white group-hover:bg-blue-100
            flex items-center justify-center
            font-semibold text-gray-600 group-hover:text-blue-600
            transition-colors duration-200
          ">
            {letter}
          </span>
          <span className="ml-4 text-gray-700">
            {options[index]}
          </span>
        </div>
      </button>
    ))}
  </div>
</div>
```

### Quiz Result Card

```jsx
<div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 text-center">
  <div className="mb-6">
    <div className="text-6xl mb-4">🎉</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">
      Great job!
    </h2>
    <p className="text-gray-600">
      You've completed the quiz
    </p>
  </div>
  
  <div className="bg-white rounded-xl p-6 mb-6">
    <div className="text-4xl font-bold text-blue-600 mb-2">
      85%
    </div>
    <p className="text-gray-600 text-sm">
      You got 17 out of 20 correct
    </p>
  </div>
  
  <div className="grid grid-cols-3 gap-4 mb-6">
    <div className="bg-white rounded-lg p-3">
      <p className="text-2xl mb-1">⏱️</p>
      <p className="text-sm text-gray-600">8:24</p>
    </div>
    <div className="bg-white rounded-lg p-3">
      <p className="text-2xl mb-1">🎯</p>
      <p className="text-sm text-gray-600">17/20</p>
    </div>
    <div className="bg-white rounded-lg p-3">
      <p className="text-2xl mb-1">🏆</p>
      <p className="text-sm text-gray-600">#3</p>
    </div>
  </div>
  
  <button className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold">
    Review Answers
  </button>
</div>
```

---

## Loading States

### Skeleton Card Loader

```jsx
<div className="bg-white rounded-2xl p-6 animate-pulse">
  <div className="h-6 bg-gray-200 rounded-full w-24 mb-4" />
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
  <div className="flex gap-2">
    <div className="h-8 bg-gray-200 rounded-lg flex-1" />
    <div className="h-8 bg-gray-200 rounded-lg flex-1" />
  </div>
</div>
```

### Friendly Loading Message

```jsx
<div className="flex flex-col items-center justify-center p-12">
  <div className="relative">
    <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
    <div className="absolute top-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
  </div>
  <p className="mt-4 text-gray-600 font-medium">
    Getting your quiz ready...
  </p>
  <p className="text-sm text-gray-400 mt-1">
    This won't take long! 🚀
  </p>
</div>
```

---

## Empty States

### No Quizzes Yet

```jsx
<div className="text-center py-12">
  <div className="text-6xl mb-4">📚</div>
  <h3 className="text-xl font-semibold text-gray-900 mb-2">
    No quizzes yet
  </h3>
  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
    Create your first quiz and start engaging your students!
  </p>
  <button className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold">
    Create First Quiz
  </button>
</div>
```

---

## Navigation

### Mobile Bottom Navigation

```jsx
<nav className="
  fixed bottom-0 left-0 right-0
  bg-white border-t border-gray-200
  px-4 py-2
  sm:hidden
">
  <div className="flex justify-around">
    {[
      { icon: HomeIcon, label: 'Home', active: true },
      { icon: BookOpenIcon, label: 'Quizzes' },
      { icon: ChartBarIcon, label: 'Stats' },
      { icon: UserIcon, label: 'Profile' }
    ].map((item) => (
      <button
        key={item.label}
        className={`
          flex flex-col items-center py-2 px-3
          ${item.active ? 'text-blue-600' : 'text-gray-400'}
        `}
      >
        <item.icon className="w-6 h-6 mb-1" />
        <span className="text-xs">{item.label}</span>
      </button>
    ))}
  </div>
</nav>
```

---

## Modals & Overlays

### Mobile-Friendly Modal

```jsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  
  {/* Modal - slides up on mobile */}
  <div className="
    relative bg-white w-full sm:max-w-lg
    rounded-t-2xl sm:rounded-2xl
    p-6 sm:m-4
    animate-slide-up sm:animate-fade-in
  ">
    <h3 className="text-xl font-semibold mb-4">
      Confirm Submission
    </h3>
    <p className="text-gray-600 mb-6">
      Are you ready to submit your quiz? You won't be able to change your answers.
    </p>
    <div className="flex gap-3">
      <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg">
        Review Again
      </button>
      <button className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-semibold">
        Submit Quiz
      </button>
    </div>
  </div>
</div>
```

---

## Feedback & Notifications

### Success Toast

```jsx
<div className="
  fixed top-4 right-4 z-50
  bg-white rounded-lg shadow-lg
  p-4 pr-12
  border-l-4 border-green-500
  animate-slide-in
">
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <CheckCircleIcon className="w-6 h-6 text-green-500" />
    </div>
    <div className="ml-3">
      <p className="font-semibold text-gray-900">Quiz Created!</p>
      <p className="text-sm text-gray-600 mt-1">
        Your students can now take the quiz
      </p>
    </div>
  </div>
  <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
    <XIcon className="w-5 h-5" />
  </button>
</div>
```

### Inline Error State

```jsx
<div className="rounded-lg bg-red-50 border border-red-200 p-4">
  <div className="flex">
    <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
    <div className="ml-3">
      <p className="text-sm text-red-800">
        Oops! Please select at least one correct answer.
      </p>
    </div>
  </div>
</div>
```

---

## Mobile Patterns

### Swipeable Cards

```jsx
// Using touch events or a library like react-swipeable
<div className="overflow-hidden">
  <div
    className="flex transition-transform duration-300"
    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
  >
    {questions.map((question, index) => (
      <div key={index} className="w-full flex-shrink-0 p-4">
        <QuestionCard question={question} />
      </div>
    ))}
  </div>
  
  {/* Dots indicator */}
  <div className="flex justify-center gap-2 mt-4">
    {questions.map((_, index) => (
      <div
        key={index}
        className={`
          w-2 h-2 rounded-full transition-all duration-300
          ${index === currentIndex ? 'w-8 bg-blue-500' : 'bg-gray-300'}
        `}
      />
    ))}
  </div>
</div>
```

### Pull to Refresh

```jsx
<div className="relative">
  {isPulling && (
    <div className="absolute -top-12 left-0 right-0 flex justify-center">
      <div className="animate-spin">
        <RefreshIcon className="w-6 h-6 text-blue-500" />
      </div>
    </div>
  )}
  
  <div
    className="transition-transform"
    style={{ transform: `translateY(${pullDistance}px)` }}
  >
    {/* Content */}
  </div>
</div>
```

### Bottom Sheet

```jsx
<div className="
  fixed bottom-0 left-0 right-0 z-40
  bg-white rounded-t-2xl
  transform transition-transform duration-300
  ${isOpen ? 'translate-y-0' : 'translate-y-full'}
">
  {/* Handle bar */}
  <div className="flex justify-center pt-3 pb-2">
    <div className="w-12 h-1 bg-gray-300 rounded-full" />
  </div>
  
  <div className="p-6 max-h-[70vh] overflow-y-auto">
    {/* Content */}
  </div>
</div>
```

---

## Animation Classes

```css
/* Add to your global CSS */
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

---

## Best Practices Checklist

### Mobile Optimization
- ✅ Touch targets minimum 44x44px
- ✅ Bottom-anchored CTAs for thumb reach
- ✅ Swipe gestures for navigation
- ✅ Responsive text sizes
- ✅ Appropriate keyboard types for inputs

### Performance
- ✅ Skeleton loaders for perceived speed
- ✅ Optimistic UI updates
- ✅ Lazy load heavy content
- ✅ Debounce search inputs
- ✅ Virtual scrolling for long lists

### Accessibility
- ✅ Focus indicators on all interactive elements
- ✅ ARIA labels for icons
- ✅ Semantic HTML structure
- ✅ Color contrast WCAG AA compliant
- ✅ Keyboard navigation support

### User Experience
- ✅ Clear loading states
- ✅ Friendly error messages
- ✅ Success feedback
- ✅ Empty state guidance
- ✅ Progressive disclosure

---

*Remember: These patterns are starting points. Always test with real users and iterate based on feedback!*