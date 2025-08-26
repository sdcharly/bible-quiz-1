"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState
} from "@/components/educator-v2";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Settings,
  BookOpen,
  UserPlus,
  ChevronRight,
  Info,
  Crown,
  Shield,
  Swords,
  Heart,
  Star,
  Flame,
  Mountain,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";

interface Group {
  id: string;
  name: string;
  description: string | null;
  theme: string;
  color: string;
  maxSize: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

// Biblical theme icons mapping
const GROUP_ICONS: Record<string, React.ElementType> = {
  "Disciples": Users,
  "Apostles": Shield,
  "Prophets": BookOpen,
  "Elders": Crown,
  "Saints": Star,
  "Shepherds": Heart,
  "Witnesses": Mountain,
  "Messengers": Zap,
  "Warriors": Swords,
  "Servants": Heart,
  "Faithful": Star,
  "Redeemed": Flame,
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    theme: "Disciples",
    color: "amber",
    maxSize: 30,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/educator/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setTotalStudents(data.totalStudents || 0);
      }
    } catch (error) {
      logger.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch("/api/educator/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            // The API might return the group directly or wrapped in an object
            if (data.group) {
              setGroups([...groups, data.group]);
            } else if (data && data.id) {
              setGroups([...groups, data]);
            } else {
              // If response structure is unexpected, refetch
              await fetchGroups();
            }
          } catch (e) {
            // If response is not JSON, just refetch the groups
            await fetchGroups();
          }
        } else {
          // If response is empty, just refetch the groups
          await fetchGroups();
        }
        setShowCreateDialog(false);
        setFormData({
          name: "",
          description: "",
          theme: "Disciples",
          color: "amber",
          maxSize: 30,
        });
      } else {
        const text = await response.text();
        try {
          const error = text ? JSON.parse(text) : {};
          alert(error.message || "Failed to create group");
        } catch (e) {
          alert("Failed to create group");
        }
      }
    } catch (error) {
      logger.error("Error creating group:", error);
      alert("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formData.name.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch(`/api/educator/groups/${selectedGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            // The API returns { success, message, group }
            if (data.group) {
              setGroups(groups.map(g => g.id === selectedGroup.id ? data.group : g));
            } else if (data && data.id) {
              // In case the API returns the group directly
              setGroups(groups.map(g => g.id === selectedGroup.id ? data : g));
            } else {
              // If response structure is unexpected, refetch
              await fetchGroups();
            }
          } catch (e) {
            // If response is not JSON, just refetch the groups
            await fetchGroups();
          }
        } else {
          // If response is empty, just refetch the groups
          await fetchGroups();
        }
        setShowEditDialog(false);
        setSelectedGroup(null);
      } else {
        const text = await response.text();
        try {
          const error = text ? JSON.parse(text) : {};
          alert(error.message || "Failed to update group");
        } catch (e) {
          alert("Failed to update group");
        }
      }
    } catch (error) {
      logger.error("Error updating group:", error);
      alert("Failed to update group");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (group.memberCount > 0) {
      alert(`Cannot delete group "${group.name}" because it has ${group.memberCount} members. Please remove all members first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/educator/groups/${group.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGroups(groups.filter(g => g.id !== group.id));
      } else {
        const text = await response.text();
        try {
          const error = text ? JSON.parse(text) : {};
          alert(error.message || "Failed to delete group");
        } catch (e) {
          alert("Failed to delete group");
        }
      }
    } catch (error) {
      logger.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      theme: group.theme,
      color: group.color,
      maxSize: group.maxSize,
    });
    setShowEditDialog(true);
  };

  const filteredGroups = groups.filter(group => {
    if (!group || !group.name) return false;
    const nameMatch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = group.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return nameMatch || descMatch;
  });

  const getGroupColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      amber: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
      blue: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
      green: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
      purple: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
      red: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
    };
    return colors[color] || colors.amber;
  };

  if (loading) {
    return <LoadingState fullPage text="Loading groups..." />;
  }

  return (
    <>
      <PageHeader
        title="Biblical Study Groups"
        subtitle="Organize your disciples into focused study groups"
        icon={Users}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Groups' }
        ]}
        actions={
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        }
      />

      <PageContainer>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length}</p>
              </div>
              <Users className="h-8 w-8 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total Students</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStudents}</p>
              </div>
              <UserPlus className="h-8 w-8 text-amber-600 opacity-20" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Active Groups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {groups.filter(g => g.isActive).length}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-amber-600 opacity-20" />
            </div>
          </div>
        </div>

        <Section transparent>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Groups Grid */}
          {filteredGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchTerm ? "No groups found" : "No groups created yet"}
              description={searchTerm 
                ? "Try adjusting your search criteria" 
                : "Create your first study group to organize your disciples"}
              action={{
                label: "Create Group",
                onClick: () => setShowCreateDialog(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => {
                const GroupIcon = GROUP_ICONS[group.theme] || Users;
                const colorClasses = getGroupColorClasses(group.color);
                
                return (
                  <Card 
                    key={group.id} 
                    className={`hover:shadow-lg transition-shadow cursor-pointer border ${colorClasses.border}`}
                    onClick={() => router.push(`/educator/groups/${group.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
                            <GroupIcon className={`h-6 w-6 ${colorClasses.text}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <p className="text-sm text-gray-500">{group.theme}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(group);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-orange-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {group.description ? (
                        <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                      ) : null}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {group.memberCount} / {group.maxSize} members
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      </PageContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          setSelectedGroup(null);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? "Edit Group" : "Create New Group"}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog 
                ? "Update the details of your study group." 
                : "Create a new biblical study group for your disciples."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Morning Bible Study"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this group..."
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="theme">Biblical Theme</Label>
              <Select 
                value={formData.theme}
                onValueChange={(value) => setFormData({ ...formData, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(GROUP_ICONS).map((theme) => (
                    <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="maxSize">Maximum Size</Label>
              <Input
                id="maxSize"
                type="number"
                min="1"
                max="100"
                value={formData.maxSize}
                onChange={(e) => setFormData({ ...formData, maxSize: parseInt(e.target.value) || 30 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setShowEditDialog(false);
                setSelectedGroup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={showEditDialog ? handleUpdateGroup : handleCreateGroup}
              disabled={creating || !formData.name.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {creating ? (
                <LoadingState inline size="sm" text={showEditDialog ? "Updating..." : "Creating..."} />
              ) : (
                showEditDialog ? "Update Group" : "Create Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}