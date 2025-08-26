/**
 * Utility functions for quiz operations
 */

/**
 * Fisher-Yates shuffle algorithm for randomizing array elements
 * Creates a new shuffled array without modifying the original
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle quiz options while maintaining correct answer reference
 * Returns a new options array with randomized order
 */
export function shuffleQuizOptions(options: Array<{ text: string; id: string }>) {
  return shuffleArray(options);
}

/**
 * Check if options are already well distributed (correct answer not always at position A)
 * Returns true if the correct answer position varies across questions
 */
export function checkOptionsDistribution(
  questions: Array<{
    options: Array<{ id: string }>;
    correctAnswer: string;
  }>
): { isWellDistributed: boolean; positionCounts: Record<string, number> } {
  const positionCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  
  questions.forEach(question => {
    const correctIndex = question.options.findIndex(opt => opt.id === question.correctAnswer);
    if (correctIndex >= 0 && correctIndex < 4) {
      const position = String.fromCharCode(65 + correctIndex); // A, B, C, D
      positionCounts[position]++;
    }
  });
  
  // Check if any position has more than 50% of correct answers
  const total = questions.length;
  const isWellDistributed = Object.values(positionCounts).every(
    count => count <= total * 0.5
  );
  
  return { isWellDistributed, positionCounts };
}

/**
 * Shuffle all questions' options in a quiz for better distribution
 */
export function shuffleAllQuestionOptions<T extends { options: Array<{ text: string; id: string }> }>(
  questions: T[]
): T[] {
  return questions.map(question => ({
    ...question,
    options: shuffleQuizOptions(question.options)
  }));
}