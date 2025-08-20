"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Upload, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter
} from "lucide-react";

interface Document {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: "pending" | "processing" | "processed" | "failed";
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

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This will also remove it from the document processing service.")) return;

    try {
      const response = await fetch(`/api/educator/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(documents.filter(doc => doc.id !== documentId));
        
        // Log deletion details
        console.log("Document deletion completed:", {
          localId: data.localDocumentId,
          lightragId: data.lightragDocumentId,
          deletedFromLightRAG: data.deletedFromLightRAG
        });
        
        if (data.deletedFromLightRAG) {
          console.log(`Document successfully deleted from both systems (LightRAG ID: ${data.lightragDocumentId})`);
        } else {
          console.log("Document deleted from local database only (no LightRAG ID found)");
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to delete document: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("An error occurred while deleting the document.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "processed":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "processing":
        return <Clock className="h-3 w-3 text-yellow-500 animate-spin" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: Document["status"]) => {
    switch (status) {
      case "processed":
        return "Ready";
      case "processing":
        return "Processing...";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Documents
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload and manage study materials for quiz creation
            </p>
          </div>
          <Link href="/educator/documents/upload">
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
          </select>
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No documents found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || filterStatus !== "all" 
                ? "Try adjusting your search or filters"
                : "Upload your first document to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(doc.status)}
                          <span>{getStatusText(doc.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {doc.status === "processed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/educator/quiz/create?documentId=${doc.id}`)}
                      >
                        Create Quiz
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}