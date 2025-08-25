"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Users,
  FileText,
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  Target,
  Trophy,
  Eye,
  MousePointer,
  Timer,
  Gauge
} from "lucide-react";
import { track } from "@vercel/analytics";

interface AnalyticsData {
  pageViews: {
    total: number;
    unique: number;
    trend: number;
  };
  userEngagement: {
    avgSessionDuration: number;
    bounceRate: number;
    pagesPerSession: number;
  };
  quizMetrics: {
    totalAttempts: number;
    completionRate: number;
    avgScore: number;
    topQuizzes: Array<{
      title: string;
      attempts: number;
      avgScore: number;
    }>;
  };
  userMetrics: {
    newUsers: number;
    returningUsers: number;
    activeUsers: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    avgTime: string;
  }>;
  realTimeUsers: number;
}

export function AnalyticsClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch real analytics data from API
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
      
      // Track analytics view
      track("Analytics Viewed", { timeRange });
      
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Set empty/zero data on error
      setAnalytics({
        pageViews: {
          total: 0,
          unique: 0,
          trend: 0
        },
        userEngagement: {
          avgSessionDuration: 0,
          bounceRate: 0,
          pagesPerSession: 0
        },
        quizMetrics: {
          totalAttempts: 0,
          completionRate: 0,
          avgScore: 0,
          topQuizzes: []
        },
        userMetrics: {
          newUsers: 0,
          returningUsers: 0,
          activeUsers: {
            daily: 0,
            weekly: 0,
            monthly: 0
          }
        },
        deviceBreakdown: {
          desktop: 0,
          mobile: 0,
          tablet: 0
        },
        topPages: [],
        realTimeUsers: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const exportData = () => {
    track("Analytics Exported", { timeRange });
    // Implementation for CSV export would go here
    alert("Export functionality coming soon!");
  };

  if (loading && !analytics) {
    return <BiblicalPageLoader text="Loading analytics..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/dashboard')}
                className="mb-4 text-amber-700 hover:text-amber-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Track user behavior and application performance</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500">
                <Activity className="h-3 w-3 mr-1" />
                {analytics?.realTimeUsers || 0} Live Users
              </Badge>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportData} variant="outline" className="border-amber-300 hover:bg-amber-50">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleRefresh} variant="outline" className="border-amber-300 hover:bg-amber-50">
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Page Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{analytics.pageViews.total.toLocaleString()}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {analytics.pageViews.trend}%
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {analytics.pageViews.unique.toLocaleString()} unique visitors
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Session Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {Math.floor(analytics.userEngagement.avgSessionDuration / 60)}:{(analytics.userEngagement.avgSessionDuration % 60).toString().padStart(2, '0')}
                    </span>
                    <Timer className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {analytics.userEngagement.pagesPerSession.toFixed(1)} pages/session
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Quiz Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{analytics.quizMetrics.completionRate}%</span>
                    <Trophy className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Avg score: {analytics.quizMetrics.avgScore}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Bounce Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{analytics.userEngagement.bounceRate}%</span>
                    <MousePointer className="h-8 w-8 text-amber-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Lower is better
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* User Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Active users across different time periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Daily Active Users</p>
                        <p className="text-2xl font-bold">{analytics.userMetrics.activeUsers.daily}</p>
                      </div>
                      <Activity className="h-8 w-8 text-amber-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Weekly Active Users</p>
                        <p className="text-2xl font-bold">{analytics.userMetrics.activeUsers.weekly}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">Monthly Active Users</p>
                        <p className="text-2xl font-bold">{analytics.userMetrics.activeUsers.monthly}</p>
                      </div>
                      <Users className="h-8 w-8 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                  <CardDescription>User distribution across device types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Desktop</span>
                        <span className="text-sm font-medium">{analytics.deviceBreakdown.desktop}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full"
                          style={{ width: `${analytics.deviceBreakdown.desktop}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Mobile</span>
                        <span className="text-sm font-medium">{analytics.deviceBreakdown.mobile}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full"
                          style={{ width: `${analytics.deviceBreakdown.mobile}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Tablet</span>
                        <span className="text-sm font-medium">{analytics.deviceBreakdown.tablet}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full"
                          style={{ width: `${analytics.deviceBreakdown.tablet}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                  <CardDescription>Most visited pages in your application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topPages.map((page, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{page.path}</p>
                            <p className="text-xs text-gray-500">Avg time: {page.avgTime}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{page.views.toLocaleString()} views</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Quizzes</CardTitle>
                  <CardDescription>Most attempted quizzes by students</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.quizMetrics.topQuizzes.map((quiz, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-amber-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{quiz.title}</p>
                            <p className="text-xs text-gray-500">Avg score: {quiz.avgScore}%</p>
                          </div>
                        </div>
                        <Badge variant="outline">{quiz.attempts} attempts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Types */}
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>New vs returning users over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{analytics.userMetrics.newUsers}</p>
                    <p className="text-sm text-gray-600 mt-1">New Users</p>
                  </div>
                  <div className="h-20 w-px bg-gray-300" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{analytics.userMetrics.returningUsers}</p>
                    <p className="text-sm text-gray-600 mt-1">Returning Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}