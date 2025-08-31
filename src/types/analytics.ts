/**
 * Type definitions for student learning analytics
 */

export interface PerformanceMetrics {
  mean: number;
  median: number;
  stdDev: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface BloomsTaxonomyAnalysis {
  level: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeEfficiency: number;
  mastery: 'expert' | 'proficient' | 'developing' | 'beginner';
}

export interface DifficultyAnalysis {
  level: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  improvement: number;
}

export interface LearningCurveData {
  attemptNumber: number;
  score: number;
  timeSpent: number;
  efficiency: number;
  date: string;
}

export interface KnowledgeRetention {
  initialScore: number;
  retentionRate: number;
  forgettingCurve: number[];
  optimalReviewTime: number;
}

export interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  recommendedFocus: string;
}

export interface TimeEfficiency {
  totalTimeSpent: number;
  avgTimePerQuestion: number;
  avgTimePerCorrectAnswer: number;
  efficiencyScore: number;
  speedTrend: 'faster' | 'stable' | 'slower';
}

export interface Consistency {
  standardDeviation: number;
  coefficientOfVariation: number;
  rating: 'highly consistent' | 'consistent' | 'variable' | 'inconsistent';
  scoreRange: {
    min: number;
    max: number;
  };
}

export interface QuestionTypePerformance {
  category: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  strength: 'strong' | 'moderate' | 'needs improvement';
}

export interface Analytics {
  performanceMetrics: PerformanceMetrics;
  bloomsTaxonomy: BloomsTaxonomyAnalysis[];
  difficultyLevels: DifficultyAnalysis[];
  learningCurve: LearningCurveData[];
  knowledgeRetention: KnowledgeRetention;
  timeEfficiency: TimeEfficiency;
  skillGaps: SkillGap[];
  consistency: Consistency;
  questionTypePerformance: QuestionTypePerformance[];
  percentileRank: number;
  insights: string[];
  recommendations: string[];
}

export interface AnalyticsResponse {
  analytics: Analytics | null;
  message?: string;
  error?: string;
}