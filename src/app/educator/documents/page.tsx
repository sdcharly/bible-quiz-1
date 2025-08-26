"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentProcessingStatus } from "@/components/document-processing-status";
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState
} from "@/components/educator-v2";
import { logger } from "@/lib/logger";
import {
  FileText, 
  Upload, 
  Trash2,
  AlertCircle,
  Search,
  Edit,
  Sparkles,
  BookOpen
} from "lucide-react";
import DocumentEditModal from "@/components/document/DocumentEditModal";

interface Document {
  id: string;
  filename: string;
  displayName?: string | null;
  remarks?: string | null;
  fileSize: number;
  mimeType: string;
  status: "pending" | "processing" | "processed" | "failed" | "deleted";
  uploadDate: string;
  processedData?: {
    status?: string;
    message?: string;
    trackId?: string;
    lightragDocumentId?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    uploadedAt?: string;
    lightragUrl?: string;
    processedBy?: string;
    error?: string;
    [key: string]: unknown;
  };
  filePath?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/educator/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      logger.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: string, documentName?: string) => {
    const doc = documents.find(d => d.id === documentId);
    const confirmMessage = doc?.status === "processing" 
      ? `"${documentName || 'This document'}" is currently being processed. Deleting it will interrupt the processing. Are you sure?`
      : `Are you sure you want to delete "${documentName || 'this document'}"? This will also remove it from LightRAG if it was processed.`;
      
    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/educator/documents/${documentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        await fetchDocuments();
        
        const details = data.details;
        let successMessage = data.message || "Document marked as deleted.";
        
        if (details?.hasQuizDependencies) {
          successMessage += "\n\n⚠️ Note: This document is still being used by the following quizzes:\n";
          if (details.affectedQuizzes && details.affectedQuizzes.length > 0) {
            details.affectedQuizzes.forEach((quiz: { title: string; questionCount: number }) => {
              successMessage += `• ${quiz.title} (${quiz.questionCount} questions)\n`;
            });
          }
          successMessage += "\nThe document reference will be maintained for these quizzes.";
        }
        
        if (details?.lightragDeleted) {
          successMessage += "\n\n✓ Document was also removed from LightRAG successfully.";
        } else if (details?.lightragError) {
          successMessage += "\n\n⚠️ Note: Could not remove from LightRAG. It may have been removed already or there was an error.";
        }
        
        alert(successMessage);
      } else {
        alert(data.error || "Failed to delete document");
      }
    } catch (error) {
      logger.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (displayName: string, remarks: string) => {
    if (!editingDocument) return;

    try {
      const response = await fetch(`/api/educator/documents/${editingDocument.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, remarks }),
      });

      if (response.ok) {
        await fetchDocuments();
        setIsEditModalOpen(false);
        setEditingDocument(null);
      } else {
        alert("Failed to update document");
      }
    } catch (error) {
      logger.error("Error updating document:", error);
      alert("Failed to update document");
    }
  };

  const handleCreateQuiz = (documentId: string) => {
    router.push(`/educator/quiz/create?documentId=${documentId}`);
  };

  const handleStatusChange = (documentId: string) => {
    return (status: string, isComplete: boolean) => {
      // Update the document status in the local state
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: status as any }
            : doc
        )
      );
      
      // If processing is complete, refresh to get latest data
      if (isComplete) {
        fetchDocuments();
      }
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = (doc.displayName || doc.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.remarks?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return <LoadingState fullPage text="Loading documents..." />;
  }

  return (
    <>
      <PageHeader
        title="Document Library"
        subtitle="Manage your biblical study documents"
        icon={FileText}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Documents' }
        ]}
        actions={
          <Link href="/educator/documents/upload">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </Link>
        }
      />

      <PageContainer>
        <Section transparent>
          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Documents List */}
          {filteredDocuments.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No documents found"
              description={searchTerm || filterStatus !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Upload your first document to get started"}
              action={{
                label: "Upload Document",
                onClick: () => router.push("/educator/documents/upload")
              }}
            />
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg border border-amber-100 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {doc.displayName || doc.filename}
                        </h3>
                        <DocumentProcessingStatus 
                          documentId={doc.id}
                          initialStatus={doc.status}
                          onStatusChange={handleStatusChange(doc.id)}
                          compact={true}
                        />
                      </div>
                      
                      {doc.remarks ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {doc.remarks}
                        </p>
                      ) : null}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>Size: {formatFileSize(doc.fileSize)}</span>
                        <span>Uploaded: {formatDate(doc.uploadDate)}</span>
                        {doc.processedData?.lightragDocumentId ? (
                          <span className="text-amber-600">✓ In LightRAG</span>
                        ) : null}
                      </div>

                      {doc.status === "failed" && doc.processedData?.error ? (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm text-orange-700 dark:text-orange-400">
                              {doc.processedData.error}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(doc)}
                        className="border-amber-200 hover:bg-amber-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {doc.status === "processed" ? (
                        <Button
                          size="sm"
                          onClick={() => handleCreateQuiz(doc.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Create Quiz
                        </Button>
                      ) : null}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.displayName || doc.filename)}
                        disabled={doc.status === "deleted"}
                        className="border-orange-200 hover:bg-orange-50 text-orange-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </PageContainer>

      {editingDocument && (
        <DocumentEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDocument(null);
          }}
          document={editingDocument}
          onUpdate={(documentId, updates) => handleSaveEdit(updates.displayName, updates.remarks)}
        />
      )}
    </>
  );
}