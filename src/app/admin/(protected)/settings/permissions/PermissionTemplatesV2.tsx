"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  ConfirmDialog,
  EmptyState
} from "@/components/admin-v2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield, Save, Plus, Trash2, Edit2, 
  CheckCircle, XCircle, Users, BookOpen,
  FileText, BarChart, Download, Crown
} from "lucide-react";
import { logger } from "@/lib/logger";

interface PermissionTemplate {
  id: string;
  name: string;
  description: string | null;
  permissions: {
    canPublishQuiz: boolean;
    canAddStudents: boolean;
    canEditQuiz: boolean;
    canDeleteQuiz: boolean;
    canViewAnalytics: boolean;
    canExportData: boolean;
    maxStudents: number;
    maxQuizzes: number;
    maxQuestionsPerQuiz: number;
  };
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PermissionTemplatesV2Props {
  adminEmail: string;
  templates: PermissionTemplate[];
}

export default function PermissionTemplatesV2({ adminEmail, templates: initialTemplates }: PermissionTemplatesV2Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PermissionTemplate[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [newTemplate, setNewTemplate] = useState<Omit<PermissionTemplate, "id" | "createdAt" | "updatedAt">>({
    name: "",
    description: "",
    permissions: {
      canPublishQuiz: true,
      canAddStudents: true,
      canEditQuiz: true,
      canDeleteQuiz: false,
      canViewAnalytics: true,
      canExportData: false,
      maxStudents: 50,
      maxQuizzes: 10,
      maxQuestionsPerQuiz: 30
    },
    isDefault: false,
    isActive: true
  });

  const handleCreateTemplate = async () => {
    if (!newTemplate.name) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings/permissions/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        const { template } = await response.json();
        setTemplates([...templates, template]);
        setIsCreating(false);
        setNewTemplate({
          name: "",
          description: "",
          permissions: {
            canPublishQuiz: true,
            canAddStudents: true,
            canEditQuiz: true,
            canDeleteQuiz: false,
            canViewAnalytics: true,
            canExportData: false,
            maxStudents: 50,
            maxQuizzes: 10,
            maxQuestionsPerQuiz: 30
          },
          isDefault: false,
          isActive: true
        });
        toast({
          title: "Success",
          description: "Template created successfully"
        });
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to create template");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create template",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings/permissions/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate)
      });

      if (response.ok) {
        const { template } = await response.json();
        setTemplates(templates.map(t => t.id === template.id ? template : t));
        setEditingTemplate(null);
        toast({
          title: "Success",
          description: "Template updated successfully"
        });
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update template");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive"
      });
    }
    setIsSaving(false);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/settings/permissions/templates?id=${templateId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        toast({
          title: "Success",
          description: "Template deleted successfully"
        });
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete template");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive"
      });
    }
    setDeleteConfirm(null);
  };

  const getTemplateIcon = (template: PermissionTemplate) => {
    if (template.name.toLowerCase().includes("unlimited")) {
      return <Crown className="h-5 w-5 text-purple-500" />;
    }
    if (template.name.toLowerCase().includes("premium")) {
      return <Shield className="h-5 w-5 text-blue-500" />;
    }
    if (template.name.toLowerCase().includes("basic")) {
      return <Users className="h-5 w-5 text-green-500" />;
    }
    if (template.name.toLowerCase().includes("restricted") || template.name.toLowerCase().includes("read")) {
      return <Shield className="h-5 w-5 text-orange-500" />;
    }
    return <Shield className="h-5 w-5 text-gray-500" />;
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  const renderPermissionForm = (
    permissions: PermissionTemplate["permissions"],
    onChange: (permissions: PermissionTemplate["permissions"]) => void
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Actions</h4>
          {[
            { key: "canPublishQuiz", label: "Publish Quizzes", icon: BookOpen },
            { key: "canAddStudents", label: "Add Students", icon: Users },
            { key: "canEditQuiz", label: "Edit Quizzes", icon: Edit2 },
            { key: "canDeleteQuiz", label: "Delete Quizzes", icon: Trash2 },
            { key: "canViewAnalytics", label: "View Analytics", icon: BarChart },
            { key: "canExportData", label: "Export Data", icon: Download }
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-gray-500" />
                <Label htmlFor={key} className="text-sm">{label}</Label>
              </div>
              <Switch
                id={key}
                checked={permissions[key as keyof typeof permissions] as boolean}
                onCheckedChange={(checked) => onChange({
                  ...permissions,
                  [key]: checked
                })}
              />
            </div>
          ))}
        </div>
        
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Limits</h4>
          {[
            { key: "maxStudents", label: "Max Students" },
            { key: "maxQuizzes", label: "Max Quizzes" },
            { key: "maxQuestionsPerQuiz", label: "Max Questions/Quiz" }
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="text-sm">{label}</Label>
              <Input
                id={key}
                type="number"
                min="-1"
                value={permissions[key as keyof typeof permissions] as number}
                onChange={(e) => onChange({
                  ...permissions,
                  [key]: parseInt(e.target.value) || 0
                })}
                className="h-8"
                placeholder="-1 for unlimited"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Permission Templates"
        subtitle="Manage permission templates for educator accounts"
        icon={Shield}
        backButton={{ href: "/admin/dashboard" }}
      />

      <AdminSection title="Templates" className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define permission templates to control educator capabilities
          </p>
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No templates found"
            description="Create your first permission template to get started"
            action={{
              label: "Create Template",
              onClick: () => setIsCreating(true)
            }}
          />
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getTemplateIcon(template)}
                      <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <span>{template.name}</span>
                          {template.isDefault && (
                            <Badge variant="secondary" className="ml-2">Default</Badge>
                          )}
                          {!template.isActive && (
                            <Badge variant="destructive" className="ml-2">Inactive</Badge>
                          )}
                        </CardTitle>
                        {template.description && (
                          <CardDescription className="mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">Actions</h4>
                      <div className="space-y-1">
                        {Object.entries(template.permissions).map(([key, value]) => {
                          if (typeof value === "boolean") {
                            return (
                              <div key={key} className="flex items-center space-x-2">
                                {value ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                )}
                                <span className="text-xs">{key.replace(/^can/, "")}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">Limits</h4>
                      <div className="space-y-1 text-xs">
                        <div>Students: {formatLimit(template.permissions.maxStudents)}</div>
                        <div>Quizzes: {formatLimit(template.permissions.maxQuizzes)}</div>
                        <div>Questions: {formatLimit(template.permissions.maxQuestionsPerQuiz)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AdminSection>

      {/* Create Template Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Permission Template</DialogTitle>
            <DialogDescription>
              Define a new permission template for educators
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Premium Educator"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTemplate.description || ""}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Describe this template..."
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={newTemplate.isDefault}
                onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isDefault: checked })}
              />
              <Label htmlFor="isDefault">Set as default template</Label>
            </div>
            {renderPermissionForm(
              newTemplate.permissions,
              (permissions) => setNewTemplate({ ...newTemplate, permissions })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Permission Template</DialogTitle>
              <DialogDescription>
                Modify the template settings and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTemplate.description || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isDefault"
                  checked={editingTemplate.isDefault}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isDefault: checked })}
                />
                <Label htmlFor="edit-isDefault">Set as default template</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingTemplate.isActive}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
              {renderPermissionForm(
                editingTemplate.permissions,
                (permissions) => setEditingTemplate({ ...editingTemplate, permissions })
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          open={!!deleteConfirm}
          title="Delete Template"
          description="Are you sure you want to delete this template? This action cannot be undone."
          onConfirm={() => handleDeleteTemplate(deleteConfirm)}
          onOpenChange={() => setDeleteConfirm(null)}
        />
      )}
    </AdminPageContainer>
  );
}