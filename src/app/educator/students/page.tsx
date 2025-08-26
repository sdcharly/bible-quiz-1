"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchWithCache } from "@/lib/api-cache";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState
} from "@/components/educator-v2";
import { logger } from "@/lib/logger";
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
  Search,
  GraduationCap
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
    // Fetch both in parallel for better performance
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStudents(),
        fetchQuizzes()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchStudents = async () => {
    try {
      // Use cache for frequently accessed data
      const response = await fetchWithCache("/api/educator/students", {}, 60000); // 1 minute cache
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      logger.error("Error fetching students:", error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      // Use cache for quiz list
      const response = await fetchWithCache("/api/educator/quizzes", {}, 60000); // 1 minute cache
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes?.filter((q: Quiz) => q.status === 'published') || []);
      }
    } catch (error) {
      logger.error("Error fetching quizzes:", error);
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
    if (selectedQuizId && selectedQuizId !== "none") {
      requestBody.quizId = selectedQuizId;
    }

    try {
      const response = await fetch("/api/educator/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setInvitationLinks(data.invitations);
        setInviteEmails("");
      } else {
        alert(data.message || "Failed to send invitations");
      }
    } catch (error) {
      logger.error("Error sending invitations:", error);
      alert("Failed to send invitations");
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllLinks = () => {
    const allLinks = invitationLinks
      .map(inv => `${inv.email}: ${inv.invitationUrl}`)
      .join('\n');
    navigator.clipboard.writeText(allLinks);
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingState fullPage text="Loading students..." />;
  }

  return (
    <>
      <PageHeader
        title="Student Management"
        subtitle="Guide and manage your disciples"
        icon={GraduationCap}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Students' }
        ]}
        actions={
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Students
          </Button>
        }
      />

      <PageContainer>
        <Section transparent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchTerm ? "No students found" : "No students yet"}
              description={searchTerm 
                ? "Try adjusting your search criteria" 
                : "Start by inviting students to join your classes"}
              action={{
                label: "Invite Students",
                onClick: () => setShowInviteModal(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.relationshipId}
                  className="hover:shadow-lg transition-shadow cursor-pointer border-amber-100"
                  onClick={() => router.push(`/educator/students/${student.studentId}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{student.name}</span>
                      {student.status === 'active' ? (
                        <CheckCircle className="h-5 w-5 text-amber-600" />
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <div className="px-6 pb-2">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      {student.phoneNumber ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{student.phoneNumber}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <CardContent>
                    <div className="flex justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4 text-amber-600" />
                        <span>{student.totalEnrollments} enrolled</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-amber-600" />
                        <span>{student.completedQuizzes} completed</span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Joined {new Date(student.enrolledAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>

      {/* Invite Modal */}
      {showInviteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invite Students</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowInviteModal(false);
                  setInvitationLinks([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {invitationLinks.length === 0 ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="emails">Email Addresses</Label>
                  <Textarea
                    id="emails"
                    placeholder="Enter email addresses separated by commas or new lines"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Example: student1@email.com, student2@email.com
                  </p>
                </div>

                <div>
                  <Label htmlFor="quiz">Assign to Quiz (Optional)</Label>
                  <Select value={selectedQuizId || "none"} onValueChange={setSelectedQuizId}>
                    <SelectTrigger id="quiz" className="mt-1">
                      <SelectValue placeholder="Select a quiz to auto-enroll students" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No quiz selected</SelectItem>
                      {quizzes.map((quiz) => (
                        <SelectItem key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Students will be automatically enrolled in the selected quiz
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteModal(false)}
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvitations}
                    disabled={!inviteEmails.trim() || inviteLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {inviteLoading ? (
                      <>
                        <LoadingState inline size="sm" text="Sending..." />
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Invitation Links Generated
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllLinks}
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {invitationLinks.map((invitation, index) => (
                    <div
                      key={index}
                      className="p-3 bg-amber-50 dark:bg-gray-700 rounded-lg border border-amber-200 dark:border-gray-600"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {invitation.email}
                          </p>
                          {invitation.userExists ? (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              ✓ User already exists - will be linked to your educator account
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 break-all">
                            {invitation.invitationUrl}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(invitation.invitationUrl)}
                          className="ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInvitationLinks([]);
                      setInviteEmails("");
                    }}
                    className="border-amber-200 hover:bg-amber-50"
                  >
                    Send More
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInvitationLinks([]);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}