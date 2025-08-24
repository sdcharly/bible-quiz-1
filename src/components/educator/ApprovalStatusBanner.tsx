"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, CheckCircle, XCircle, Clock, Info,
  Shield, Lock, Unlock, Users, BookOpen, BarChart
} from "lucide-react";

interface ApprovalStatusBannerProps {
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  permissions?: {
    canPublishQuiz?: boolean;
    canAddStudents?: boolean;
    canEditQuiz?: boolean;
    canDeleteQuiz?: boolean;
    canViewAnalytics?: boolean;
    canExportData?: boolean;
    maxStudents?: number;
    maxQuizzes?: number;
    maxQuestionsPerQuiz?: number;
  };
}

export default function ApprovalStatusBanner({ 
  approvalStatus, 
  rejectionReason,
  permissions 
}: ApprovalStatusBannerProps) {
  
  const getStatusIcon = () => {
    switch (approvalStatus) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "suspended":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-amber-500" />;
    }
  };

  const getStatusColor = () => {
    switch (approvalStatus) {
      case "approved":
        return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
      case "pending":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "rejected":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "suspended":
        return "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800";
      default:
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
    }
  };

  const getStatusBadgeVariant = () => {
    switch (approvalStatus) {
      case "approved":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      case "suspended":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (approvalStatus === "approved" && permissions?.canPublishQuiz) {
    // Don't show banner for fully approved educators with all permissions
    return null;
  }

  return (
    <Card className={`${getStatusColor()} border-2 mb-6`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <CardTitle className="text-lg">
              Account Status: 
              <Badge className="ml-2" variant={getStatusBadgeVariant()}>
                {approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
              </Badge>
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {approvalStatus === "pending" && (
          <>
            <Alert className="bg-white/50 dark:bg-gray-800/50">
              <Clock className="h-4 w-4" />
              <AlertTitle>Approval Pending</AlertTitle>
              <AlertDescription>
                Your educator account is pending approval from an administrator. 
                You have limited access until your account is approved.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Restrictions:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li className="flex items-center space-x-2">
                  <Lock className="h-3 w-3 text-gray-500" />
                  <span>Cannot publish quizzes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Lock className="h-3 w-3 text-gray-500" />
                  <span>Cannot add students</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Lock className="h-3 w-3 text-gray-500" />
                  <span>Limited to 1 draft quiz</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {approvalStatus === "rejected" && (
          <>
            <Alert className="bg-white/50 dark:bg-gray-800/50" variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Account Rejected</AlertTitle>
              <AlertDescription>
                Your educator application has been rejected.
                {rejectionReason && (
                  <div className="mt-2">
                    <strong>Reason:</strong> {rejectionReason}
                  </div>
                )}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please contact support if you believe this is an error or would like to reapply.
            </p>
          </>
        )}

        {approvalStatus === "suspended" && (
          <>
            <Alert className="bg-white/50 dark:bg-gray-800/50" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Account Suspended</AlertTitle>
              <AlertDescription>
                Your educator account has been temporarily suspended.
                {rejectionReason && (
                  <div className="mt-2">
                    <strong>Reason:</strong> {rejectionReason}
                  </div>
                )}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please contact support for more information about your suspension.
            </p>
          </>
        )}

        {approvalStatus === "approved" && permissions && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Permission Status Cards */}
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                {permissions.canPublishQuiz ? (
                  <Unlock className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Publish Quizzes</span>
              </div>
              
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                {permissions.canAddStudents ? (
                  <Unlock className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Add Students</span>
              </div>

              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                {permissions.canViewAnalytics ? (
                  <Unlock className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">View Analytics</span>
              </div>
            </div>

            {/* Limits */}
            {permissions.maxStudents !== -1 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Student Limit</span>
                </div>
                <Badge variant="outline">{permissions.maxStudents}</Badge>
              </div>
            )}

            {permissions.maxQuizzes !== -1 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Quiz Limit</span>
                </div>
                <Badge variant="outline">{permissions.maxQuizzes}</Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}