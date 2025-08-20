"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentProcessingStatusProps {
  documentId: string;
  initialStatus?: string;
  onStatusChange?: (status: string, isComplete: boolean) => void;
}

interface ProcessingProgress {
  status: string;
  isComplete: boolean;
  isFailed: boolean;
  isProcessing: boolean;
  progress: number | null;
  latestMessage?: string;
  processingStarted?: string;
  processingCompleted?: string;
  lastChecked?: string;
}

export function DocumentProcessingStatus({ 
  documentId, 
  initialStatus = "pending",
  onStatusChange 
}: DocumentProcessingStatusProps) {
  const [progress, setProgress] = useState<ProcessingProgress>({
    status: initialStatus,
    isComplete: initialStatus === "processed",
    isFailed: initialStatus === "failed",
    isProcessing: initialStatus === "processing",
    progress: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchStatus = async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      const endpoint = forceRefresh 
        ? `/api/educator/documents/${documentId}/status`
        : `/api/educator/documents/${documentId}/status`;
      
      const response = await fetch(endpoint, {
        method: forceRefresh ? "POST" : "GET"
      });

      if (!response.ok) {
        throw new Error("Failed to fetch document status");
      }

      const data = await response.json();
      
      if (data.success) {
        const newProgress = data.data;
        setProgress(newProgress);
        
        // Notify parent component of status change
        onStatusChange?.(newProgress.status, newProgress.isComplete);

        if (forceRefresh) {
          toast({
            title: "Status Updated",
            description: `Document status: ${newProgress.status}`,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching document status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch document status",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Poll for status updates when processing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (progress.isProcessing && !progress.isComplete) {
      interval = setInterval(() => {
        fetchStatus();
      }, 10000); // Check every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [progress.isProcessing, progress.isComplete]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [documentId]);

  const getStatusBadge = () => {
    switch (progress.status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Processing
          </Badge>
        );
      case "processed":
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3" />
            Processed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Unknown
          </Badge>
        );
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchStatus(true)}
            disabled={isRefreshing}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {progress.isProcessing && progress.progress !== null && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Processing progress</span>
            <span>{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
        </div>
      )}

      {progress.latestMessage && (
        <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
          <div className="font-medium">Latest update:</div>
          <div className="text-xs mt-1">{progress.latestMessage}</div>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        {progress.processingStarted && (
          <div>Started: {formatTimestamp(progress.processingStarted)}</div>
        )}
        {progress.processingCompleted && (
          <div>Completed: {formatTimestamp(progress.processingCompleted)}</div>
        )}
        {progress.lastChecked && (
          <div>Last checked: {formatTimestamp(progress.lastChecked)}</div>
        )}
      </div>

      {progress.isComplete && (
        <div className="text-sm text-green-600 font-medium flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Document is ready for quiz creation
        </div>
      )}

      {progress.isFailed && (
        <div className="text-sm text-red-600 font-medium flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          Document processing failed. Please try uploading again.
        </div>
      )}
    </div>
  );
}