"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Trophy,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Award,
} from "lucide-react";
import { 
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState,
  TabNavigation
} from "@/components/educator-v2";
import { logger } from "@/lib/logger";

interface QuizAttempt {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
  timeSpent: number;
  status: string;
}

interface StudentDetail {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  joinedAt: string;
  totalEnrollments: number;
  completedQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  recentAttempts: QuizAttempt[];
  performanceByTopic: Record<string, { total: number; correct: number; percentage: number }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "attempts" | "performance">("overview");

  useEffect(() => {
    fetchStudentDetails();
  }, [studentId]);

  const fetchStudentDetails = async () => {
    try {
      const response = await fetch(`/api/educator/students/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setStudent(data);
      } else {
        logger.error("Failed to fetch student details");
      }
    } catch (error) {
      logger.error("Error fetching student details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-amber-600";
    if (score >= 80) return "text-amber-500";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-orange-700";
  };

  if (loading) {
    return <LoadingState fullPage text="Loading student details..." />;
  }

  if (!student) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertCircle}
          title="Student Not Found"
          description="The student you're looking for doesn't exist or has been removed."
          action={{
            label: "Back to Students",
            onClick: () => router.push("/educator/students")
          }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Student Details"
        subtitle={student.name}
        icon={User}
        backButton={{
          href: "/educator/students",
          label: "Students"
        }}
      />

      {/* Student Info Card */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1 h-6">
              <User className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white pl-6">
              {student.name}
            </p>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1 h-6">
              <Mail className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white pl-6 break-all">
              {student.email}
            </p>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1 h-6">
              <Phone className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white pl-6">
              {student.phoneNumber || "Not provided"}
            </p>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1 h-6">
              <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Joined</p>
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white pl-6">
              {new Date(student.joinedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Section>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Enrollments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.totalEnrollments}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.completedQuizzes}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Avg Score</p>
              <p className={`text-2xl font-bold ${getGradeColor(student.averageScore)}`}>
                {student.averageScore.toFixed(1)}%
              </p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(student.totalTimeSpent)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabNavigation
        tabs={[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'attempts', label: 'Recent Attempts', icon: BookOpen },
          { id: 'performance', label: 'Performance by Topic', icon: Award }
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as "overview" | "attempts" | "performance")}
      />

      {/* Tab Content */}
      {activeTab === "overview" && (
        <Section
          title="Performance Overview"
          description="Overall performance metrics and trends"
          icon={TrendingUp}
        >
          <div className="space-y-6">
            {/* Performance Summary */}
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                Performance Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-amber-100">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                  <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
                    {student.totalEnrollments > 0
                      ? Math.round((student.completedQuizzes / student.totalEnrollments) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-amber-100">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</p>
                  <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
                    {student.recentAttempts.length > 0
                      ? Math.round(
                          (student.recentAttempts.filter(a => a.score >= 70).length /
                            student.recentAttempts.length) *
                            100
                        )
                      : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-amber-100">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time/Quiz</p>
                  <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
                    {student.completedQuizzes > 0
                      ? formatTime(Math.round(student.totalTimeSpent / student.completedQuizzes))
                      : "0m"}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-amber-100">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                  <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
                    {student.recentAttempts.length > 0
                      ? Math.max(...student.recentAttempts.map(a => a.score))
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Grade Distribution */}
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Award className="h-4 w-4 text-amber-600" />
                Grade Distribution
              </h3>
              {(() => {
                const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
                student.recentAttempts.forEach(attempt => {
                  if (attempt.score >= 90) grades.A++;
                  else if (attempt.score >= 80) grades.B++;
                  else if (attempt.score >= 70) grades.C++;
                  else if (attempt.score >= 60) grades.D++;
                  else grades.F++;
                });
                const total = student.recentAttempts.length || 1;
                
                return (
                  <div className="flex gap-4">
                    {Object.entries(grades).map(([grade, count]) => (
                      <div key={grade} className="flex-1 text-center">
                        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded relative">
                          <div
                            className={`absolute bottom-0 w-full rounded ${
                              grade === "A" ? "bg-amber-500" :
                              grade === "B" ? "bg-amber-400" :
                              grade === "C" ? "bg-yellow-500" :
                              grade === "D" ? "bg-orange-500" : "bg-orange-700"
                            }`}
                            style={{ height: `${(count / total) * 100}%` }}
                          />
                        </div>
                        <p className="mt-2 font-medium text-gray-900 dark:text-white">{grade}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{count}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </Section>
      )}

      {activeTab === "attempts" && (
        <Section
          title="Recent Quiz Attempts"
          description="Latest quiz completions and scores"
          icon={BookOpen}
        >
          {student.recentAttempts.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No quiz attempts yet"
              description="This student hasn't completed any quizzes yet."
            />
          ) : (
            <div className="space-y-4">
              {student.recentAttempts.map((attempt) => (
                <div
                  key={attempt.attemptId}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-amber-100"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {attempt.quizTitle}
                    </h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        Score: <span className={`font-medium ${getGradeColor(attempt.score)}`}>
                          {attempt.score}%
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {attempt.correctAnswers}/{attempt.totalQuestions}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(attempt.timeSpent)}
                      </span>
                      <span>
                        {attempt.completedAt 
                          ? new Date(attempt.completedAt).toLocaleDateString()
                          : "Not completed"
                        }
                      </span>
                    </div>
                  </div>
                  <Link href={`/educator/quiz/${attempt.quizId}/attempt/${attempt.attemptId}`}>
                    <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {activeTab === "performance" && (
        <Section
          title="Performance by Topic"
          description="Breakdown of performance across different topics"
          icon={Award}
        >
          {Object.keys(student.performanceByTopic).length === 0 ? (
            <EmptyState
              icon={AlertCircle}
              title="No topic data available yet"
              description="Performance data will appear here once the student completes quizzes with topic information."
            />
          ) : (
            <div className="space-y-3">
              {Object.entries(student.performanceByTopic).map(([topic, stats]) => (
                <div key={topic} className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{topic}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.correct}/{stats.total} correct
                    </span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stats.percentage >= 80 ? "bg-amber-600" :
                          stats.percentage >= 60 ? "bg-yellow-600" : "bg-orange-600"
                        }`}
                        style={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right text-gray-900 dark:text-white">
                      {stats.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </PageContainer>
  );
}