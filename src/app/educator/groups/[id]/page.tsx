"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorFallback } from "@/components/ui/error-fallback";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Search,
  Mail,
  Phone,
  BookOpen,
  CheckCircle,
  Loader2,
  MoveRight,
  X,

  Info,
} from "lucide-react";
import { PageHeader } from "@/components/educator-v2/layout/PageHeader";
import { PageContainer } from "@/components/educator-v2/layout/PageContainer";
import { Section } from "@/components/educator-v2/layout/Section";
import { LoadingState } from "@/components/educator-v2/feedback/LoadingState";
import { EmptyState } from "@/components/educator-v2/feedback/EmptyState";
import { logger } from "@/lib/logger";

interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  color: string;
  maxSize: number;
  memberCount: number;
  assignedQuizzes: number;
}

interface Member {
  memberId: string;
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  joinedAt: string;
  role: string;
  totalEnrollments: number;
  completedQuizzes: number;
}

interface AvailableStudent {
  studentId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  inOtherGroup: boolean;
}

export default function GroupManagePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableSearchTerm, setAvailableSearchTerm] = useState("");
  
  // Dialog states
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedNewMembers, setSelectedNewMembers] = useState<Set<string>>(new Set());
  const [targetGroupId, setTargetGroupId] = useState("");
  const [otherGroups, setOtherGroups] = useState<{id: string, name: string}[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load all data in parallel for better performance
      setLoading(true);
      await Promise.all([
        fetchGroupDetails(),
        fetchMembers(),
        fetchOtherGroups()
      ]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`/api/educator/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data);
      } else {
        router.push("/educator/groups");
      }
    } catch (error) {
      logger.error("Error fetching group details:", error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/educator/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setAvailableStudents(data.availableStudents || []);
      }
    } catch (error) {
      logger.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherGroups = async () => {
    try {
      const response = await fetch("/api/educator/groups");
      if (response.ok) {
        const data = await response.json();
        setOtherGroups(
          data.groups
            .filter((g: {id: string, name: string}) => g && g.id && g.id !== groupId)
            .map((g: {id: string, name: string}) => ({ id: g.id, name: g.name }))
        );
      }
    } catch (error) {
      logger.error("Error fetching other groups:", error);
    }
  };

  const handleAddMembers = async () => {
    if (selectedNewMembers.size === 0) {
      alert("Please select at least one student to add");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/educator/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedNewMembers)
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowAddMembersDialog(false);
        setSelectedNewMembers(new Set());
        fetchMembers();
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add members");
      }
    } catch (error) {
      logger.error("Error adding members:", error);
      alert("Error adding members");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMembers = async () => {
    if (selectedMembers.size === 0) {
      alert("Please select members to remove");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${selectedMembers.size} member(s) from this group?`)) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/educator/groups/${groupId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          studentIds: Array.from(selectedMembers)
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setSelectedMembers(new Set());
        fetchMembers();
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to remove members");
      }
    } catch (error) {
      logger.error("Error removing members:", error);
      alert("Error removing members");
    } finally {
      setProcessing(false);
    }
  };

  const handleMoveMembers = async () => {
    if (selectedMembers.size === 0 || !targetGroupId) {
      alert("Please select members and a target group");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch(`/api/educator/groups/${groupId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          studentIds: Array.from(selectedMembers),
          targetGroupId
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowMoveDialog(false);
        setSelectedMembers(new Set());
        setTargetGroupId("");
        fetchMembers();
        fetchGroupDetails();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to move members");
      }
    } catch (error) {
      logger.error("Error moving members:", error);
      alert("Error moving members");
    } finally {
      setProcessing(false);
    }
  };

  const toggleMemberSelection = (studentId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedMembers(newSelection);
  };

  const toggleNewMemberSelection = (studentId: string) => {
    const newSelection = new Set(selectedNewMembers);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedNewMembers(newSelection);
  };

  const selectAllMembers = () => {
    const filtered = filteredMembers;
    if (selectedMembers.size === filtered.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filtered.filter(m => m && m.studentId).map(m => m.studentId)));
    }
  };

  const selectAllAvailable = () => {
    const filtered = filteredAvailable;
    if (selectedNewMembers.size === filtered.length) {
      setSelectedNewMembers(new Set());
    } else {
      setSelectedNewMembers(new Set(filtered.filter(s => s && s.studentId).map(s => s.studentId)));
    }
  };

  const filteredMembers = members.filter(member =>
    member && member.name && member.email &&
    (member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredAvailable = availableStudents.filter(student =>
    student && student.name && student.email &&
    (student.name.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(availableSearchTerm.toLowerCase()))
  );

  if (loading) {
    return <LoadingState fullPage text="Loading group details..." />;
  }

  if (!group) {
    return (
      <ErrorFallback
        title="Group Not Found"
        message="The group you're looking for doesn't exist or you don't have permission to view it."
        redirectUrl="/educator/groups"
        redirectLabel="Back to Groups"
      />
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={group.name}
        subtitle={group.description || undefined}
        icon={Users}
        backButton={{
          href: "/educator/groups",
          label: "Groups"
        }}
        actions={
          <Button
            onClick={() => setShowAddMembersDialog(true)}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Members
          </Button>
        }
      />

      {/* Group Color Indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">Group Color</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{group.memberCount} / {group.maxSize}</p>
            </div>
            <Users className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Capacity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round((group.memberCount / group.maxSize) * 100)}%
              </p>
            </div>
            <div className="w-12 h-12">
              <svg className="transform -rotate-90 w-12 h-12">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${(group.memberCount / group.maxSize) * 126} 126`}
                  className="text-amber-600"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assigned Quizzes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{group.assignedQuizzes}</p>
            </div>
            <BookOpen className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Available Slots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{group.maxSize - group.memberCount}</p>
            </div>
            <UserPlus className="h-8 w-8 text-amber-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedMembers.size > 0 && (
        <Section transparent className="mb-4">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {selectedMembers.size} member(s) selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMembers(new Set())}
                className="text-amber-700 hover:text-amber-800"
              >
                Clear Selection
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowMoveDialog(true)}
                disabled={otherGroups.length === 0}
                className="border-amber-200 hover:bg-amber-50"
              >
                <MoveRight className="h-4 w-4 mr-2" />
                Move to Group
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemoveMembers}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove from Group
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* Search and Select All */}
      <Section transparent>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={selectAllMembers}
            className="border-amber-200 hover:bg-amber-50"
          >
            {selectedMembers.size === filteredMembers.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
      </Section>

      {/* Members List */}
      <Section
        title="Group Members"
        description={`${filteredMembers.length} member${filteredMembers.length !== 1 ? 's' : ''} found`}
        icon={Users}
      >
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description={searchTerm ? "Try adjusting your search" : "Add students to this group to get started"}
            action={!searchTerm ? {
              label: "Add Members",
              onClick: () => setShowAddMembersDialog(true)
            } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <div key={member.memberId} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-amber-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                    {member.phoneNumber && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="h-3 w-3" />
                        {member.phoneNumber}
                      </div>
                    )}
                  </div>
                  <Checkbox
                    checked={selectedMembers.has(member.studentId)}
                    onCheckedChange={() => toggleMemberSelection(member.studentId)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-gray-500" />
                    <span>{member.totalEnrollments} enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-amber-500" />
                    <span>{member.completedQuizzes} completed</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Add Members Dialog */}
      <Dialog open={showAddMembersDialog} onOpenChange={setShowAddMembersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Members to {group.name}</DialogTitle>
            <DialogDescription>
              Select students to add to this group
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search available students..."
                  value={availableSearchTerm}
                  onChange={(e) => setAvailableSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllAvailable}
                className="border-amber-200 hover:bg-amber-50"
              >
                {selectedNewMembers.size === filteredAvailable.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto border-amber-100">
              {filteredAvailable.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No available students found
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAvailable.map((student) => (
                    <div key={student.studentId} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{student.name}</span>
                            {student.inOtherGroup && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                In another group
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{student.email}</p>
                        </div>
                        <Checkbox
                          checked={selectedNewMembers.has(student.studentId)}
                          onCheckedChange={() => toggleNewMemberSelection(student.studentId)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedNewMembers.size > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {selectedNewMembers.size} student(s) selected
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddMembersDialog(false);
              setSelectedNewMembers(new Set());
              setAvailableSearchTerm("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={processing || selectedNewMembers.size === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>Add {selectedNewMembers.size} Student(s)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Members Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Members to Another Group</DialogTitle>
            <DialogDescription>
              Select the target group for {selectedMembers.size} selected member(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-white">Target Group</label>
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {otherGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Members will be removed from {group.name} and added to the selected group
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowMoveDialog(false);
              setTargetGroupId("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleMoveMembers}
              disabled={processing || !targetGroupId}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Members"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}