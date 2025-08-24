"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Shield, ArrowLeft, Save, Plus, Trash2, Edit, 
  CheckCircle, AlertCircle, Copy
} from "lucide-react";
import { toast } from "sonner";

export interface PermissionTemplate {
  name: string;
  description: string;
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
}

interface PermissionTemplatesProps {
  adminEmail: string;
  initialTemplates: Record<string, PermissionTemplate>;
}

export default function PermissionTemplates({ adminEmail, initialTemplates }: PermissionTemplatesProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Record<string, PermissionTemplate>>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState<PermissionTemplate>({
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
    }
  });

  const handleSaveTemplates = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ templates }),
      });

      if (response.ok) {
        toast.success("Permission templates saved successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save templates");
      }
    } catch (error) {
      console.error("Error saving templates:", error);
      toast.error("Failed to save permission templates");
    }
    setIsSaving(false);
  };

  const handleCreateTemplate = () => {
    const key = newTemplate.name.toLowerCase().replace(/\s+/g, "_");
    setTemplates({
      ...templates,
      [key]: { ...newTemplate }
    });
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
      }
    });
    setIsCreating(false);
    toast.success("Template created successfully");
  };

  const handleDeleteTemplate = (key: string) => {
    const newTemplates = { ...templates };
    delete newTemplates[key];
    setTemplates(newTemplates);
    toast.success("Template deleted successfully");
  };

  const handleDuplicateTemplate = (key: string) => {
    const template = templates[key];
    const newKey = `${key}_copy`;
    setTemplates({
      ...templates,
      [newKey]: {
        ...template,
        name: `${template.name} (Copy)`
      }
    });
    toast.success("Template duplicated successfully");
  };

  const updateTemplatePermission = (key: string, permission: string, value: boolean | number) => {
    setTemplates({
      ...templates,
      [key]: {
        ...templates[key],
        permissions: {
          ...templates[key].permissions,
          [permission]: value
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Shield className="h-8 w-8 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Permission Templates
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{adminEmail}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>New Template</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Permission Template</DialogTitle>
                    <DialogDescription>
                      Define a new permission template for educators
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Basic Educator"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        placeholder="Describe this template..."
                      />
                    </div>
                    <div className="space-y-4">
                      <h4 className="font-medium">Permissions</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(newTemplate.permissions).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <Label htmlFor={key} className="text-sm">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </Label>
                            {typeof value === "boolean" ? (
                              <Switch
                                id={key}
                                checked={value}
                                onCheckedChange={(checked) => 
                                  setNewTemplate({
                                    ...newTemplate,
                                    permissions: { ...newTemplate.permissions, [key]: checked }
                                  })
                                }
                              />
                            ) : (
                              <Input
                                id={key}
                                type="number"
                                value={value}
                                onChange={(e) => 
                                  setNewTemplate({
                                    ...newTemplate,
                                    permissions: { ...newTemplate.permissions, [key]: parseInt(e.target.value) }
                                  })
                                }
                                className="w-24"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTemplate} disabled={!newTemplate.name}>
                      Create Template
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button 
                onClick={handleSaveTemplates}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Permission templates define the default permissions for different educator tiers. 
            Changes to templates will only affect new educator approvals.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {Object.entries(templates).map(([key, template]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicateTemplate(key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTemplate(editingTemplate === key ? null : key)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!["basic", "advanced", "premium"].includes(key) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(key)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingTemplate === key ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(template.permissions).map(([permKey, permValue]) => (
                        <div key={permKey} className="flex items-center justify-between">
                          <Label htmlFor={`${key}-${permKey}`} className="text-sm">
                            {permKey.replace(/([A-Z])/g, " $1").trim()}
                          </Label>
                          {typeof permValue === "boolean" ? (
                            <Switch
                              id={`${key}-${permKey}`}
                              checked={permValue}
                              onCheckedChange={(checked) => 
                                updateTemplatePermission(key, permKey, checked)
                              }
                            />
                          ) : (
                            <Input
                              id={`${key}-${permKey}`}
                              type="number"
                              value={permValue}
                              onChange={(e) => 
                                updateTemplatePermission(key, permKey, parseInt(e.target.value))
                              }
                              className="w-24"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setEditingTemplate(null)}
                    >
                      Done Editing
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(template.permissions).map(([permKey, permValue]) => (
                      <div key={permKey} className="flex items-center space-x-2">
                        {typeof permValue === "boolean" ? (
                          permValue ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                          )
                        ) : null}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {permKey.replace(/([A-Z])/g, " $1").trim()}
                          {typeof permValue === "number" && `: ${permValue}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}