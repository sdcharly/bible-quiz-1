"use client";

import { Clock, Calendar, CheckCircle, AlertCircle, Archive, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";


interface QuizStatusBadgeProps {
  status: string;
  schedulingStatus?: string;
  hasStartTime?: boolean;
  startTime?: string | Date | null;
  className?: string;
}

export function QuizStatusBadge({
  status,
  schedulingStatus,
  hasStartTime,
  startTime,
  className = ""
}: QuizStatusBadgeProps) {
  // Determine badge appearance based on status and scheduling
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let icon = null;
  let text = status;
  let additionalInfo = "";

  // Handle quiz status
  switch (status) {
    case "draft":
      variant = "secondary";
      icon = <Edit className="h-3 w-3 mr-1" />;
      text = "Draft";
      
      // Add scheduling info for draft quizzes
      if (schedulingStatus === "deferred") {
        if (hasStartTime) {
          additionalInfo = " • Time Set";
          icon = <Calendar className="h-3 w-3 mr-1" />;
        } else {
          additionalInfo = " • Awaiting Schedule";
          icon = <Clock className="h-3 w-3 mr-1" />;
        }
      }
      break;

    case "published":
      variant = "default";
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      text = "Published";
      
      // Add timing info for published quizzes
      if (schedulingStatus === "deferred" && !hasStartTime) {
        variant = "outline";
        additionalInfo = " • Time Not Set";
        icon = <AlertCircle className="h-3 w-3 mr-1" />;
      } else if (startTime) {
        const now = new Date();
        const quizStart = typeof startTime === 'string' ? new Date(startTime) : startTime;
        
        if (quizStart > now) {
          const hoursUntil = Math.ceil((quizStart.getTime() - now.getTime()) / (1000 * 60 * 60));
          if (hoursUntil <= 24) {
            additionalInfo = ` • Starts in ${hoursUntil}h`;
          } else {
            const daysUntil = Math.ceil(hoursUntil / 24);
            additionalInfo = ` • Starts in ${daysUntil}d`;
          }
        }
      }
      break;

    case "completed":
      variant = "secondary";
      icon = <CheckCircle className="h-3 w-3 mr-1" />;
      text = "Completed";
      break;

    case "archived":
      variant = "outline";
      icon = <Archive className="h-3 w-3 mr-1" />;
      text = "Archived";
      break;

    default:
      variant = "outline";
      text = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <Badge variant={variant} className={`flex items-center ${className}`}>
      {icon}
      <span>{text}{additionalInfo}</span>
    </Badge>
  );
}

export default QuizStatusBadge;