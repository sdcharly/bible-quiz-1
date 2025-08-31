"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BookOpen,
  User,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { fetchWithOptimizedCache } from "@/lib/api-cache";

interface Group {
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  groupColor: string;
  groupTheme: string;
  joinedAt: string;
  role: string;
  educatorName: string;
  educatorEmail: string;
  memberCount: number;
  assignedQuizzes: number;
}

interface GroupQuiz {
  quizId: string;
  quizTitle: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  startTime: string;
  duration: number;
  totalQuestions: number;
}

// Cache key for deduplication
const CACHE_KEY = 'student-groups-data';
let fetchPromise: Promise<any> | null = null;

// Helper to create fetch promise atomically
const createFetchPromise = () => {
  return fetchWithOptimizedCache('/api/student/groups', {
    ttl: 300, // Cache for 5 minutes
  }).then(result => result.data);
};

export function GroupInfo() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupQuizzes, setGroupQuizzes] = useState<GroupQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      // Atomic check-and-set: assign promise if not exists, then await
      const promise = fetchPromise ??= createFetchPromise();
      
      logger.debug('Fetching groups data', { 
        isNewFetch: promise === fetchPromise 
      });
      
      const data = await promise;
      
      logger.debug('Groups data fetched', {
        cached: data.cached,
        groupCount: data.groups?.length || 0
      });
      
      setGroups(data.groups || []);
      setGroupQuizzes(data.recentGroupQuizzes || []);
      
    } catch (error) {
      logger.error("Error fetching groups:", error);
      setGroups([]);
      setGroupQuizzes([]);
      // Reset promise on error to allow retry
      fetchPromise = null;
    } finally {
      setLoading(false);
      // Clear promise after successful completion to allow refresh
      if (fetchPromise) {
        setTimeout(() => {
          fetchPromise = null;
        }, 100);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Groups Section */}
      <div>
        <h2 className="text-lg font-heading font-semibold mb-3">My Groups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.groupId} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: group.groupColor }}
                    />
                    <CardTitle className="text-base">{group.groupName}</CardTitle>
                  </div>
                  {group.role === "leader" && (
                    <Badge variant="secondary" className="text-xs">
                      Leader
                    </Badge>
                  )}
                </div>
                {group.groupDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {group.groupDescription}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="h-3 w-3" />
                    <span>Led by {group.educatorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="h-3 w-3" />
                    <span>{group.memberCount} members</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <BookOpen className="h-3 w-3" />
                    <span>{group.assignedQuizzes} assigned quizzes</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {new Date(group.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Group Quizzes Section */}
      {groupQuizzes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-heading font-semibold">Group Quizzes</h2>
            <Link href="/student/quizzes">
              <span className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                View all
                <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
          <div className="space-y-3">
            {groupQuizzes.map((quiz) => (
              <Card key={quiz.quizId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: quiz.groupColor }}
                        />
                        <span className="text-xs text-gray-500">
                          {quiz.groupName}
                        </span>
                      </div>
                      <h3 className="font-medium">{quiz.quizTitle}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>{quiz.totalQuestions} questions</span>
                        <span>{quiz.duration} minutes</span>
                        <span>
                          Starts {new Date(quiz.startTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Link href={`/student/quiz/${quiz.quizId}`}>
                      <span className="text-amber-600 hover:text-amber-700 text-sm font-medium">
                        View Details
                      </span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}