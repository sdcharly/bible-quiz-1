"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, TrendingUp, TrendingDown, Search, ChevronLeft, ChevronRight 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizzesAttempted: number;
  quizzesCompleted: number;
  averageScore: number;
  totalTimeSpent: number;
  lastActivity: string;
  trend: "up" | "down" | "stable";
}

interface Props {
  students: StudentPerformance[];
}

const ITEMS_PER_PAGE = 10;
const VIRTUAL_SCROLL_THRESHOLD = 50; // Use virtual scrolling if more than 50 items

export default function AnalyticsStudentList({ students: initialStudents }: Props) {
  const [students] = useState(initialStudents);
  const [filteredStudents, setFilteredStudents] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "score" | "activity">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Virtual scrolling refs
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: ITEMS_PER_PAGE });
  const itemHeight = 80; // Height of each student card in pixels

  // Filter and sort students
  useEffect(() => {
    const filtered = students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      return (
        student.studentName.toLowerCase().includes(searchLower) ||
        student.studentEmail.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.studentName.localeCompare(b.studentName);
          break;
        case "score":
          comparison = a.averageScore - b.averageScore;
          break;
        case "activity":
          comparison = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, students]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Virtual scrolling for very large lists
  const handleScroll = useCallback(() => {
    if (!containerRef.current || filteredStudents.length <= VIRTUAL_SCROLL_THRESHOLD) return;

    const scrollTop = containerRef.current.scrollTop;
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerRef.current.clientHeight / itemHeight) + 1,
      filteredStudents.length
    );

    setVisibleRange({ start, end });
  }, [filteredStudents.length]);

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const useVirtualScrolling = filteredStudents.length > VIRTUAL_SCROLL_THRESHOLD;
  const displayStudents = useVirtualScrolling 
    ? filteredStudents.slice(visibleRange.start, visibleRange.end)
    : paginatedStudents;

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search students by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as "name" | "score" | "activity")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Sort by Score</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="activity">Sort by Activity</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {displayStudents.length} of {filteredStudents.length} students
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No students found</p>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            onScroll={useVirtualScrolling ? handleScroll : undefined}
            className={useVirtualScrolling ? "h-[600px] overflow-y-auto" : "space-y-4"}
            style={useVirtualScrolling ? { position: "relative" } : undefined}
          >
            {useVirtualScrolling && (
              <div style={{ height: filteredStudents.length * itemHeight }} />
            )}
            <div
              className="space-y-4"
              style={useVirtualScrolling ? {
                position: "absolute",
                top: visibleRange.start * itemHeight,
                left: 0,
                right: 0,
              } : undefined}
            >
              {displayStudents.map((student) => (
                <div
                  key={student.studentId}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  style={useVirtualScrolling ? { height: itemHeight } : undefined}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {student.studentName}
                      </h4>
                      {getTrendIcon(student.trend)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {student.studentEmail}
                    </p>
                    <div className="flex items-center gap-6 mt-2 text-sm">
                      <span>
                        Completed: {student.quizzesCompleted}/{student.quizzesAttempted}
                      </span>
                      <span className={`font-medium ${getScoreColor(student.averageScore)}`}>
                        Avg: {student.averageScore.toFixed(1)}%
                      </span>
                      <span>
                        Time: {formatTime(student.totalTimeSpent)}
                      </span>
                      <span className="text-gray-500">
                        Last active: {new Date(student.lastActivity).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link href={`/educator/students/${student.studentId}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Controls (only for non-virtual scrolling) */}
          {!useVirtualScrolling && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3 
                    ? i + 1
                    : currentPage >= totalPages - 2
                    ? totalPages - 4 + i
                    : currentPage - 2 + i;
                  
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}