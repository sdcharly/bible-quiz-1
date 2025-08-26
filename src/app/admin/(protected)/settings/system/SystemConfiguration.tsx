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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Shield, ArrowLeft, Save, Globe, Mail, 
  Lock, BookOpen, UserPlus, AlertCircle, X
} from "lucide-react";
import { toast } from "sonner";

interface SystemSettings {
  system_config: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    defaultTimezone: string;
    maxFileUploadSize: number;
    supportedFileTypes: string[];
  };
  quiz_defaults: {
    defaultDuration: number;
    maxQuestionsPerQuiz: number;
    allowRetake: boolean;
    showResults: boolean;
    showCorrectAnswers: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
  };
  registration_settings: {
    autoApproveEducators: boolean;
    requirePhoneNumber: boolean;
    allowStudentSelfRegistration: boolean;
    defaultStudentQuota: number;
    defaultQuizQuota: number;
  };
  email_settings: {
    sendWelcomeEmail: boolean;
    sendApprovalEmail: boolean;
    sendRejectionEmail: boolean;
    sendQuizInvitation: boolean;
    sendQuizReminder: boolean;
    reminderHoursBefore: number;
  };
  security_settings: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireStrongPassword: boolean;
    minPasswordLength: number;
    require2FA: boolean;
    allowedDomains: string[];
  };
}

interface SystemConfigurationProps {
  adminEmail: string;
  initialSettings: SystemSettings;
}

export default function SystemConfiguration({ adminEmail, initialSettings }: SystemConfigurationProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [newFileType, setNewFileType] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings/system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        toast.success("System settings saved successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
      toast.error("Failed to save system settings");
    }
    setIsSaving(false);
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: unknown) => {
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    });
  };

  const addFileType = () => {
    if (newFileType && !settings.system_config.supportedFileTypes.includes(newFileType)) {
      updateSetting("system_config", "supportedFileTypes", [
        ...settings.system_config.supportedFileTypes,
        newFileType.toLowerCase()
      ]);
      setNewFileType("");
    }
  };

  const removeFileType = (type: string) => {
    updateSetting(
      "system_config",
      "supportedFileTypes",
      settings.system_config.supportedFileTypes.filter(t => t !== type)
    );
  };

  const addDomain = () => {
    if (newDomain && !settings.security_settings.allowedDomains.includes(newDomain)) {
      updateSetting("security_settings", "allowedDomains", [
        ...settings.security_settings.allowedDomains,
        newDomain.toLowerCase()
      ]);
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    updateSetting(
      "security_settings",
      "allowedDomains",
      settings.security_settings.allowedDomains.filter(d => d !== domain)
    );
  };

  const timezones = [
    "UTC",
    "Asia/Kolkata",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
  ];

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
                  System Configuration
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{adminEmail}</p>
              </div>
            </div>
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {settings.system_config.maintenanceMode && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              Maintenance mode is currently enabled. Users cannot access the system.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">
              <Globe className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <BookOpen className="h-4 w-4 mr-2" />
              Quiz Defaults
            </TabsTrigger>
            <TabsTrigger value="registration">
              <UserPlus className="h-4 w-4 mr-2" />
              Registration
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure basic system settings and maintenance mode
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.system_config.siteName}
                      onChange={(e) => updateSetting("system_config", "siteName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select
                      value={settings.system_config.defaultTimezone}
                      onValueChange={(value) => updateSetting("system_config", "defaultTimezone", value)}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={settings.system_config.siteDescription}
                    onChange={(e) => updateSetting("system_config", "siteDescription", e.target.value)}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenance">Maintenance Mode</Label>
                      <p className="text-sm text-gray-500">Temporarily disable access to the system</p>
                    </div>
                    <Switch
                      id="maintenance"
                      checked={settings.system_config.maintenanceMode}
                      onCheckedChange={(checked) => updateSetting("system_config", "maintenanceMode", checked)}
                    />
                  </div>

                  {settings.system_config.maintenanceMode && (
                    <div className="space-y-2">
                      <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                      <Textarea
                        id="maintenanceMessage"
                        value={settings.system_config.maintenanceMessage}
                        onChange={(e) => updateSetting("system_config", "maintenanceMessage", e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="registration">Allow Registration</Label>
                      <p className="text-sm text-gray-500">Allow new users to register</p>
                    </div>
                    <Switch
                      id="registration"
                      checked={settings.system_config.allowRegistration}
                      onCheckedChange={(checked) => updateSetting("system_config", "allowRegistration", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailVerification">Require Email Verification</Label>
                      <p className="text-sm text-gray-500">Users must verify their email address</p>
                    </div>
                    <Switch
                      id="emailVerification"
                      checked={settings.system_config.requireEmailVerification}
                      onCheckedChange={(checked) => updateSetting("system_config", "requireEmailVerification", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Upload Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={settings.system_config.maxFileUploadSize}
                      onChange={(e) => updateSetting("system_config", "maxFileUploadSize", parseInt(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Supported File Types</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {settings.system_config.supportedFileTypes.map((type) => (
                        <Badge key={type} variant="secondary" className="flex items-center gap-1">
                          {type}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeFileType(type)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add file type (e.g., pdf)"
                        value={newFileType}
                        onChange={(e) => setNewFileType(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addFileType()}
                      />
                      <Button onClick={addFileType}>Add</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Defaults */}
          <TabsContent value="quiz">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Default Settings</CardTitle>
                <CardDescription>
                  Set default values for new quizzes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultDuration">Default Duration (minutes)</Label>
                    <Input
                      id="defaultDuration"
                      type="number"
                      value={settings.quiz_defaults.defaultDuration}
                      onChange={(e) => updateSetting("quiz_defaults", "defaultDuration", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxQuestions">Max Questions Per Quiz</Label>
                    <Input
                      id="maxQuestions"
                      type="number"
                      value={settings.quiz_defaults.maxQuestionsPerQuiz}
                      onChange={(e) => updateSetting("quiz_defaults", "maxQuestionsPerQuiz", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allowRetake">Allow Retake</Label>
                      <p className="text-sm text-gray-500">Students can retake quizzes</p>
                    </div>
                    <Switch
                      id="allowRetake"
                      checked={settings.quiz_defaults.allowRetake}
                      onCheckedChange={(checked) => updateSetting("quiz_defaults", "allowRetake", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showResults">Show Results</Label>
                      <p className="text-sm text-gray-500">Show results immediately after quiz</p>
                    </div>
                    <Switch
                      id="showResults"
                      checked={settings.quiz_defaults.showResults}
                      onCheckedChange={(checked) => updateSetting("quiz_defaults", "showResults", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showCorrectAnswers">Show Correct Answers</Label>
                      <p className="text-sm text-gray-500">Show correct answers in results</p>
                    </div>
                    <Switch
                      id="showCorrectAnswers"
                      checked={settings.quiz_defaults.showCorrectAnswers}
                      onCheckedChange={(checked) => updateSetting("quiz_defaults", "showCorrectAnswers", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                      <p className="text-sm text-gray-500">Randomize question order</p>
                    </div>
                    <Switch
                      id="shuffleQuestions"
                      checked={settings.quiz_defaults.shuffleQuestions}
                      onCheckedChange={(checked) => updateSetting("quiz_defaults", "shuffleQuestions", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="shuffleOptions">Shuffle Options</Label>
                      <p className="text-sm text-gray-500">Randomize answer options</p>
                    </div>
                    <Switch
                      id="shuffleOptions"
                      checked={settings.quiz_defaults.shuffleOptions}
                      onCheckedChange={(checked) => updateSetting("quiz_defaults", "shuffleOptions", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registration Settings */}
          <TabsContent value="registration">
            <Card>
              <CardHeader>
                <CardTitle>Registration Settings</CardTitle>
                <CardDescription>
                  Configure user registration and default quotas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoApprove">Auto-Approve Educators</Label>
                    <p className="text-sm text-gray-500">Automatically approve educator registrations</p>
                  </div>
                  <Switch
                    id="autoApprove"
                    checked={settings.registration_settings.autoApproveEducators}
                    onCheckedChange={(checked) => updateSetting("registration_settings", "autoApproveEducators", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requirePhone">Require Phone Number</Label>
                    <p className="text-sm text-gray-500">Phone number required during registration</p>
                  </div>
                  <Switch
                    id="requirePhone"
                    checked={settings.registration_settings.requirePhoneNumber}
                    onCheckedChange={(checked) => updateSetting("registration_settings", "requirePhoneNumber", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="studentSelfReg">Allow Student Self-Registration</Label>
                    <p className="text-sm text-gray-500">Students can register without educator invitation</p>
                  </div>
                  <Switch
                    id="studentSelfReg"
                    checked={settings.registration_settings.allowStudentSelfRegistration}
                    onCheckedChange={(checked) => updateSetting("registration_settings", "allowStudentSelfRegistration", checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentQuota">Default Student Quota</Label>
                    <Input
                      id="studentQuota"
                      type="number"
                      value={settings.registration_settings.defaultStudentQuota}
                      onChange={(e) => updateSetting("registration_settings", "defaultStudentQuota", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quizQuota">Default Quiz Quota</Label>
                    <Input
                      id="quizQuota"
                      type="number"
                      value={settings.registration_settings.defaultQuizQuota}
                      onChange={(e) => updateSetting("registration_settings", "defaultQuizQuota", parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>
                  Configure email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="welcomeEmail">Send Welcome Email</Label>
                    <p className="text-sm text-gray-500">Send email when users register</p>
                  </div>
                  <Switch
                    id="welcomeEmail"
                    checked={settings.email_settings.sendWelcomeEmail}
                    onCheckedChange={(checked) => updateSetting("email_settings", "sendWelcomeEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="approvalEmail">Send Approval Email</Label>
                    <p className="text-sm text-gray-500">Notify educators when approved</p>
                  </div>
                  <Switch
                    id="approvalEmail"
                    checked={settings.email_settings.sendApprovalEmail}
                    onCheckedChange={(checked) => updateSetting("email_settings", "sendApprovalEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="rejectionEmail">Send Rejection Email</Label>
                    <p className="text-sm text-gray-500">Notify educators when rejected</p>
                  </div>
                  <Switch
                    id="rejectionEmail"
                    checked={settings.email_settings.sendRejectionEmail}
                    onCheckedChange={(checked) => updateSetting("email_settings", "sendRejectionEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quizInvite">Send Quiz Invitation</Label>
                    <p className="text-sm text-gray-500">Send invitations for quiz enrollment</p>
                  </div>
                  <Switch
                    id="quizInvite"
                    checked={settings.email_settings.sendQuizInvitation}
                    onCheckedChange={(checked) => updateSetting("email_settings", "sendQuizInvitation", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="quizReminder">Send Quiz Reminder</Label>
                    <p className="text-sm text-gray-500">Send reminders before quiz starts</p>
                  </div>
                  <Switch
                    id="quizReminder"
                    checked={settings.email_settings.sendQuizReminder}
                    onCheckedChange={(checked) => updateSetting("email_settings", "sendQuizReminder", checked)}
                  />
                </div>

                {settings.email_settings.sendQuizReminder && (
                  <div className="space-y-2">
                    <Label htmlFor="reminderHours">Reminder Hours Before</Label>
                    <Input
                      id="reminderHours"
                      type="number"
                      value={settings.email_settings.reminderHoursBefore}
                      onChange={(e) => updateSetting("email_settings", "reminderHoursBefore", parseInt(e.target.value))}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Configure security and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security_settings.sessionTimeout}
                      onChange={(e) => updateSetting("security_settings", "sessionTimeout", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      value={settings.security_settings.maxLoginAttempts}
                      onChange={(e) => updateSetting("security_settings", "maxLoginAttempts", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
                    <Input
                      id="lockoutDuration"
                      type="number"
                      value={settings.security_settings.lockoutDuration}
                      onChange={(e) => updateSetting("security_settings", "lockoutDuration", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minPassword">Min Password Length</Label>
                    <Input
                      id="minPassword"
                      type="number"
                      value={settings.security_settings.minPasswordLength}
                      onChange={(e) => updateSetting("security_settings", "minPasswordLength", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="strongPassword">Require Strong Password</Label>
                      <p className="text-sm text-gray-500">Enforce complex password requirements</p>
                    </div>
                    <Switch
                      id="strongPassword"
                      checked={settings.security_settings.requireStrongPassword}
                      onCheckedChange={(checked) => updateSetting("security_settings", "requireStrongPassword", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="require2FA">Require 2FA</Label>
                      <p className="text-sm text-gray-500">Two-factor authentication for all users</p>
                    </div>
                    <Switch
                      id="require2FA"
                      checked={settings.security_settings.require2FA}
                      onCheckedChange={(checked) => updateSetting("security_settings", "require2FA", checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label>Allowed Email Domains</Label>
                  <p className="text-sm text-gray-500">Leave empty to allow all domains</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {settings.security_settings.allowedDomains.map((domain) => (
                      <Badge key={domain} variant="secondary" className="flex items-center gap-1">
                        {domain}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeDomain(domain)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add domain (e.g., example.com)"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addDomain()}
                    />
                    <Button onClick={addDomain}>Add</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}