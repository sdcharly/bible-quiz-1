"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateInTimezone } from "@/lib/timezone";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  Search,
  Calendar,
  Eye,
  BookOpen,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ShareLinkButton } from "@/components/quiz/ShareLinkButton";

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  totalQuestions: number;
  duration: number;
  status: string;
  startTime: string;
  timezone: string;
  createdAt: string;
}

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
  status: "enrolled" | "in_progress" | "completed";
  score?: number;
  completedAt?: string;
}

interface AvailableStudent {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isEnrolled: boolean;
}

interface ReassignmentStudent {
  studentId: string;
  name: string;
  email: string;
  originalStatus: string;
  reassignmentCount: number;
  lastReassignedAt: string | null;
  latestScore: number | null;
  isEligibleForReassignment: boolean;
  eligibilityReason: string;
}

export default function QuizManagePage() {
  const params = useParams();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentStats, setEnrollmentStats] = useState({ total: 0, enrolled: 0 });
  const [sendNotifications, setSendNotifications] = useState(true);
  
  // Group assignment states
  const [showGroupAssign, setShowGroupAssign] = useState(false);
  const [groups, setGroups] = useState<{id: string, name: string, memberCount: number}[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [excludedGroupStudents, setExcludedGroupStudents] = useState<Set<string>>(new Set());
  const [groupMembers, setGroupMembers] = useState<{studentId: string, name: string, email: string}[]>([]);
  const [assigningGroup, setAssigningGroup] = useState(false);
  
  // Reassignment states
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignmentStudents, setReassignmentStudents] = useState<ReassignmentStudent[]>([]);
  const [selectedReassignStudents, setSelectedReassignStudents] = useState<Set<string>>(new Set());
  const [reassignmentReason, setReassignmentReason] = useState("Missed original attempt");
  const [reassigning, setReassigning] = useState(false);
  const [loadingReassignment, setLoadingReassignment] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchQuizDetails();
      await fetchEnrolledStudents();
      await fetchAvailableStudents();
      await fetchGroups();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data);
      }
    } catch (error) {
      console.error("Error fetching quiz details:", error);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/enrollments`);
      if (response.ok) {
        const data = await response.json();
        setEnrolledStudents(data.enrollments || []);
      }
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/bulk-enroll`);
      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data.students || []);
        setEnrollmentStats({ total: data.total, enrolled: data.enrolled });
      }
    } catch (error) {
      console.error("Error fetching available students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/educator/groups");
      if (response.ok) {
        const data = await response.json();
        // Ensure each group has memberCount, default to 0 if missing
        const groupsWithCounts = (data.groups || []).map((group: {
          id: string;
          name: string;
          memberCount?: number;
          [key: string]: unknown;
        }) => ({
          ...group,
          memberCount: group.memberCount || 0
        }));
        setGroups(groupsWithCounts);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/educator/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setGroupMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  const handleGroupAssign = async () => {
    if (!selectedGroupId) {
      alert("Please select a group");
      return;
    }

    setAssigningGroup(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/assign-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroupId,
          sendNotifications,
          excludedStudentIds: Array.from(excludedGroupStudents)
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowGroupAssign(false);
        setSelectedGroupId("");
        setExcludedGroupStudents(new Set());
        setGroupMembers([]);
        fetchEnrolledStudents();
        fetchAvailableStudents();
        // Refresh groups to update member counts
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign quiz to group");
      }
    } catch (error) {
      console.error("Error assigning quiz to group:", error);
      alert("Error assigning quiz to group");
    } finally {
      setAssigningGroup(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedStudents.size === 0) {
      alert("Please select at least one student to enroll");
      return;
    }

    setEnrolling(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/bulk-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          studentIds: Array.from(selectedStudents),
          sendNotifications 
        })
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.notificationsSent 
          ? `Successfully enrolled ${data.enrolledCount} student(s) and sent email notifications!`
          : `Successfully enrolled ${data.enrolledCount} student(s)!`;
        alert(message);
        setSelectedStudents(new Set());
        setShowBulkEnroll(false);
        setSendNotifications(true); // Reset for next time
        fetchEnrolledStudents();
        fetchAvailableStudents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to enroll students");
      }
    } catch (error) {
      console.error("Error enrolling students:", error);
      alert("Error enrolling students");
    } finally {
      setEnrolling(false);
    }
  };


  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAll = () => {
    const notEnrolled = availableStudents
      .filter(s => !s.isEnrolled && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(s => s.studentId);
    setSelectedStudents(new Set(notEnrolled));
  };

  const deselectAll = () => {
    setSelectedStudents(new Set());
  };

  // Reassignment functions
  const fetchReassignmentStudents = async () => {
    setLoadingReassignment(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/reassign`);
      if (response.ok) {
        const data = await response.json();
        setReassignmentStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching reassignment students:", error);
    } finally {
      setLoadingReassignment(false);
    }
  };

  const handleReassign = async () => {
    if (selectedReassignStudents.size === 0) {
      alert("Please select at least one student to reassign");
      return;
    }

    setReassigning(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedReassignStudents),
          reason: reassignmentReason,
          sendNotifications
        })
      });

      if (response.ok) {
        const data = await response.json();
        const message = data.notificationsSent
          ? `Successfully reassigned quiz to ${data.reassignedCount} student(s) and sent notifications!`
          : `Successfully reassigned quiz to ${data.reassignedCount} student(s)!`;
        alert(message);
        setSelectedReassignStudents(new Set());
        setShowReassignDialog(false);
        setReassignmentReason("Missed original attempt");
        fetchEnrolledStudents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to reassign quiz");
      }
    } catch (error) {
      console.error("Error reassigning quiz:", error);
      alert("Error reassigning quiz");
    } finally {
      setReassigning(false);
    }
  };

  const openReassignDialog = () => {
    setShowReassignDialog(true);
    fetchReassignmentStudents();
  };

  const toggleReassignStudent = (studentId: string) => {
    const newSelected = new Set(selectedReassignStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedReassignStudents(newSelected);
  };

  const selectAllEligible = () => {
    const eligible = reassignmentStudents
      .filter(s => s.isEligibleForReassignment)
      .map(s => s.studentId);
    setSelectedReassignStudents(new Set(eligible));
  };

  const deselectAllReassign = () => {
    setSelectedReassignStudents(new Set());
  };

  const filteredStudents = availableStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, score?: number) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Completed {score !== undefined && `(${score}%)`}
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <Users className="h-3 w-3" />
            Enrolled
          </span>
        );
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/educator/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Quiz Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage student enrollments and track progress
              </p>
            </div>
            <div className="flex gap-2">
              <ShareLinkButton 
                quizId={quizId}
                quizTitle={quiz?.title || "Quiz"}
                variant="outline"
                size="sm"
              />
              <Link href={`/educator/quiz/${quizId}/review`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Quiz
                </Button>
              </Link>
              <Button 
                onClick={openReassignDialog}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reassign Quiz
              </Button>
              <Button 
                onClick={() => {
                  fetchGroups(); // Refresh groups when opening dialog
                  setShowGroupAssign(true);
                }}
                variant="outline"
                size="sm"
                disabled={groups.length === 0}
              >
                <Users className="h-4 w-4 mr-2" />
                Assign to Group
              </Button>
              <Button 
                onClick={() => setShowBulkEnroll(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Students
              </Button>
            </div>
          </div>
        </div>

        {/* Quiz Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {quiz.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {quiz.description}
                </p>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {quiz.totalQuestions} Questions
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {quiz.duration} minutes
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Published {formatDateInTimezone(quiz.createdAt, quiz.timezone || 'Asia/Kolkata', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Published</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Enrollment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quiz Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Enrolled</span>
                  <span className="font-semibold">{enrolledStudents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">
                    {enrolledStudents.filter(s => s.status === "completed").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="font-semibold text-yellow-600">
                    {enrolledStudents.filter(s => s.status === "in_progress").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Not Started</span>
                  <span className="font-semibold text-blue-600">
                    {enrolledStudents.filter(s => s.status === "enrolled").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enrolled Students */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Enrolled Students</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBulkEnroll(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {enrolledStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No students enrolled yet</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowBulkEnroll(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign Students
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrolledStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm">
                            <p className="text-gray-500">
                              Enrolled {formatDateInTimezone(student.enrolledAt, quiz?.timezone || 'Asia/Kolkata', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            {student.completedAt && (
                              <p className="text-gray-500">
                                Completed {formatDateInTimezone(student.completedAt, quiz?.timezone || 'Asia/Kolkata', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                          {getStatusBadge(student.status, student.score)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Minimalistic Bulk Enroll Students Modal */}
        <Dialog open={showBulkEnroll} onOpenChange={setShowBulkEnroll}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-w-[95vw] h-[90vh] sm:h-[85vh] max-h-[90vh] p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle>Assign Students to Quiz</DialogTitle>
              <DialogDescription>
                Select students to enroll in &quot;{quiz?.title}&quot;. {selectedStudents.size} selected.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 flex flex-col px-6 py-4 min-h-0 overflow-hidden">
              {/* Simple Search */}
              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Student List - Clean and Simple */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4 border rounded-lg">
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mb-2 text-gray-300" />
                    <p>{searchTerm ? "No students found" : "No students available"}</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                          student.isEnrolled
                            ? "bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed"
                            : selectedStudents.has(student.studentId)
                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        }`}
                        onClick={() => !student.isEnrolled && toggleStudent(student.studentId)}
                      >
                        <Checkbox
                          checked={selectedStudents.has(student.studentId) || student.isEnrolled}
                          disabled={student.isEnrolled}
                          onCheckedChange={() => toggleStudent(student.studentId)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{student.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}</div>
                        </div>
                        {student.isEnrolled && (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium shrink-0">Enrolled</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 text-sm shrink-0">
                <button
                  onClick={selectAll}
                  disabled={enrollmentStats.total === enrollmentStats.enrolled}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={deselectAll}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendNotifications"
                    checked={sendNotifications}
                    onCheckedChange={(checked) => setSendNotifications(checked as boolean)}
                  />
                  <label 
                    htmlFor="sendNotifications" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Send email notifications with share link
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowBulkEnroll(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkEnroll}
                    disabled={enrolling || selectedStudents.size === 0}
                    className="min-w-[120px]"
                  >
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  `Assign ${selectedStudents.size} Student${selectedStudents.size !== 1 ? "s" : ""}`
                )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassignment Dialog */}
        <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-w-[95vw] h-[90vh] sm:h-[85vh] max-h-[90vh] p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
              <DialogTitle>Reassign Quiz to Students</DialogTitle>
              <DialogDescription>
                Select students who missed or need to retake the quiz. They will get the same questions in a different order.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 flex flex-col px-6 py-4 min-h-0 overflow-hidden">
              {/* Reason Input */}
              <div className="mb-4 shrink-0">
                <label className="text-sm font-medium mb-2 block">Reassignment Reason</label>
                <Input
                  type="text"
                  placeholder="e.g., Missed original attempt, Technical issues..."
                  value={reassignmentReason}
                  onChange={(e) => setReassignmentReason(e.target.value)}
                />
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto min-h-0 mb-4 border rounded-lg">
                {loadingReassignment ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : reassignmentStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Users className="h-8 w-8 mb-2 text-gray-300" />
                    <p>No students available for reassignment</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {reassignmentStudents.map((student) => (
                      <div
                        key={student.studentId}
                        className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                          !student.isEligibleForReassignment
                            ? "bg-gray-50 dark:bg-gray-800 opacity-50"
                            : selectedReassignStudents.has(student.studentId)
                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        }`}
                        onClick={() => student.isEligibleForReassignment && toggleReassignStudent(student.studentId)}
                      >
                        <Checkbox
                          checked={selectedReassignStudents.has(student.studentId)}
                          disabled={!student.isEligibleForReassignment}
                          onCheckedChange={() => toggleReassignStudent(student.studentId)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{student.name}</span>
                            {student.reassignmentCount > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                Reassigned {student.reassignmentCount}x
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{student.email}</div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            {student.originalStatus === "completed" ? (
                              <>
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>Completed (Score: {student.latestScore}%)</span>
                              </>
                            ) : student.originalStatus === "in_progress" ? (
                              <>
                                <Clock className="h-3 w-3 text-yellow-500" />
                                <span>In Progress</span>
                              </>
                            ) : student.originalStatus === "enrolled" ? (
                              <>
                                <Users className="h-3 w-3 text-blue-500" />
                                <span>Not Started</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 text-gray-400" />
                                <span>Abandoned</span>
                              </>
                            )}
                          </div>
                        </div>
                        {!student.isEligibleForReassignment && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium shrink-0">
                            {student.eligibilityReason}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 text-sm shrink-0">
                <button
                  onClick={selectAllEligible}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Select All Eligible
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={deselectAllReassign}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t shrink-0 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sendReassignNotifications"
                    checked={sendNotifications}
                    onCheckedChange={(checked) => setSendNotifications(checked as boolean)}
                  />
                  <label 
                    htmlFor="sendReassignNotifications" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Send email notifications
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReassign}
                    disabled={reassigning || selectedReassignStudents.size === 0}
                    className="min-w-[120px]"
                  >
                    {reassigning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reassigning...
                      </>
                    ) : (
                      `Reassign to ${selectedReassignStudents.size} Student${selectedReassignStudents.size !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Group Assignment Dialog */}
        <Dialog open={showGroupAssign} onOpenChange={setShowGroupAssign}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Quiz to Group</DialogTitle>
              <DialogDescription>
                Assign this quiz to all members of a group at once
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Group Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Group</label>
                <Select
                  value={selectedGroupId}
                  onValueChange={(value) => {
                    setSelectedGroupId(value);
                    if (value) {
                      fetchGroupMembers(value);
                    } else {
                      setGroupMembers([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.memberCount} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Group Members Preview */}
              {groupMembers.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Group Members ({groupMembers.length})
                  </label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto p-2">
                    {groupMembers.map((member) => (
                      <div 
                        key={member.studentId}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                      >
                        <Checkbox
                          checked={!excludedGroupStudents.has(member.studentId)}
                          onCheckedChange={(checked) => {
                            const newExcluded = new Set(excludedGroupStudents);
                            if (checked) {
                              newExcluded.delete(member.studentId);
                            } else {
                              newExcluded.add(member.studentId);
                            }
                            setExcludedGroupStudents(newExcluded);
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {excludedGroupStudents.size > 0 && (
                    <p className="text-sm text-yellow-600 mt-2">
                      {excludedGroupStudents.size} student(s) will be excluded from this assignment
                    </p>
                  )}
                </div>
              )}

              {/* Notification Option */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="groupNotifications"
                  checked={sendNotifications}
                  onCheckedChange={(checked) => setSendNotifications(checked as boolean)}
                />
                <label 
                  htmlFor="groupNotifications" 
                  className="text-sm font-medium leading-none"
                >
                  Send email notifications to group members
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowGroupAssign(false);
                setSelectedGroupId("");
                setExcludedGroupStudents(new Set());
                setGroupMembers([]);
              }}>
                Cancel
              </Button>
              <Button
                onClick={handleGroupAssign}
                disabled={assigningGroup || !selectedGroupId}
              >
                {assigningGroup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign to Group`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}