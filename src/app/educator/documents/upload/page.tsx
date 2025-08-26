"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Upload, 
  FileText, 
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { PageHeader } from "@/components/educator-v2/layout/PageHeader";
import { PageContainer } from "@/components/educator-v2/layout/PageContainer";
import { Section } from "@/components/educator-v2/layout/Section";
import { LoadingState } from "@/components/educator-v2/feedback/LoadingState";
import { EmptyState } from "@/components/educator-v2/feedback/EmptyState";
import { logger } from "@/lib/logger";

interface FileUpload {
  file: File;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  warnings?: string[];
  retryCount?: number;
  processingRequired?: boolean;
  trackId?: string;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain"
    ];

    const validFiles = newFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name} is not a supported file type. Please upload PDF, DOCX, DOC, or TXT files.`);
        return false;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit to protect server resources
        alert(`${file.name} is too large. Maximum file size is 2MB to protect server resources. Please use a smaller file or split large documents.`);
        return false;
      }
      if (file.size === 0) {
        alert(`${file.name} is empty and cannot be uploaded.`);
        return false;
      }
      return true;
    });

    const fileUploads: FileUpload[] = validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: "pending" as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...fileUploads]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    setIsUploading(true);
    
    for (const fileUpload of files) {
      if (fileUpload.status === "success") continue;
      
      setFiles(prev => prev.map(f => 
        f.id === fileUpload.id 
          ? { ...f, status: "uploading" as const, progress: 0 }
          : f
      ));

      try {
        const formData = new FormData();
        formData.append("file", fileUpload.file);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          ));
        }, 200);

        const response = await fetch("/api/educator/documents/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        const responseData = await response.json();

        if (response.ok && responseData.success) {
          const details = responseData.details || {};
          const warnings = details.validationWarnings || [];
          
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { 
                  ...f, 
                  status: "success" as const, 
                  progress: 100,
                  warnings: warnings.length > 0 ? warnings : undefined,
                  retryCount: details.retryCount || 0,
                  processingRequired: details.processingRequired,
                  trackId: responseData.document?.trackId
                }
              : f
          ));
          
          // Show enhanced success message
          if (responseData.message) {
            if (responseData.message.includes("duplicate")) {
              logger.log(`Note: ${responseData.message}`);
            } else if (details.retryCount > 0) {
              logger.log(`Upload succeeded after ${details.retryCount} retries`);
            }
          }
          
          // Log warnings for user awareness
          if (warnings.length > 0) {
            logger.warn(`Upload warnings for ${fileUpload.file.name}:`, warnings);
          }
        } else {
          const errorMessage = responseData.error || responseData.message || "Upload failed";
          const details = responseData.details || {};
          
          setFiles(prev => prev.map(f => 
            f.id === fileUpload.id 
              ? { 
                  ...f, 
                  status: "error" as const, 
                  error: errorMessage,
                  retryCount: details.retryCount || 0
                }
              : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id 
            ? { ...f, status: "error" as const, error: "Upload failed" }
            : f
        ));
      }
    }
    
    setIsUploading(false);
    
    // Show completion summary
    const successCount = files.filter(f => f.status === "success").length;
    const errorCount = files.filter(f => f.status === "error").length;
    const warningCount = files.filter(f => f.status === "success" && f.warnings && f.warnings.length > 0).length;
    
    if (successCount > 0 || errorCount > 0) {
      let message = `Upload completed: ${successCount} successful`;
      if (errorCount > 0) message += `, ${errorCount} failed`;
      if (warningCount > 0) message += `, ${warningCount} with warnings`;
      
      logger.log(message);
    }
    
    // Redirect to documents page after successful upload (only if all succeeded)
    if (files.length > 0 && files.every(f => f.status === "success")) {
      setTimeout(() => {
        router.push("/educator/documents");
      }, 2000); // Slightly longer delay to show completion status
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <PageContainer maxWidth="2xl">
      <PageHeader
        title="Upload Documents"
        subtitle="Upload biblical study materials for quiz generation"
        icon={Upload}
        backButton={{
          href: "/educator/documents",
          label: "Documents"
        }}
      />

      {/* Upload Area */}
      <Section transparent>
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
              : "border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-800"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-amber-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Drop files here or click to browse
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Supported formats: PDF, DOCX, DOC, TXT<br/>
            <span className="text-xs">Max 2MB per file • PDF files max 10 pages • To protect server resources</span>
          </p>
          <Input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileSelect}
          />
          <Label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer border-amber-200 hover:bg-amber-50" asChild>
              <span>Select Files</span>
            </Button>
          </Label>
        </div>
      </Section>

      {/* File List */}
      {files.length > 0 && (
        <Section
          title={`Selected Files (${files.length})`}
          description={`${files.filter(f => f.status === "success").length} of ${files.length} uploaded`}
          icon={FileText}
          actions={
            <div className="flex gap-3">
              <Link href="/educator/documents">
                <Button variant="outline" className="border-amber-200 hover:bg-amber-50">Cancel</Button>
              </Link>
              <Button
                onClick={uploadFiles}
                disabled={isUploading || files.length === 0 || files.every(f => f.status === "success")}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Files"
                )}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {files.map((fileUpload) => (
              <div
                key={fileUpload.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {fileUpload.file.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatFileSize(fileUpload.file.size)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {fileUpload.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileUpload.id)}
                        className="hover:bg-orange-50 hover:text-orange-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {fileUpload.status === "uploading" && (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                    )}
                    {fileUpload.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-amber-500" />
                    )}
                    {fileUpload.status === "error" && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <div className="text-sm text-orange-500">
                          <div>{fileUpload.error}</div>
                          {fileUpload.retryCount && fileUpload.retryCount > 0 && (
                            <div className="text-xs mt-1">Failed after {fileUpload.retryCount} retries</div>
                          )}
                        </div>
                      </div>
                    )}
                    {fileUpload.status === "success" && fileUpload.warnings && fileUpload.warnings.length > 0 && (
                      <div className="flex items-center gap-1 ml-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-xs text-amber-600" title={fileUpload.warnings.join('; ')}>
                          Warnings
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {fileUpload.status === "uploading" && (
                  <div className="mt-3">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-600 h-full transition-all duration-300"
                        style={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {fileUpload.progress}%
                    </div>
                  </div>
                )}
                
                {fileUpload.status === "success" && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between items-center">
                      <span>Upload completed successfully</span>
                      {fileUpload.processingRequired && (
                        <span className="text-amber-600 dark:text-amber-400">
                          Processing in background...
                        </span>
                      )}
                    </div>
                    {fileUpload.retryCount && fileUpload.retryCount > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Succeeded after {fileUpload.retryCount} retries
                      </div>
                    )}
                    {fileUpload.warnings && fileUpload.warnings.length > 0 && (
                      <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <div className="text-xs text-amber-800 dark:text-amber-200 font-medium mb-1">Warnings:</div>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
                          {fileUpload.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </PageContainer>
  );
}