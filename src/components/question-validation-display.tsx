"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {


  CheckCircle,



  XCircle, 
  AlertCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import { QuestionValidationResult } from "@/lib/question-validator";

interface QuestionValidationDisplayProps {
  validation: QuestionValidationResult;
  questionId: string;
  questionText: string;
  suggestions?: string[];
  onRevalidate?: () => Promise<void>;
  compact?: boolean;
}

export function QuestionValidationDisplay({
  validation,
  questionText,
  suggestions = [],
  onRevalidate,
  compact = false
}: QuestionValidationDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const handleRevalidate = async () => {
    if (!onRevalidate) return;
    
    setIsRevalidating(true);
    try {
      await onRevalidate();
    } catch (error) {
      // [REMOVED: Console statement for performance]
    } finally {
      setIsRevalidating(false);
    }
  };

  const getValidationBadge = () => {
    if (validation.isValid) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle className="w-3 h-3 mr-1" />
          Valid ({validation.score}/100)
        </Badge>
      );
    } else {
      const variant = validation.score < 50 ? "destructive" : "secondary";
      return (
        <Badge variant={variant}>
          <XCircle className="w-3 h-3 mr-1" />
          Issues ({validation.score}/100)
        </Badge>
      );
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (compact && validation.isValid) {
    return (
      <div className="flex items-center gap-2">
        {getValidationBadge()}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getValidationBadge()}
          {onRevalidate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevalidate}
              disabled={isRevalidating}
              className="h-7 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${isRevalidating ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        
        {compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Question preview (compact mode) */}
      {compact && (
        <div className="text-sm text-gray-600 truncate">
          {questionText}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Entity Status - Only show if there are entities */}
          {(validation.validEntities.length > 0 || validation.invalidEntities.length > 0) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {validation.validEntities.length > 0 && (
                <div>
                  <div className="font-medium text-green-700 mb-1">
                    Valid Entities ({validation.validEntities.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {validation.validEntities.slice(0, 3).map((entity) => (
                      <Badge key={entity} variant="outline" className="text-xs text-green-700 border-green-300">
                        {entity}
                      </Badge>
                    ))}
                    {validation.validEntities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{validation.validEntities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {validation.invalidEntities.length > 0 && (
                <div>
                  <div className="font-medium text-red-700 mb-1">
                    Invalid Entities ({validation.invalidEntities.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {validation.invalidEntities.slice(0, 3).map((entity) => (
                      <Badge key={entity} variant="outline" className="text-xs text-red-700 border-red-300">
                        {entity}
                      </Badge>
                    ))}
                    {validation.invalidEntities.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{validation.invalidEntities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Issues */}
          {validation.issues.length > 0 && (
            <div>
              <div className="font-medium mb-2">Issues Found:</div>
              <div className="space-y-2">
                {validation.issues.map((issue, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 p-2 rounded border ${getSeverityColor(issue.severity)}`}
                  >
                    {getSeverityIcon(issue.severity)}
                    <div className="text-sm">
                      <div className="font-medium capitalize">{issue.type.replace('_', ' ')} Issue</div>
                      <div className="text-gray-700">{issue.message}</div>
                      {issue.entity && (
                        <div className="text-xs text-gray-500 mt-1">
                          Related to: <code className="bg-gray-200 px-1 rounded">{issue.entity}</code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="font-medium mb-2">Improvement Suggestions:</div>
              <ul className="text-sm text-gray-700 space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}