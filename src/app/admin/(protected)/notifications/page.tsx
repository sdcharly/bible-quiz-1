"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Mail, 
  Settings, 
  Bell, 
  BellOff, 
  Clock, 
  Shield, 
  AlertTriangle, 
  Info,
  Send,
  CheckCircle,
  XCircle
} from "lucide-react";
import { AdminNotificationPreferences, NotificationEventType } from "@/lib/admin-notifications";

interface TestResult {
  type: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<AdminNotificationPreferences | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Event type configurations with descriptions
  const eventTypeConfig: Record<NotificationEventType, { 
    label: string; 
    description: string; 
    priority: 'critical' | 'high' | 'medium' | 'low';
    icon: string;
    color: string;
  }> = {
    'educator_signup_pending': { 
      label: 'New Educator Signups', 
      description: 'When a new educator registers and needs approval',
      priority: 'high',
      icon: '👨‍🏫',
      color: 'text-orange-600'
    },
    'security_breach_attempt': { 
      label: 'Security Breach Attempts', 
      description: 'Multiple failed login attempts or suspicious activity',
      priority: 'critical',
      icon: '🚨',
      color: 'text-red-600'
    },
    'system_critical_error': { 
      label: 'Critical System Errors', 
      description: 'System failures that require immediate attention',
      priority: 'critical',
      icon: '💥',
      color: 'text-red-600'
    },
    'payment_failure': { 
      label: 'Payment Failures', 
      description: 'Payment processing errors or billing issues',
      priority: 'critical',
      icon: '💳',
      color: 'text-red-600'
    },
    'database_connection_lost': { 
      label: 'Database Connection Issues', 
      description: 'Database connectivity problems',
      priority: 'critical',
      icon: '🗄️',
      color: 'text-red-600'
    },
    'educator_status_changed': { 
      label: 'Educator Status Changes', 
      description: 'When educators are approved, suspended, or reactivated',
      priority: 'high',
      icon: '👥',
      color: 'text-orange-600'
    },
    'performance_degradation': { 
      label: 'Performance Issues', 
      description: 'When system performance degrades significantly',
      priority: 'high',
      icon: '📈',
      color: 'text-orange-600'
    },
    'content_flagged': { 
      label: 'Content Moderation', 
      description: 'When quiz content is flagged for review',
      priority: 'high',
      icon: '🚩',
      color: 'text-orange-600'
    },
    'bulk_user_registration': { 
      label: 'Bulk User Activity', 
      description: 'Unusual patterns in user registrations',
      priority: 'high',
      icon: '👥',
      color: 'text-orange-600'
    },
    'api_rate_limit_exceeded': { 
      label: 'API Rate Limits', 
      description: 'When API usage exceeds normal limits',
      priority: 'high',
      icon: '⚡',
      color: 'text-orange-600'
    },
    'weekly_platform_stats': { 
      label: 'Weekly Platform Statistics', 
      description: 'Weekly summary of platform usage and growth',
      priority: 'medium',
      icon: '📊',
      color: 'text-blue-600'
    },
    'weekly_performance_report': { 
      label: 'Weekly Performance Reports', 
      description: 'System performance and health summaries',
      priority: 'medium',
      icon: '📈',
      color: 'text-blue-600'
    },
    'weekly_user_activity': { 
      label: 'Weekly User Activity', 
      description: 'User engagement and activity summaries',
      priority: 'low',
      icon: '👥',
      color: 'text-green-600'
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/admin/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setPendingCount(data.pendingCount);
      } else {
        setError('Failed to fetch notification preferences');
      }
    } catch (err) {
      setError('Error loading preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async () => {
    if (!preferences) return;
    
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/admin/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage('Notification preferences saved successfully!');
        setPreferences(data.preferences);
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (err) {
      setError('Error saving preferences');
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async (testType: 'low' | 'high' | 'critical') => {
    setTesting(testType);
    
    try {
      const response = await fetch('/api/admin/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType })
      });

      const data = await response.json();
      
      const result: TestResult = {
        type: testType,
        success: data.success,
        message: data.message,
        timestamp: new Date()
      };
      
      setTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
      
    } catch (err) {
      const result: TestResult = {
        type: testType,
        success: false,
        message: 'Error sending test notification',
        timestamp: new Date()
      };
      setTestResults(prev => [result, ...prev.slice(0, 4)]);
    } finally {
      setTesting(null);
    }
  };

  const toggleEventType = (eventType: NotificationEventType, enabled: boolean) => {
    if (!preferences) return;
    
    const updatedTypes = enabled 
      ? [...preferences.enabledEventTypes, eventType]
      : preferences.enabledEventTypes.filter(type => type !== eventType);
    
    setPreferences({
      ...preferences,
      enabledEventTypes: updatedTypes
    });
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: '🚨' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '⚠️' },
      medium: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📢' },
      low: { color: 'bg-green-100 text-green-800 border-green-200', icon: 'ℹ️' }
    };
    
    const { color, icon } = config[priority as keyof typeof config] || config.medium;
    
    return (
      <Badge className={`${color} border`}>
        {icon} {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4 text-amber-700 hover:text-amber-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Notifications</h1>
              <p className="text-gray-600 mt-2">Configure how you receive critical platform alerts</p>
            </div>
            <div className="flex items-center gap-4">
              {pendingCount > 0 && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  📬 {pendingCount} Pending
                </Badge>
              )}
              <Button
                onClick={updatePreferences}
                disabled={saving || !preferences}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {preferences && (
          <Tabs defaultValue="settings" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
              <TabsTrigger value="events">🔔 Events</TabsTrigger>
              <TabsTrigger value="test">🧪 Test</TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Basic Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-amber-600" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure where notifications should be sent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="adminEmail">Admin Email Address</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={preferences.adminEmail}
                        onChange={(e) => setPreferences({...preferences, adminEmail: e.target.value})}
                        placeholder="admin@biblequiz.textr.in"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select 
                        value={preferences.timezone} 
                        onValueChange={(value) => setPreferences({...preferences, timezone: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Quiet Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      Quiet Hours
                    </CardTitle>
                    <CardDescription>
                      Set hours when non-critical notifications should be delayed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quietStart">Start Time</Label>
                        <Input
                          id="quietStart"
                          type="time"
                          value={preferences.quietHoursStart || ''}
                          onChange={(e) => setPreferences({...preferences, quietHoursStart: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="quietEnd">End Time</Label>
                        <Input
                          id="quietEnd"
                          type="time"
                          value={preferences.quietHoursEnd || ''}
                          onChange={(e) => setPreferences({...preferences, quietHoursEnd: e.target.value})}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Critical alerts will still be sent immediately, even during quiet hours.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-600" />
                    Notification Events
                  </CardTitle>
                  <CardDescription>
                    Choose which events should trigger email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(eventTypeConfig).map(([eventType, config]) => {
                      const isEnabled = preferences.enabledEventTypes.includes(eventType as NotificationEventType);
                      
                      return (
                        <div key={eventType} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="text-2xl">{config.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-medium text-gray-900">{config.label}</h3>
                                {getPriorityBadge(config.priority)}
                              </div>
                              <p className="text-sm text-gray-600">{config.description}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(enabled) => toggleEventType(eventType as NotificationEventType, enabled)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Test Tab */}
            <TabsContent value="test" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Test Notifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-amber-600" />
                      Test Notifications
                    </CardTitle>
                    <CardDescription>
                      Send test emails to verify your notification settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={() => sendTestNotification('low')}
                        disabled={testing === 'low'}
                        variant="outline"
                        className="justify-start"
                      >
                        {testing === 'low' ? 'Sending...' : 'ℹ️ Send Low Priority Test'}
                      </Button>
                      
                      <Button
                        onClick={() => sendTestNotification('high')}
                        disabled={testing === 'high'}
                        variant="outline"
                        className="justify-start"
                      >
                        {testing === 'high' ? 'Sending...' : '⚠️ Send High Priority Test'}
                      </Button>
                      
                      <Button
                        onClick={() => sendTestNotification('critical')}
                        disabled={testing === 'critical'}
                        variant="outline"
                        className="justify-start"
                      >
                        {testing === 'critical' ? 'Sending...' : '🚨 Send Critical Priority Test'}
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      Test emails will be sent to: <strong>{preferences.adminEmail}</strong>
                    </p>
                  </CardContent>
                </Card>

                {/* Test Results */}
                <Card>
                  <CardHeader>
                    <CardTitle>Test Results</CardTitle>
                    <CardDescription>
                      Recent test notification results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {testResults.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No tests run yet</p>
                    ) : (
                      <div className="space-y-3">
                        {testResults.map((result, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              {result.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <div>
                                <p className="font-medium capitalize">{result.type} Priority Test</p>
                                <p className="text-sm text-gray-600">{result.message}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {result.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}