import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts, questionResponses, questions, quizzes, enrollments } from "@/lib/schema";
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type {
  PerformanceMetrics,
  BloomsTaxonomyAnalysis,
  DifficultyAnalysis,
  LearningCurveData,
  KnowledgeRetention,
  SkillGap,
  TimeEfficiency,
  Consistency,
  QuestionTypePerformance,
  Analytics,
  AnalyticsResponse
} from "@/types/analytics";

/**
 * Advanced Student Progress Analytics API
 * Provides comprehensive educational insights using internationally accepted metrics
 */

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all quiz attempts with responses and question details
    const attempts = await db
      .select({
        attemptId: quizAttempts.id,
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        timeSpent: quizAttempts.timeSpent,
        startTime: quizAttempts.startTime,
        endTime: quizAttempts.endTime,
        status: quizAttempts.status,
        quizTitle: quizzes.title,
        totalQuestions: quizzes.totalQuestions,
      })
      .from(quizAttempts)
      .leftJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
      .where(
        and(
          eq(quizAttempts.studentId, userId),
          eq(quizAttempts.status, 'completed')
        )
      )
      .orderBy(desc(quizAttempts.endTime));

    if (attempts.length === 0) {
      const response: AnalyticsResponse = {
        analytics: null,
        message: "No completed quizzes yet"
      };
      return NextResponse.json(response);
    }

    // Fetch all question responses with question metadata
    const attemptIds = attempts.map(a => a.attemptId);
    const responses = await db
      .select({
        attemptId: questionResponses.attemptId,
        questionId: questionResponses.questionId,
        selectedAnswer: questionResponses.selectedAnswer,
        isCorrect: questionResponses.isCorrect,
        timeSpent: questionResponses.timeSpent,
        bloomsLevel: questions.bloomsLevel,
        difficulty: questions.difficulty,
        questionText: questions.questionText,
      })
      .from(questionResponses)
      .innerJoin(questions, eq(questionResponses.questionId, questions.id))
      .where(inArray(questionResponses.attemptId, attemptIds));

    // 1. Calculate Performance Metrics
    const scores = attempts.map(a => a.score || 0);
    const performanceMetrics: PerformanceMetrics = calculatePerformanceMetrics(scores);

    // 2. Bloom's Taxonomy Analysis
    const bloomsAnalysis = calculateBloomsTaxonomyAnalysis(responses);

    // 3. Difficulty Level Analysis
    const difficultyAnalysis = calculateDifficultyAnalysis(responses, attempts);

    // 4. Learning Curve Analysis
    const learningCurve = calculateLearningCurve(attempts);

    // 5. Knowledge Retention Analysis
    const retentionAnalysis = calculateKnowledgeRetention(attempts);

    // 6. Time Efficiency Metrics
    const timeEfficiency = calculateTimeEfficiency(attempts, responses);

    // 7. Skill Gap Analysis
    const skillGaps = identifySkillGaps(bloomsAnalysis);

    // 8. Consistency Analysis
    const consistency = calculateConsistency(attempts);

    // 9. Question Type Performance
    const questionTypePerformance = analyzeQuestionTypes(responses);

    // 10. Percentile Ranking (mock - would need all students' data)
    const percentileRank = calculatePercentileRank(performanceMetrics.mean);

    const analytics: Analytics = {
      performanceMetrics,
      bloomsTaxonomy: bloomsAnalysis,
      difficultyLevels: difficultyAnalysis,
      learningCurve,
      knowledgeRetention: retentionAnalysis,
      timeEfficiency,
      skillGaps,
      consistency,
      questionTypePerformance,
      percentileRank,
      insights: generateInsights(
        performanceMetrics,
        bloomsAnalysis,
        difficultyAnalysis,
        learningCurve,
        consistency
      ),
      recommendations: generateRecommendations(
        skillGaps,
        bloomsAnalysis,
        difficultyAnalysis,
        retentionAnalysis
      )
    };

    const response: AnalyticsResponse = { analytics };
    return NextResponse.json(response);

  } catch (error) {
    logger.error("Error fetching advanced analytics:", error);
    const response: AnalyticsResponse = {
      analytics: null,
      error: "Failed to fetch analytics"
    };
    return NextResponse.json(response, { status: 500 });
  }
}

function calculatePerformanceMetrics(scores: number[]): PerformanceMetrics {
  if (scores.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, percentile: 0, trend: 'stable' };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Calculate trend (comparing recent vs older scores)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (scores.length >= 3) {
    const recentAvg = scores.slice(0, Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
    const olderAvg = scores.slice(Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
    
    if (recentAvg > olderAvg + 5) trend = 'improving';
    else if (recentAvg < olderAvg - 5) trend = 'declining';
  }

  // Mock percentile (would need comparison with other students)
  const percentile = Math.min(99, Math.max(1, Math.round(mean * 0.9 + 10)));

  return { mean, median, stdDev, percentile, trend };
}

function calculateBloomsTaxonomyAnalysis(responses: any[]): BloomsTaxonomyAnalysis[] {
  const bloomsLevels = ['knowledge', 'comprehension', 'application', 'analysis', 'synthesis', 'evaluation'];
  const analysis: BloomsTaxonomyAnalysis[] = [];

  for (const level of bloomsLevels) {
    const levelResponses = responses.filter(r => r.bloomsLevel === level);
    
    if (levelResponses.length === 0) continue;

    const correct = levelResponses.filter(r => r.isCorrect).length;
    const accuracy = (correct / levelResponses.length) * 100;
    const avgTime = levelResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / levelResponses.length;

    // Determine mastery level
    let mastery: 'expert' | 'proficient' | 'developing' | 'beginner';
    if (accuracy >= 90) mastery = 'expert';
    else if (accuracy >= 75) mastery = 'proficient';
    else if (accuracy >= 60) mastery = 'developing';
    else mastery = 'beginner';

    analysis.push({
      level,
      totalQuestions: levelResponses.length,
      correctAnswers: correct,
      accuracy: Math.round(accuracy),
      timeEfficiency: Math.round(avgTime),
      mastery
    });
  }

  return analysis;
}

function calculateDifficultyAnalysis(responses: any[], attempts: any[]): DifficultyAnalysis[] {
  const difficulties = ['easy', 'intermediate', 'hard'];
  const analysis: DifficultyAnalysis[] = [];

  for (const level of difficulties) {
    const levelResponses = responses.filter(r => r.difficulty === level);
    
    if (levelResponses.length === 0) continue;

    const correct = levelResponses.filter(r => r.isCorrect).length;
    const accuracy = (correct / levelResponses.length) * 100;
    const avgTime = levelResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / levelResponses.length;

    // Calculate improvement over time
    let improvement = 0;
    if (levelResponses.length >= 2) {
      const firstHalf = levelResponses.slice(0, Math.floor(levelResponses.length / 2));
      const secondHalf = levelResponses.slice(Math.floor(levelResponses.length / 2));
      
      // Only calculate accuracy if halves have content
      const firstAccuracy = firstHalf.length > 0 
        ? firstHalf.filter(r => r.isCorrect).length / firstHalf.length * 100 
        : 0;
      const secondAccuracy = secondHalf.length > 0 
        ? secondHalf.filter(r => r.isCorrect).length / secondHalf.length * 100 
        : 0;
      improvement = secondAccuracy - firstAccuracy;
    }

    analysis.push({
      level,
      totalQuestions: levelResponses.length,
      correctAnswers: correct,
      accuracy: Math.round(accuracy),
      averageTime: Math.round(avgTime),
      improvement: Math.round(improvement)
    });
  }

  return analysis;
}

function calculateLearningCurve(attempts: any[]): LearningCurveData[] {
  return attempts.slice(0, 10).reverse().map((attempt, index) => ({
    attemptNumber: index + 1,
    score: attempt.score || 0,
    timeSpent: Math.round((attempt.timeSpent || 0) / 60), // Convert to minutes
    efficiency: attempt.timeSpent ? (attempt.score || 0) / (attempt.timeSpent / 60) : 0,
    date: attempt.endTime ? new Date(attempt.endTime).toISOString().split('T')[0] : ''
  }));
}

function calculateKnowledgeRetention(attempts: any[]): KnowledgeRetention {
  // Filter attempts to only include those with valid endTime
  const validAttempts = attempts.filter(a => a.endTime);
  
  if (validAttempts.length < 2) {
    return {
      initialScore: 0,
      retentionRate: 100,
      forgettingCurve: [],
      optimalReviewTime: 7
    };
  }

  // Simplified Ebbinghaus forgetting curve calculation
  const initialScore = validAttempts[validAttempts.length - 1].score || 0;
  const currentScore = validAttempts[0].score || 0;
  
  // Calculate days between with null safety
  let daysBetween = 0;
  if (validAttempts[0].endTime && validAttempts[validAttempts.length - 1].endTime) {
    daysBetween = Math.floor(
      (new Date(validAttempts[0].endTime).getTime() - new Date(validAttempts[validAttempts.length - 1].endTime).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
  }

  const retentionRate = initialScore > 0 ? (currentScore / initialScore) * 100 : 100;
  
  // Generate forgetting curve (mock data based on Ebbinghaus)
  const forgettingCurve = [100, 85, 70, 60, 55, 50, 45];
  
  // Optimal review time based on retention rate
  let optimalReviewTime = 7;
  if (retentionRate >= 90) optimalReviewTime = 14;
  else if (retentionRate >= 80) optimalReviewTime = 10;
  else if (retentionRate >= 70) optimalReviewTime = 7;
  else optimalReviewTime = 3;

  return {
    initialScore,
    retentionRate: Math.round(retentionRate),
    forgettingCurve,
    optimalReviewTime
  };
}

function calculateTimeEfficiency(attempts: any[], responses: any[]): TimeEfficiency {
  const totalTime = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
  const totalQuestions = responses.length;
  const correctAnswers = responses.filter(r => r.isCorrect).length;
  
  const avgTimePerQuestion = totalQuestions > 0 ? totalTime / totalQuestions : 0;
  const avgTimePerCorrectAnswer = correctAnswers > 0 ? totalTime / correctAnswers : 0;
  
  // Time efficiency score (correct answers per minute)
  const efficiencyScore = totalTime > 0 ? (correctAnswers / (totalTime / 60)) : 0;

  return {
    totalTimeSpent: Math.round(totalTime / 60), // in minutes
    avgTimePerQuestion: Math.round(avgTimePerQuestion),
    avgTimePerCorrectAnswer: Math.round(avgTimePerCorrectAnswer),
    efficiencyScore: Math.round(efficiencyScore * 10) / 10,
    speedTrend: calculateSpeedTrend(attempts)
  };
}

function calculateSpeedTrend(attempts: any[]): 'faster' | 'stable' | 'slower' {
  if (attempts.length < 3) return 'stable';
  
  const recentSpeed = attempts.slice(0, 3).reduce((sum, a) => {
    return sum + ((a.timeSpent || 0) / (a.totalQuestions || 1));
  }, 0) / 3;
  
  const olderSpeed = attempts.slice(-3).reduce((sum, a) => {
    return sum + ((a.timeSpent || 0) / (a.totalQuestions || 1));
  }, 0) / 3;
  
  if (recentSpeed < olderSpeed * 0.9) return 'faster';
  if (recentSpeed > olderSpeed * 1.1) return 'slower';
  return 'stable';
}

function identifySkillGaps(bloomsAnalysis: BloomsTaxonomyAnalysis[]): SkillGap[] {
  const gaps: SkillGap[] = [];
  
  // Identify gaps based on Bloom's taxonomy performance
  for (const bloom of bloomsAnalysis) {
    if (bloom.accuracy < 70) {
      gaps.push({
        skill: bloom.level.charAt(0).toUpperCase() + bloom.level.slice(1),
        currentLevel: bloom.accuracy,
        targetLevel: 80,
        gap: 80 - bloom.accuracy,
        recommendedFocus: getBloomRecommendation(bloom.level)
      });
    }
  }


  return gaps.sort((a, b) => b.gap - a.gap).slice(0, 5); // Top 5 gaps
}

function getBloomRecommendation(level: string): string {
  const recommendations: Record<string, string> = {
    knowledge: "Focus on memorization techniques and flashcards",
    comprehension: "Practice explaining concepts in your own words",
    application: "Work on real-world problem solving exercises",
    analysis: "Break down complex problems into components",
    synthesis: "Practice combining ideas to create solutions",
    evaluation: "Develop critical thinking through debates and discussions"
  };
  
  return recommendations[level] || "Continue practicing";
}

function calculateConsistency(attempts: any[]): Consistency {
  const scores = attempts.map(a => a.score || 0);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

  // Consistency rating
  let rating: 'highly consistent' | 'consistent' | 'variable' | 'inconsistent';
  if (coefficientOfVariation < 10) rating = 'highly consistent';
  else if (coefficientOfVariation < 20) rating = 'consistent';
  else if (coefficientOfVariation < 30) rating = 'variable';
  else rating = 'inconsistent';

  return {
    standardDeviation: Math.round(stdDev),
    coefficientOfVariation: Math.round(coefficientOfVariation),
    rating,
    scoreRange: {
      min: Math.min(...scores),
      max: Math.max(...scores)
    }
  };
}

function analyzeQuestionTypes(responses: any[]): QuestionTypePerformance[] {
  // Since we don't have categories, analyze by difficulty and Bloom's level instead
  const difficultyGroups = ['easy', 'intermediate', 'hard'];
  
  const results: QuestionTypePerformance[] = [];
  
  for (const difficulty of difficultyGroups) {
    const diffResponses = responses.filter(r => r.difficulty === difficulty);
    if (diffResponses.length === 0) continue;
    
    const correct = diffResponses.filter(r => r.isCorrect).length;
    const accuracy = (correct / diffResponses.length) * 100;
    const avgTime = diffResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / diffResponses.length;
    
    results.push({
      category: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Questions`,
      totalQuestions: diffResponses.length,
      correctAnswers: correct,
      accuracy: Math.round(accuracy),
      averageTime: Math.round(avgTime),
      strength: accuracy >= 80 ? 'strong' : accuracy >= 60 ? 'moderate' : 'needs improvement'
    });
  }
  
  return results.sort((a, b) => b.accuracy - a.accuracy);
}

function calculatePercentileRank(meanScore: number): number {
  // This would normally compare against all students
  // For now, using a mock calculation
  return Math.min(99, Math.max(1, Math.round(meanScore * 0.9 + 10)));
}

function generateInsights(
  performance: PerformanceMetrics,
  blooms: BloomsTaxonomyAnalysis[],
  difficulty: DifficultyAnalysis[],
  learningCurve: LearningCurveData[],
  consistency: any
): string[] {
  const insights: string[] = [];

  // Performance trend insight
  if (performance.trend === 'improving') {
    insights.push("📈 Your performance is steadily improving! Keep up the great work.");
  } else if (performance.trend === 'declining') {
    insights.push("📉 Your recent scores show a decline. Consider reviewing earlier material.");
  }

  // Bloom's taxonomy insight
  const weakestBloom = blooms.sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakestBloom && weakestBloom.accuracy < 70) {
    insights.push(`🎯 Focus on ${weakestBloom.level} questions - currently at ${weakestBloom.accuracy}% accuracy.`);
  }

  // Difficulty progression insight
  const hardQuestions = difficulty.find(d => d.level === 'hard');
  if (hardQuestions && hardQuestions.accuracy > 70) {
    insights.push("💪 Excellent performance on hard questions! You're ready for advanced challenges.");
  }

  // Consistency insight
  if (consistency.rating === 'highly consistent') {
    insights.push("⭐ Your performance is highly consistent, showing reliable knowledge retention.");
  } else if (consistency.rating === 'inconsistent') {
    insights.push("🔄 Your scores vary significantly. Focus on consistent study habits.");
  }

  // Learning efficiency
  if (learningCurve.length > 3) {
    const recentEfficiency = learningCurve.slice(-3).reduce((sum, l) => sum + l.efficiency, 0) / 3;
    if (recentEfficiency > 2) {
      insights.push("⚡ You're learning efficiently - high scores with optimal time usage!");
    }
  }

  return insights;
}

function generateRecommendations(
  skillGaps: SkillGap[],
  blooms: BloomsTaxonomyAnalysis[],
  difficulty: DifficultyAnalysis[],
  retention: KnowledgeRetention
): string[] {
  const recommendations: string[] = [];

  // Top skill gap recommendation
  if (skillGaps.length > 0) {
    recommendations.push(`📚 Priority: ${skillGaps[0].recommendedFocus}`);
  }

  // Difficulty progression recommendation
  const easyPerf = difficulty.find(d => d.level === 'easy');
  const hardPerf = difficulty.find(d => d.level === 'hard');
  
  if (easyPerf && easyPerf.accuracy > 90 && (!hardPerf || hardPerf.accuracy < 60)) {
    recommendations.push("🎯 You've mastered easy questions. Challenge yourself with more difficult content.");
  }

  // Retention recommendation
  if (retention.retentionRate < 70) {
    recommendations.push(`🔄 Schedule review sessions every ${retention.optimalReviewTime} days to improve retention.`);
  }

  // Bloom's progression recommendation
  const lowerBloomsAvg = blooms
    .filter(b => ['knowledge', 'comprehension'].includes(b.level))
    .reduce((sum, b) => sum + b.accuracy, 0) / 2;
  
  const higherBloomsAvg = blooms
    .filter(b => ['analysis', 'synthesis', 'evaluation'].includes(b.level))
    .reduce((sum, b) => sum + b.accuracy, 0) / 3;
  
  if (lowerBloomsAvg > 80 && higherBloomsAvg < 60) {
    recommendations.push("🧠 Strong foundation! Now focus on higher-order thinking skills.");
  }

  // Time management recommendation
  const avgTimePerQ = blooms.reduce((sum, b) => sum + b.timeEfficiency, 0) / blooms.length;
  if (avgTimePerQ > 120) {
    recommendations.push("⏱️ Practice time management - aim for 90 seconds per question.");
  }

  return recommendations;
}