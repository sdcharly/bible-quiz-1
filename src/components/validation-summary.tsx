"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface ValidationSummaryProps {
  summary: {
    totalQuestions: number;
    validQuestions: number;
    invalidQuestions: number;
    averageScore: number;
    issueCount: {
      high: number;
      medium: number;
      low: number;
    };
    overallValid: boolean;
  };
  onRevalidateAll?: () => Promise<void>;
  isRevalidating?: boolean;
}

export function ValidationSummary({ 
  summary, 
  onRevalidateAll,
  isRevalidating = false 
}: ValidationSummaryProps) {
  const validationPercentage = (summary.validQuestions / summary.totalQuestions) * 100;
  
  const getOverallStatus = () => {
    if (summary.overallValid) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: "All questions validated",
        color: "text-green-700",
        bgColor: "bg-green-50 border-green-200"
      };
    } else if (summary.issueCount.high > 0) {
      return {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        text: "Critical issues found",
        color: "text-red-700",
        bgColor: "bg-red-50 border-red-200"
      };
    } else {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: "Some questions need review",
        color: "text-yellow-700",
        bgColor: "bg-yellow-50 border-yellow-200"
      };
    }
  };

  const status = getOverallStatus();

  return (
    <div className={`border rounded-lg p-6 ${status.bgColor}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <h3 className={`text-lg font-semibold ${status.color}`}>
                Question Validation Summary
              </h3>
              <p className="text-sm text-gray-600">{status.text}</p>
            </div>
          </div>

          {onRevalidateAll && (
            <Button
              variant="outline"
              onClick={onRevalidateAll}
              disabled={isRevalidating}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRevalidating ? 'animate-spin' : ''}`} />
              Revalidate All
            </Button>
          )}
        </div>

        {/* Progress and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Validation Progress</span>
              <span>{summary.validQuestions}/{summary.totalQuestions}</span>
            </div>
            <Progress value={validationPercentage} className="h-2" />
            <div className="text-xs text-gray-600">
              {validationPercentage.toFixed(1)}% questions validated
            </div>
          </div>

          {/* Average Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Average Score</span>
              <div className="flex items-center gap-1">
                {summary.averageScore >= 80 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : summary.averageScore >= 60 ? (
                  <TrendingUp className="w-4 h-4 text-yellow-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-lg font-bold ${
                  summary.averageScore >= 80 ? 'text-green-600' :
                  summary.averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {summary.averageScore}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Out of 100 points
            </div>
          </div>

          {/* Issue Breakdown */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Issues Found</span>
            <div className="flex gap-2 flex-wrap">
              {summary.issueCount.high > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.issueCount.high} Critical
                </Badge>
              )}
              {summary.issueCount.medium > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  {summary.issueCount.medium} Medium
                </Badge>
              )}
              {summary.issueCount.low > 0 && (
                <Badge variant="outline" className="text-xs">
                  {summary.issueCount.low} Low
                </Badge>
              )}
              {(summary.issueCount.high + summary.issueCount.medium + summary.issueCount.low) === 0 && (
                <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                  No Issues
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="pt-4 border-t">
          {summary.overallValid ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                All questions are well-connected to your source material and ready for use.
              </span>
            </div>
          ) : summary.issueCount.high > 0 ? (
            <div className="flex items-start gap-2 text-red-700">
              <XCircle className="w-4 h-4 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Critical issues detected.</span>
                <br />
                Review questions with high-severity validation issues before publishing the quiz.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-yellow-700">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Minor issues detected.</span>
                <br />
                Consider reviewing flagged questions to improve their connection to your source material.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}