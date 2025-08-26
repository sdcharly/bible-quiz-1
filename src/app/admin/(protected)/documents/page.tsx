"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Edit,
  Save
} from "lucide-react";

interface Document {
  internalId: string;
  filename: string;
  displayName?: string;
  status: string;
  uploadDate: string;
  currentIds: {
    trackId: string | null;
    lightragDocumentId: string | null;
    permanentDocId: string | null;
    filePath: string | null;
  };
  hasValidDocId: boolean;
  needsCorrection: boolean;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [newDocIds, setNewDocIds] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/admin/documents/list-all");
      const data = await response.json();
      
      if (response.ok) {
        setDocuments(data.documents || []);
        // [REMOVED: Console statement for performance]
      } else {
        // [REMOVED: Console statement for performance]
        setDocuments([]);
        
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Required",
            description: "Please ensure you're logged in as an admin",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to fetch documents",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
      toast({
        title: "Error",
        description: "Network error fetching documents",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDocId = async (internalId: string) => {
    const newDocId = newDocIds[internalId];
    
    if (!newDocId) {
      toast({
        title: "Error",
        description: "Please enter a LightRAG document ID",
        variant: "destructive"
      });
      return;
    }

    if (!newDocId.startsWith('doc-')) {
      toast({
        title: "Error",
        description: "LightRAG document ID must start with 'doc-'",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/documents/update-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalId,
          lightragDocId: newDocId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document ID updated successfully"
        });
        setEditingDoc(null);
        setNewDocIds({});
        await fetchDocuments();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update document ID",
          variant: "destructive"
        });
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
      toast({
        title: "Error",
        description: "Network error updating document",
        variant: "destructive"
      });
    }
  };

  const handleRunCleanup = async () => {
    if (!confirm("This will attempt to fix all document IDs by querying LightRAG. Continue?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/documents/cleanup-ids", {
        method: "POST"
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Cleanup Complete",
          description: `Fixed ${data.summary.fixed} documents, ${data.summary.alreadyCorrect} were already correct`
        });
        await fetchDocuments();
      } else {
        toast({
          title: "Error",
          description: "Cleanup failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      // [REMOVED: Console statement for performance]
      toast({
        title: "Error",
        description: "Network error during cleanup",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const needingCorrection = documents.filter(d => d.needsCorrection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Document ID Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage LightRAG document IDs for all documents in the system
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {documents.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Need Correction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {needingCorrection.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Valid IDs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {documents.filter(d => d.hasValidDocId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button onClick={fetchDocuments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRunCleanup} variant="default">
            <CheckCircle className="h-4 w-4 mr-2" />
            Run Auto Cleanup
          </Button>
        </div>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>
              Documents with red badges need their LightRAG IDs corrected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 pr-4">Filename</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Current IDs</th>
                    <th className="pb-2 pr-4">Valid?</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((doc) => (
                    <tr key={doc.internalId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 pr-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {doc.displayName || doc.filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {doc.internalId}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={
                          doc.status === 'processed' ? 'default' :
                          doc.status === 'processing' ? 'secondary' :
                          doc.status === 'failed' ? 'destructive' :
                          'outline'
                        }>
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs space-y-1">
                          {doc.currentIds.permanentDocId && (
                            <div>
                              <span className="font-medium">Permanent:</span> {doc.currentIds.permanentDocId}
                            </div>
                          )}
                          {doc.currentIds.lightragDocumentId && (
                            <div>
                              <span className="font-medium">LightRAG:</span> {doc.currentIds.lightragDocumentId}
                            </div>
                          )}
                          {doc.currentIds.trackId && (
                            <div>
                              <span className="font-medium">Track:</span> {doc.currentIds.trackId}
                            </div>
                          )}
                          {!doc.currentIds.permanentDocId && !doc.currentIds.lightragDocumentId && !doc.currentIds.trackId && (
                            <span className="text-gray-400">No IDs stored</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {doc.hasValidDocId ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </td>
                      <td className="py-3">
                        {editingDoc === doc.internalId ? (
                          <div className="flex gap-2">
                            <Input
                              className="w-48"
                              placeholder="doc-xxx..."
                              value={newDocIds[doc.internalId] || ''}
                              onChange={(e) => setNewDocIds({
                                ...newDocIds,
                                [doc.internalId]: e.target.value
                              })}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateDocId(doc.internalId)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingDoc(null);
                                setNewDocIds({});
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingDoc(doc.internalId)}
                            disabled={doc.hasValidDocId}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            {doc.hasValidDocId ? 'Valid' : 'Fix ID'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}