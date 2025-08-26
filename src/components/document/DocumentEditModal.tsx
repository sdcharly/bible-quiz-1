"use client";

import { useState, useEffect } from "react";
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { PencilIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

interface Document {
  id: string;
  filename: string;
  displayName?: string | null;
  remarks?: string | null;
  status: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadDate: string;
}

interface DocumentEditModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (documentId: string, updates: { displayName: string; remarks: string }) => void;
}

export default function DocumentEditModal({ 
  document, 
  isOpen, 
  onClose, 
  onUpdate 
}: DocumentEditModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize form when document changes
  useEffect(() => {
    if (document) {
      setDisplayName(document.displayName || document.filename);
      setRemarks(document.remarks || "");
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!document) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/educator/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: displayName.trim() || document.filename,
          remarks: remarks.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document');
      }

      // Update the document in the parent component
      onUpdate(document.id, {
        displayName: displayName.trim() || document.filename,
        remarks: remarks.trim(),
      });

      toast({
        title: "Document updated successfully",
        description: "Your document name and remarks have been saved.",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    if (document) {
      setDisplayName(document.displayName || document.filename);
      setRemarks(document.remarks || "");
    }
    onClose();
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100">
            <PencilIcon className="h-5 w-5 text-amber-600" />
            Edit Document
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            Customize the display name and add remarks for your reference.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Original filename reference */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <DocumentTextIcon className="h-4 w-4" />
              <span className="font-medium">Original file:</span>
              <span className="font-mono">{document.filename}</span>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={document.filename}
              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is how the document will appear in your library
            </p>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Remarks (Optional)
            </Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add notes about this document for your reference..."
              className="bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-amber-500 focus:border-amber-500 min-h-[80px]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add notes to remember the content or purpose of this document
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}