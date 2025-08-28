"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTimezone } from "@/hooks/useTimezone";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Clock,
  Users,
  Calendar,
  Search,
  Filter,
  BarChart3,
  Settings,
  Edit3,
  Eye,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { ShareLinkButton } from "@/components/quiz/ShareLinkButton";
import { PageHeader } from "@/components/educator-v2/layout/PageHeader";
import { PageContainer } from "@/components/educator-v2/layout/PageContainer";
import { Section } from "@/components/educator-v2/layout/Section";
import { LoadingState } from "@/components/educator-v2/feedback/LoadingState";
import { EmptyState } from "@/components/educator-v2/feedback/EmptyState";
import { StatusBadge, StatusCard } from "@/components/ui/status-badge";
import { logger } from "@/lib/logger";

interface Quiz {
  id: string;
  title: string;
  description: string;
  status: string;
  totalQuestions: number;
  duration: number;
  enrolledStudents: number;
  createdAt: string;
  startTime: string;
  timezone: string;
}

export default function EducatorQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { formatDate, getRelativeTime } = useTimezone();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/educator/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      logger.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone for draft quizzes.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/delete`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchQuizzes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      logger.error('Error deleting quiz:', error);
      alert('Failed to delete quiz');
    }
  };

  const handleToggleArchive = async (quizId: string, currentStatus: string) => {
    const action = currentStatus === 'archived' ? 'activate' : 'deactivate';
    const confirmMessage = currentStatus === 'archived' 
      ? 'Are you sure you want to activate this quiz? Students will be able to take it again.'
      : 'Are you sure you want to archive this quiz? Students will no longer be able to access it.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/delete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchQuizzes();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      logger.error('Error toggling archive status:', error);
      alert('Failed to update quiz status');
    }
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge type="quiz" status={status} size="sm" />;
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || quiz.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingState fullPage text="Loading quizzes..." />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="All Quizzes"
        subtitle="Manage your biblical study quizzes"
        icon={BookOpen}
        backButton={{
          href: "/educator/dashboard",
          label: "Dashboard"
        }}
        actions={
          <Link href="/educator/quiz/create">
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Section transparent>
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search quizzes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{quizzes.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Published</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {quizzes.filter(q => q.status === 'published').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Drafts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {quizzes.filter(q => q.status === 'draft').length}
              </p>
            </div>
            <Edit3 className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Archived</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {quizzes.filter(q => q.status === 'archived').length}
              </p>
            </div>
            <Archive className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Quizzes List */}
      <Section
        title="Quiz Library"
        description={`${filteredQuizzes.length} quiz${filteredQuizzes.length !== 1 ? 'zes' : ''} found`}
      >
        {filteredQuizzes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={searchTerm || filterStatus !== "all" 
              ? "No quizzes found matching your criteria"
              : "No quizzes created yet"}
            description={searchTerm || filterStatus !== "all" 
              ? "Try adjusting your search or filter criteria"
              : "Create your first biblical study quiz to get started"}
            action={(!searchTerm && filterStatus === "all") ? {
              label: "Create Your First Quiz",
              onClick: () => window.location.href = "/educator/quiz/create"
            } : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filteredQuizzes.map((quiz) => (
              <StatusCard
                key={quiz.id}
                type="quiz"
                status={quiz.status}
                interactive={true}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {quiz.title}
                    </h3>
                    {getStatusBadge(quiz.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
                    {quiz.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {quiz.totalQuestions} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {quiz.duration} min
                    </span>
                    {quiz.status === 'published' && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {quiz.enrolledStudents} enrolled
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(quiz.startTime, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {getRelativeTime(quiz.startTime)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {quiz.status === 'draft' ? (
                    <>
                      <Link href={`/educator/quiz/${quiz.id}/review`}>
                        <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : quiz.status === 'published' ? (
                    <>
                      <ShareLinkButton 
                        quizId={quiz.id}
                        quizTitle={quiz.title}
                        variant="ghost"
                        size="sm"
                        showLabel={false}
                      />
                      <Link href={`/educator/quiz/${quiz.id}/results`}>
                        <Button variant="outline" size="sm" className="border-amber-200 hover:bg-amber-50">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Results
                        </Button>
                      </Link>
                      <Link href={`/educator/quiz/${quiz.id}/manage`}>
                        <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href={`/educator/quiz/${quiz.id}/review`}>
                        <Button variant="ghost" size="sm" className="hover:bg-amber-50">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleArchive(quiz.id, quiz.status)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                </div>
              </StatusCard>
            ))}
          </div>
        )}
      </Section>
    </PageContainer>
  );
}