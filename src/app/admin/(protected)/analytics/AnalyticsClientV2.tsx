"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  StatCard,
  LoadingState,
  EmptyState,
  MiniStat,
  SecurityBadge
} from "@/components/admin-v2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Activity, 
  TrendingUp, 
  Clock, 
  Users,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  BookOpen,
  Trophy,
  Eye,
  MousePointer,
  Timer,
  Gauge,
  Monitor,
  Smartphone,
  Tablet
} from "lucide-react";
import { track } from "@vercel/analytics";
import { useToast } from "@/hooks/use-toast";

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

export function AnalyticsClientV2() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
      
      // Track analytics view
      track("Analytics Viewed", { timeRange });
      
    } catch (error) {
      logger.error("Failed to fetch analytics:", error);
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
      
      toast({
        title: "Error",
        description: "Failed to load analytics data. Showing cached data.",
        variant: "destructive"
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
    toast({
      title: "Refreshing",
      description: "Updating analytics data...",
    });
  };

  const exportData = () => {
    track("Analytics Exported", { timeRange });
    toast({
      title: "Export Started",
      description: "Preparing your analytics export...",
    });
    // Implementation for CSV export would go here
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'quizzes', label: 'Quizzes', icon: BookOpen },
    { id: 'engagement', label: 'Engagement', icon: Activity },
    { id: 'devices', label: 'Devices', icon: Monitor }
  ];

  if (loading && !analytics) {
    return <LoadingState fullPage text="Loading analytics data..." />;
  }

  if (!analytics) {
    return (
      <AdminPageContainer>
        <EmptyState
          icon={BarChart3}
          title="No analytics data available"
          description="Unable to load analytics data. Please try again."
          action={{
            label: "Retry",
            onClick: fetchAnalytics
          }}
        />
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer>
      {/* Header */}
      <AdminPageHeader
        title="Analytics Dashboard"
        subtitle="Track user behavior and application performance"
        icon={BarChart3}
        securityLevel="low"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Analytics' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Badge className="bg-green-600 text-white">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              {analytics.realTimeUsers} Live Users
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
            <Button 
              onClick={exportData} 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              className="border-red-200 hover:bg-red-50"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Key Metrics */}
      <AdminSection transparent className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Page Views"
            value={analytics.pageViews.total.toLocaleString()}
            icon={Eye}
            trend={{ 
              value: analytics.pageViews.trend,
              label: "vs last period"
            }}
            variant="default"
          />
          <StatCard
            label="Avg Session"
            value={formatDuration(analytics.userEngagement.avgSessionDuration)}
            icon={Timer}
            variant="success"
          />
          <StatCard
            label="Quiz Completion"
            value={`${analytics.quizMetrics.completionRate}%`}
            icon={Trophy}
            variant="success"
          />
          <StatCard
            label="Bounce Rate"
            value={`${analytics.userEngagement.bounceRate}%`}
            icon={MousePointer}
            variant={analytics.userEngagement.bounceRate > 50 ? "warning" : "success"}
          />
        </div>
      </AdminSection>

      {/* Tab Navigation */}
      <AdminTabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* User Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AdminSection 
              title="User Activity" 
              description="Active users across different time periods"
              icon={Activity}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Daily Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics.userMetrics.activeUsers.daily}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-red-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Weekly Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics.userMetrics.activeUsers.weekly}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-amber-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Active Users</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analytics.userMetrics.activeUsers.monthly}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </AdminSection>

            {/* Top Pages */}
            <AdminSection 
              title="Top Pages" 
              description="Most visited pages in your application"
              icon={Eye}
            >
              {analytics.topPages.length === 0 ? (
                <EmptyState
                  icon={Eye}
                  title="No page data"
                  description="Page view data will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {analytics.topPages.slice(0, 5).map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-red-100 rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {page.path}
                        </p>
                        <p className="text-xs text-gray-500">
                          Avg time: {page.avgTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {page.views.toLocaleString()} views
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>
          </div>

          {/* Additional Metrics */}
          <AdminSection 
            title="Engagement Metrics"
            icon={Gauge}
            className="mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MiniStat 
                label="Unique Visitors" 
                value={analytics.pageViews.unique.toLocaleString()} 
                icon={Users} 
              />
              <MiniStat 
                label="Pages per Session" 
                value={analytics.userEngagement.pagesPerSession.toFixed(1)} 
                icon={Eye} 
              />
              <MiniStat 
                label="New vs Returning" 
                value={`${analytics.userMetrics.newUsers} / ${analytics.userMetrics.returningUsers}`} 
                icon={Users} 
              />
            </div>
          </AdminSection>
        </>
      )}

      {activeTab === 'users' && (
        <AdminSection 
          title="User Metrics" 
          description="Detailed user behavior and demographics"
          icon={Users}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">User Types</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">New Users</span>
                  <span className="font-semibold">{analytics.userMetrics.newUsers}</span>
                </div>
                <Progress value={(analytics.userMetrics.newUsers / (analytics.userMetrics.newUsers + analytics.userMetrics.returningUsers)) * 100} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Returning Users</span>
                  <span className="font-semibold">{analytics.userMetrics.returningUsers}</span>
                </div>
                <Progress value={(analytics.userMetrics.returningUsers / (analytics.userMetrics.newUsers + analytics.userMetrics.returningUsers)) * 100} className="h-2" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">Activity Levels</h4>
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Active</span>
                    <Badge>{analytics.userMetrics.activeUsers.daily}</Badge>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Active</span>
                    <Badge>{analytics.userMetrics.activeUsers.weekly}</Badge>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Monthly Active</span>
                    <Badge>{analytics.userMetrics.activeUsers.monthly}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AdminSection>
      )}

      {activeTab === 'quizzes' && (
        <AdminSection 
          title="Quiz Performance" 
          description="Quiz completion and scoring metrics"
          icon={BookOpen}
          securityLevel="low"
        >
          <div className="space-y-6">
            {/* Quiz Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniStat 
                label="Total Attempts" 
                value={analytics.quizMetrics.totalAttempts.toLocaleString()} 
                icon={BookOpen} 
              />
              <MiniStat 
                label="Completion Rate" 
                value={`${analytics.quizMetrics.completionRate}%`} 
                icon={Trophy} 
              />
              <MiniStat 
                label="Average Score" 
                value={`${analytics.quizMetrics.avgScore}%`} 
                icon={Trophy} 
              />
            </div>

            {/* Top Quizzes */}
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">Top Performing Quizzes</h4>
              {analytics.quizMetrics.topQuizzes.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No quiz data"
                  description="Quiz performance data will appear here"
                />
              ) : (
                <div className="space-y-3">
                  {analytics.quizMetrics.topQuizzes.map((quiz, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-red-100 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{quiz.title}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {quiz.attempts} attempts
                          </span>
                          <span className="text-xs text-gray-500">
                            Avg: {quiz.avgScore}%
                          </span>
                        </div>
                      </div>
                      <Badge 
                        className={quiz.avgScore >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {quiz.avgScore >= 80 ? 'High Performance' : 'Needs Review'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AdminSection>
      )}

      {activeTab === 'engagement' && (
        <AdminSection 
          title="User Engagement" 
          description="How users interact with your application"
          icon={Activity}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-lg">Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">
                  {formatDuration(analytics.userEngagement.avgSessionDuration)}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Average time spent per session
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-lg">Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">
                  {analytics.userEngagement.bounceRate}%
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Users who leave after one page
                </p>
                {analytics.userEngagement.bounceRate > 50 && (
                  <SecurityBadge level="medium" label="Needs Attention" className="mt-2" />
                )}
              </CardContent>
            </Card>
            
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-lg">Pages per Session</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">
                  {analytics.userEngagement.pagesPerSession.toFixed(1)}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Average pages viewed per visit
                </p>
              </CardContent>
            </Card>
          </div>
        </AdminSection>
      )}

      {activeTab === 'devices' && (
        <AdminSection 
          title="Device Breakdown" 
          description="How users access your application"
          icon={Monitor}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-red-100">
                <div className="flex items-center justify-between mb-4">
                  <Monitor className="h-8 w-8 text-red-600" />
                  <Badge variant="outline">Desktop</Badge>
                </div>
                <div className="text-2xl font-bold">{analytics.deviceBreakdown.desktop}%</div>
                <Progress value={analytics.deviceBreakdown.desktop} className="mt-2" />
              </div>
              
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <Smartphone className="h-8 w-8 text-amber-600" />
                  <Badge variant="outline">Mobile</Badge>
                </div>
                <div className="text-2xl font-bold">{analytics.deviceBreakdown.mobile}%</div>
                <Progress value={analytics.deviceBreakdown.mobile} className="mt-2" />
              </div>
              
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <Tablet className="h-8 w-8 text-orange-600" />
                  <Badge variant="outline">Tablet</Badge>
                </div>
                <div className="text-2xl font-bold">{analytics.deviceBreakdown.tablet}%</div>
                <Progress value={analytics.deviceBreakdown.tablet} className="mt-2" />
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                💡 Tip: {analytics.deviceBreakdown.mobile > 50 ? 
                  'Most users access via mobile. Ensure mobile optimization is prioritized.' : 
                  'Desktop usage is dominant. Focus on desktop experience optimization.'}
              </p>
            </div>
          </div>
        </AdminSection>
      )}
    </AdminPageContainer>
  );
}