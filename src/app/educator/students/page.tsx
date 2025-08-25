"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BiblicalLoader, BiblicalPageLoader } from "@/components/ui/biblical-loader";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  BookOpen,
  CheckCircle,
  Send,
  Copy,
  X,
  Search
} from "lucide-react";

interface Student {
  relationshipId: string;
  studentId: string;
  status: string;
  enrolledAt: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  totalEnrollments: number;
  completedQuizzes: number;
}

interface Quiz {
  id: string;
  title: string;
  status: string;
}

export default function StudentManagementPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [invitationLinks, setInvitationLinks] = useState<{email: string; token: string; invitationUrl: string; userExists: boolean}[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchQuizzes();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/educator/students");
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await fetch("/api/educator/quizzes");
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes?.filter((q: Quiz) => q.status === 'published') || []);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    }
  };

  const handleSendInvitations = async () => {
    if (!inviteEmails.trim()) return;

    setInviteLoading(true);
    const emails = inviteEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email);

    const requestBody: { emails: string[]; quizId?: string } = { emails };
    if (selectedQuizId) {
      requestBody.quizId = selectedQuizId;
    }

    try {
      const response = await fetch("/api/educator/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setInvitationLinks(data.invitations);
        alert(`Successfully sent ${data.invitations.length} invitation(s)`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error sending invitations:", error);
      alert("Failed to send invitations");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <BiblicalPageLoader text="Loading students..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Student Management
            </span>
          </h1>
          <p className="font-body text-lg text-amber-800 dark:text-amber-200">
            Manage your students and send invitations to your biblical studies
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {students.length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-amber-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Students</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {students.filter(s => s.status === "active").length}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Completions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {students.reduce((acc, s) => acc + s.completedQuizzes, 0)}
                  </p>
                </div>
                <BookOpen className="h-12 w-12 text-amber-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus:ring-amber-500 focus:border-amber-500 dark:bg-gray-800 dark:text-white bg-white/70 backdrop-blur-sm border-amber-200"
              />
            </div>
          </div>
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium shadow-lg"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Students
          </Button>
        </div>

        {/* Students List */}
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl text-amber-900 dark:text-amber-100">Your Students</CardTitle>
            <CardDescription className="font-body text-amber-700 dark:text-amber-300">
              Students enrolled under your educator account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-amber-600 opacity-50 mx-auto mb-4" />
                <p className="font-body text-amber-700 dark:text-amber-300">
                  {searchTerm ? "No students found matching your search" : "No students yet. Send invitations to get started."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.relationshipId}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-lg hover:from-amber-100 hover:to-orange-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all border border-amber-200/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-heading font-semibold text-amber-900 dark:text-amber-100">
                          {student.name}
                        </h3>
                        {student.status === "active" ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-amber-600 dark:text-amber-400 font-body">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {student.email}
                        </span>
                        {student.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {student.phoneNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-amber-600/80 font-body">
                        <span>{student.totalEnrollments} enrollments</span>
                        <span>{student.completedQuizzes} completed</span>
                        <span>Joined {new Date(student.enrolledAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/educator/students/${student.studentId}`)}
                        className="border-amber-300 hover:bg-amber-50 text-amber-700 font-medium"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-amber-200 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-heading text-2xl font-bold text-amber-900 dark:text-amber-100">
                  Invite Students
                </h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmails("");
                    setInvitationLinks([]);
                    setSelectedQuizId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="font-body text-sm text-amber-700 dark:text-amber-300 mb-4">
                Enter email addresses separated by commas or new lines. Optionally assign them directly to a biblical knowledge quiz.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="font-body text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Select Quiz (Optional)
                  </Label>
                  <Select
                    value={selectedQuizId || ""}
                    onValueChange={(value) => setSelectedQuizId(value || null)}
                  >
                    <SelectTrigger className="w-full focus:ring-amber-500 focus:border-amber-500 border-amber-200">
                      <SelectValue placeholder="No quiz - Just invite to class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No quiz - Just invite to class</SelectItem>
                      {quizzes.map((quiz) => (
                        <SelectItem key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="font-body text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Students will be automatically enrolled in the selected quiz upon accepting the invitation
                  </p>
                </div>

                <div>
                  <Label className="font-body text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Email Addresses
                  </Label>
                  <Textarea
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="student1@example.com, student2@example.com"
                    className="w-full h-32 focus:ring-amber-500 focus:border-amber-500 border-amber-200"
                  />
                </div>
              </div>

              {invitationLinks.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200">
                  <p className="font-body text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                    Invitation Links Generated:
                  </p>
                  <div className="space-y-2">
                    {invitationLinks.map((invite, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="font-body text-amber-700 dark:text-amber-300">{invite.email}</span>
                        <button
                          onClick={() => {
                            // Check if invitationUrl is already a full URL or needs origin prepended
                            const url = invite.invitationUrl.startsWith('http') 
                              ? invite.invitationUrl 
                              : `${window.location.origin}${invite.invitationUrl}`;
                            copyToClipboard(url);
                          }}
                          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Link
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmails("");
                    setInvitationLinks([]);
                    setSelectedQuizId(null);
                  }}
                  className="border-amber-300 hover:bg-amber-50 text-amber-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendInvitations}
                  disabled={inviteLoading || !inviteEmails.trim()}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium"
                >
                  {inviteLoading ? (
                    <BiblicalLoader size="sm" inline />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitations
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}