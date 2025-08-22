"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ChevronUp, ChevronDown } from "lucide-react";

interface QuizPerformance {
  quizId: string;
  quizTitle: string;
  attempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  highestScore: number;
  lowestScore: number;
}

interface Props {
  quizzes: QuizPerformance[];
}

export default function QuizPerformanceTable({ quizzes }: Props) {
  const [sortField, setSortField] = useState<keyof QuizPerformance>("attempts");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedQuizzes = [...quizzes].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === "string") {
      return sortOrder === "asc" 
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }
    
    return sortOrder === "asc" 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const paginatedQuizzes = sortedQuizzes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(quizzes.length / itemsPerPage);

  const handleSort = (field: keyof QuizPerformance) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const SortIcon = ({ field }: { field: keyof QuizPerformance }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? 
      <ChevronUp className="h-3 w-3 inline ml-1" /> : 
      <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Performance Analysis</CardTitle>
        <CardDescription>
          Detailed performance metrics for each quiz
        </CardDescription>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No quiz data available for this period</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => handleSort("quizTitle")}
                    >
                      Quiz Title <SortIcon field="quizTitle" />
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => handleSort("attempts")}
                    >
                      Attempts <SortIcon field="attempts" />
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => handleSort("averageScore")}
                    >
                      Avg Score <SortIcon field="averageScore" />
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => handleSort("passRate")}
                    >
                      Pass Rate <SortIcon field="passRate" />
                    </th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer"
                      onClick={() => handleSort("averageTime")}
                    >
                      Avg Time <SortIcon field="averageTime" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Score Range
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {paginatedQuizzes.map((quiz) => (
                    <tr key={quiz.quizId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {quiz.quizTitle}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {quiz.attempts}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-medium ${getScoreColor(quiz.averageScore)}`}>
                          {quiz.averageScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-medium ${quiz.passRate >= 70 ? "text-green-600" : "text-red-600"}`}>
                          {quiz.passRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {formatTime(quiz.averageTime)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm">
                          {quiz.lowestScore}% - {quiz.highestScore}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Link href={`/educator/quiz/${quiz.quizId}/results`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}