"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import { 
  Brain, TrendingUp, TrendingDown, Target, Clock, Award, 
  AlertCircle, BookOpen, Zap, BarChart3, Users
} from "lucide-react";
import type { 
  Analytics, 
  AnalyticsResponse,
  BloomsTaxonomyAnalysis,
  DifficultyAnalysis,
  SkillGap,
  QuestionTypePerformance
} from "@/types/analytics";

interface ProgressInsightsProps {
  studentId?: string;
}

export default function ProgressInsights({ studentId }: ProgressInsightsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [studentId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/student/progress/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const data: AnalyticsResponse = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Analyzing your learning data...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription>
          {error || "Complete some quizzes to see your learning analytics!"}
        </AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#f59e0b', '#d97706', '#92400e', '#78350f', '#451a03'];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
            <Award className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.performanceMetrics.mean)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.performanceMetrics.trend === 'improving' && '↗️ Improving'}
              {analytics.performanceMetrics.trend === 'stable' && '→ Stable'}
              {analytics.performanceMetrics.trend === 'declining' && '↘️ Needs attention'}
            </p>
            <Progress value={analytics.performanceMetrics.mean} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Percentile Rank</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Top {100 - analytics.percentileRank}%</div>
            <p className="text-xs text-muted-foreground">
              Better than {analytics.percentileRank}% of students
            </p>
            <Progress value={analytics.percentileRank} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            <BarChart3 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{analytics.consistency.rating}</div>
            <p className="text-xs text-muted-foreground">
              σ = {analytics.consistency.standardDeviation}
            </p>
            <div className="mt-2 text-xs">
              Range: {analytics.consistency.scoreRange.min}-{analytics.consistency.scoreRange.max}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.timeEfficiency.efficiencyScore}</div>
            <p className="text-xs text-muted-foreground">
              Correct answers/minute
            </p>
            <Badge variant={analytics.timeEfficiency.speedTrend === 'faster' ? 'default' : 'secondary'} className="mt-2">
              {analytics.timeEfficiency.speedTrend}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      {(analytics.insights.length > 0 || analytics.recommendations.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {analytics.insights.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-600" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm">{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analytics.recommendations.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="blooms" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="blooms">Cognitive Skills</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
          <TabsTrigger value="learning">Learning Curve</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="blooms" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Bloom's Taxonomy Performance</CardTitle>
              <CardDescription>
                Your performance across different cognitive skill levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={analytics.bloomsTaxonomy}>
                  <PolarGrid stroke="#fed7aa" />
                  <PolarAngleAxis dataKey="level" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Accuracy %" dataKey="accuracy" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {analytics.bloomsTaxonomy.map((bloom) => (
                  <div key={bloom.level} className="flex items-center justify-between p-2 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-3">
                      <div className="capitalize font-medium">{bloom.level}</div>
                      <Badge variant={bloom.mastery === 'expert' ? 'default' : bloom.mastery === 'proficient' ? 'secondary' : 'outline'}>
                        {bloom.mastery}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {bloom.correctAnswers}/{bloom.totalQuestions} correct ({bloom.accuracy}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Performance by Difficulty</CardTitle>
              <CardDescription>
                How you perform on questions of varying difficulty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.difficultyLevels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accuracy" fill="#f59e0b" name="Accuracy %" />
                  <Bar dataKey="improvement" fill="#d97706" name="Improvement %" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 grid grid-cols-3 gap-4">
                {analytics.difficultyLevels.map((diff) => (
                  <div key={diff.level} className="text-center p-3 rounded-lg bg-amber-50">
                    <div className="font-medium capitalize">{diff.level}</div>
                    <div className="text-2xl font-bold text-amber-600">{diff.accuracy}%</div>
                    <div className="text-xs text-muted-foreground">
                      {diff.improvement > 0 ? '+' : ''}{diff.improvement}% improvement
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Learning Curve Analysis</CardTitle>
              <CardDescription>
                Your progress over recent quiz attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.learningCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                  <XAxis dataKey="attemptNumber" label={{ value: 'Attempt #', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="left" label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Efficiency', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="score" stroke="#f59e0b" name="Score" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#d97706" name="Efficiency" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 p-4 rounded-lg bg-amber-50">
                <h4 className="font-medium mb-2">Learning Efficiency Trend</h4>
                <p className="text-sm text-muted-foreground">
                  {analytics.learningCurve.length > 0 && (
                    <>
                      Latest efficiency: {analytics.learningCurve[analytics.learningCurve.length - 1].efficiency.toFixed(1)} points/minute
                      {analytics.timeEfficiency.speedTrend === 'faster' && ' - You\'re getting faster!'}
                      {analytics.timeEfficiency.speedTrend === 'slower' && ' - Take your time to maintain accuracy'}
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Knowledge Retention Analysis</CardTitle>
              <CardDescription>
                How well you retain information over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50">
                  <div>
                    <div className="font-medium">Current Retention Rate</div>
                    <div className="text-3xl font-bold text-amber-600">{analytics.knowledgeRetention.retentionRate}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Optimal Review In</div>
                    <div className="text-2xl font-bold">{analytics.knowledgeRetention.optimalReviewTime} days</div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.knowledgeRetention.forgettingCurve.map((value, index) => ({
                    day: index,
                    retention: value
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
                    <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="retention" stroke="#f59e0b" fill="#fed7aa" />
                  </AreaChart>
                </ResponsiveContainer>

                <Alert className="border-amber-200 bg-amber-50">
                  <BookOpen className="h-4 w-4" />
                  <AlertDescription>
                    Based on the Ebbinghaus forgetting curve, regular review every {analytics.knowledgeRetention.optimalReviewTime} days 
                    will help maintain your knowledge retention above 80%.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle>Performance by Question Category</CardTitle>
              <CardDescription>
                Identify your strengths and areas for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.questionTypePerformance && analytics.questionTypePerformance.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.questionTypePerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.category}: ${entry.accuracy}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="accuracy"
                      >
                        {analytics.questionTypePerformance.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="mt-4 space-y-2">
                    {analytics.questionTypePerformance.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{cat.category}</div>
                          <Badge 
                            variant={cat.strength === 'strong' ? 'default' : cat.strength === 'moderate' ? 'secondary' : 'destructive'}
                          >
                            {cat.strength}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {cat.correctAnswers}/{cat.totalQuestions} ({cat.accuracy}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground">No category data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Skill Gaps */}
      {analytics.skillGaps && analytics.skillGaps.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-600" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>
              Areas that need the most attention to reach target proficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.skillGaps.map((gap, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{gap.skill}</span>
                    <span className="text-sm text-muted-foreground">
                      Gap: {gap.gap}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={gap.currentLevel} className="flex-1" />
                    <span className="text-xs w-12 text-right">{gap.currentLevel}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{gap.recommendedFocus}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}