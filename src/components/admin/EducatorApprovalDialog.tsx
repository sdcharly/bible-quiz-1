"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Crown, Shield, User, Users } from "lucide-react";
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
}

interface EducatorApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  educatorId: string;
  educatorName: string;
  educatorEmail: string;
  onApprove: (templateId: string) => void;
}

export default function EducatorApprovalDialog({
  isOpen,
  onClose,
  educatorId,
  educatorName,
  educatorEmail,
  onApprove,
}: EducatorApprovalDialogProps) {
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings/permissions/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        
        // Auto-select default template
        const defaultTemplate = data.templates?.find((t: PermissionTemplate) => t.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      } else {
        logger.error("Failed to fetch templates");
      }
    } catch (error) {
      logger.error("Error fetching templates:", error);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedTemplateId) {
      alert("Please select a permission template");
      return;
    }

    setApproving(true);
    try {
      const response = await fetch(`/api/admin/educators/${educatorId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      if (response.ok) {
        onApprove(selectedTemplateId);
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to approve educator: ${data.error}`);
      }
    } catch (error) {
      alert(`Error approving educator: ${error}`);
    }
    setApproving(false);
  };

  const getTemplateIcon = (template: PermissionTemplate) => {
    if (template.name.toLowerCase().includes("unlimited")) {
      return <Crown className="h-5 w-5 text-purple-500" />;
    }
    if (template.name.toLowerCase().includes("premium")) {
      return <Shield className="h-5 w-5 text-blue-500" />;
    }
    if (template.name.toLowerCase().includes("restricted") || template.name.toLowerCase().includes("read")) {
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    }
    return <User className="h-5 w-5 text-green-500" />;
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? "Unlimited" : limit.toString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approve Educator</DialogTitle>
          <DialogDescription>
            Select a permission template for {educatorName} ({educatorEmail})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading templates...</div>
        ) : (
          <div className="space-y-4">
            <Label>Permission Template</Label>
            <RadioGroup
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedTemplateId === template.id 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950" 
                      : ""
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem 
                        value={template.id} 
                        id={template.id}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {getTemplateIcon(template)}
                          <Label 
                            htmlFor={template.id} 
                            className="text-base font-medium cursor-pointer"
                          >
                            {template.name}
                          </Label>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {template.description}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              {template.permissions.canPublishQuiz ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span>Publish Quizzes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {template.permissions.canEditQuiz ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span>Edit Quizzes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {template.permissions.canViewAnalytics ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span>View Analytics</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-500" />
                              <span>Max Students: {formatLimit(template.permissions.maxStudents)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-500" />
                              <span>Max Quizzes: {formatLimit(template.permissions.maxQuizzes)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-500" />
                              <span>Max Questions: {formatLimit(template.permissions.maxQuestionsPerQuiz)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>

            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No permission templates found. Please create templates first.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={approving}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={!selectedTemplateId || approving}
          >
            {approving ? "Approving..." : "Approve Educator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}