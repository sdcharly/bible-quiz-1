"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DocumentProcessingStatus } from "@/components/document-processing-status";
import { 
  FileText, 
  Upload, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Edit
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
      console.error("Error fetching documents:", error);
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
        // Successfully marked as deleted - refresh the list to show the updated status
        await fetchDocuments();
        
        // Show detailed success message
        const details = data.details;
        let successMessage = data.message || "Document marked as deleted.";
        
        if (details?.hasQuizDependencies) {
          successMessage += "\n\n⚠️ Note: This document is still being used by the following quizzes:\n";
          if (details.affectedQuizzes && details.affectedQuizzes.length > 0) {
            details.affectedQuizzes.forEach((quiz: { title?: string }) => {
              successMessage += `• ${quiz.title || quiz}\n`;
            });
          }
          successMessage += "\nThe document will remain grayed out but cannot be fully removed.";
        } else if (details?.lightragDeletion?.success) {
          if (details.lightragDeletion.verified) {
            successMessage += "\n✅ Successfully removed from LightRAG knowledge base.";
          } else {
            successMessage += "\n⚠️ Removed from LightRAG but verification timed out.";
          }
        } else if (details?.lightragDocumentId) {
          successMessage += "\n⚠️ Local deletion successful, but LightRAG removal may have failed.";
        }

        if (details?.warnings && details.warnings.length > 0) {
          console.warn("Deletion warnings:", details.warnings);
        }

        alert(successMessage);
        
        console.log("Document deletion/marking completed:", details);
        
      } else {
        // Handle specific error cases with better user feedback
        if (response.status === 429) {
          alert(`Cannot delete document: ${data.error}\n\nPlease wait ${data.retryAfter || 30} seconds and try again.`);
        } else if (response.status === 403) {
          alert(`Access denied: ${data.error}\n\n${data.details || ''}`);
        } else if (response.status === 503) {
          alert(`Service temporarily unavailable: ${data.error}\n\nPlease try again in ${data.retryAfter || 60} seconds.`);
        } else {
          alert(`Failed to delete document: ${data.error || "Unknown error"}`);
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Network error occurred while deleting the document. Please check your connection and try again.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleStatusChange = (documentId: string) => (status: string, isComplete: boolean) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: status as Document["status"] }
          : doc
      )
    );
  };

  const handleEditDocument = (document: Document) => {
    setEditingDocument(document);
    setIsEditModalOpen(true);
  };

  const handleUpdateDocument = (documentId: string, updates: { displayName: string; remarks: string }) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? { ...doc, displayName: updates.displayName, remarks: updates.remarks }
          : doc
      )
    );
    setIsEditModalOpen(false);
    setEditingDocument(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDocument(null);
  };

  const filteredDocuments = documents.filter(doc => {
    const displayName = doc.displayName || doc.filename;
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.remarks && doc.remarks.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Documents
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Upload and manage study materials
            </p>
          </div>
          <Link href="/educator/documents/upload">
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
        </div>

        {/* File size and page limit warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 mb-3">
          <div className="flex items-center">
            <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Limits:</strong> 2MB max, PDFs ≤10 pages
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="processed">Ready</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
            <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              No documents found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {searchTerm || filterStatus !== "all" 
                ? "Try adjusting your search or filters"
                : "Upload your first document to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-lg border p-2 transition-colors ${
                  doc.status === "deleted" 
                    ? "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60" 
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Document Info - Compact */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className={`h-4 w-4 flex-shrink-0 ${
                      doc.status === "deleted" ? "text-gray-300" : "text-gray-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium truncate ${
                          doc.status === "deleted" 
                            ? "text-gray-500 dark:text-gray-600 line-through" 
                            : "text-gray-900 dark:text-white"
                        }`} title={doc.displayName || doc.filename}>
                          {doc.displayName || doc.filename}
                        </h3>
                        {doc.displayName && doc.displayName !== doc.filename && (
                          <p className="text-xs text-gray-500 truncate" title={doc.filename}>
                            Original: {doc.filename}
                          </p>
                        )}
                        {doc.remarks && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 truncate" title={doc.remarks}>
                            📝 {doc.remarks}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(doc.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Badge and Actions - Compact */}
                  <div className="flex items-center gap-2">
                    <DocumentProcessingStatus
                      documentId={doc.id}
                      initialStatus={doc.status}
                      onStatusChange={handleStatusChange(doc.id)}
                      compact={true}
                    />
                    {doc.status === "processed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/educator/quiz/create?documentId=${doc.id}`)}
                        className="h-7 px-2 text-xs"
                      >
                        Create Quiz
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDocument(doc)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-amber-600"
                      title="Edit document name and remarks"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    {doc.status !== "deleted" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Edit Modal */}
      <DocumentEditModal
        document={editingDocument}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleUpdateDocument}
      />
    </div>
  );
}