"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Loader2,
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
  
  // Form state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [maxSize, setMaxSize] = useState(30);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);

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
        setSuggestions(data.suggestions || []);
        setColors(data.colors || []);
      }
    } catch (error) {
      logger.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/educator/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: selectedColor,
          maxSize
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowCreateDialog(false);
        resetForm();
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create group");
      }
    } catch (error) {
      logger.error("Error creating group:", error);
      alert("Error creating group");
    } finally {
      setCreating(false);
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup || !groupName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`/api/educator/groups/${selectedGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          color: selectedColor,
          maxSize
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        setShowEditDialog(false);
        resetForm();
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update group");
      }
    } catch (error) {
      logger.error("Error updating group:", error);
      alert("Error updating group");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    const confirmMessage = group.memberCount > 0 
      ? `Are you sure you want to delete "${group.name}"? This group has ${group.memberCount} member(s).`
      : `Are you sure you want to delete "${group.name}"?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/educator/groups/${group.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchGroups();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete group");
      }
    } catch (error) {
      logger.error("Error deleting group:", error);
      alert("Error deleting group");
    }
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setSelectedColor(group.color);
    setMaxSize(group.maxSize);
    setShowEditDialog(true);
  };

  const resetForm = () => {
    setGroupName("");
    setGroupDescription("");
    setSelectedColor("#3B82F6");
    setMaxSize(30);
    setSelectedGroup(null);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGroupIcon = (groupName: string) => {
    const Icon = GROUP_ICONS[groupName] || Users;
    return Icon;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Student Groups
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Organize your students into biblical-themed groups
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/educator/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
                  <p className="text-2xl font-bold">{groups.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold">{totalStudents}</p>
                </div>
                <UserPlus className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Group Size</p>
                  <p className="text-2xl font-bold">
                    {groups.length > 0 ? Math.round(totalStudents / groups.length) : 0}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-8">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No groups yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first group to start organizing your students
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => {
              const Icon = getGroupIcon(group.name);
              return (
                <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/educator/groups/${group.id}`)}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: group.color + "20" }}>
                        <Icon className="h-6 w-6" style={{ color: group.color }} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(group);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    {group.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {group.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{group.memberCount} / {group.maxSize} members</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${(group.memberCount / group.maxSize) * 100}%`,
                            backgroundColor: group.color 
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a biblical-themed group to organize your students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestions.slice(0, 6).map((suggestion) => (
                      <Button
                        key={suggestion}
                        size="sm"
                        variant="outline"
                        onClick={() => setGroupName(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="color">Group Color</Label>
              <div className="flex gap-2 mt-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? "border-gray-900" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="maxSize">Maximum Size</Label>
              <Input
                id="maxSize"
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value) || 30)}
                min={5}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of students in this group
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Group Color</Label>
              <div className="flex gap-2 mt-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      selectedColor === color ? "border-gray-900" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-maxSize">Maximum Size</Label>
              <Input
                id="edit-maxSize"
                type="number"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value) || 30)}
                min={5}
                max={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}