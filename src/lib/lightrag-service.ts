import { db } from "./db";
import { documents } from "./schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const LIGHTRAG_API_KEY = process.env.LIGHTRAG_API_KEY || "";
const LIGHTRAG_BASE_URL = process.env.LIGHTRAG_BASE_URL || "https://lightrag-6bki.onrender.com";

// Validation function to check if API key is configured
function validateApiKey(): void {
  if (!LIGHTRAG_API_KEY) {
    logger.force("LIGHTRAG_API_KEY is not configured in environment variables");
    throw new Error("LightRAG API key is not configured. Please set LIGHTRAG_API_KEY environment variable.");
  }
}

export interface PipelineStatusResponse {
  autoscanned: boolean;
  busy: boolean;
  job_name?: string;
  job_start?: string;
  docs: number;
  batchs: number;
  cur_batch: number;
  request_pending: boolean;
  latest_message?: string;
  history_messages?: string[];
  update_status: {
    _full_docs: boolean[];
    _text_chunks: boolean[];
    _full_entities: boolean[];
    _full_relations: boolean[];
    entities: boolean[];
    relationships: boolean[];
    chunks: boolean[];
    chunk_entity_relation: boolean[];
    _llm_response_cache: boolean[];
    _doc_status: boolean[];
  };
}

export interface EntityExistsResponse {
  exists: boolean;
  entity: string;
  message?: string;
}

export interface SubgraphResponse {
  nodes: Array<{
    id: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
}

export interface DeleteDocumentResponse {
  status: "deletion_started" | "busy" | "not_allowed" | "success" | "fail";
  message?: string;
  deleted_docs?: string[];
  failed_docs?: string[];
}

export interface ClearDocumentsResponse {
  status: "success" | "partial_success" | "busy" | "fail";
  message?: string;
  cleared_count?: number;
}

export interface UploadDocumentResponse {
  status: "success" | "duplicated" | "partial_success" | "failure";
  message: string;
  track_id?: string;
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export class LightRAGService {
  static async checkPipelineStatus(): Promise<PipelineStatusResponse> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/pipeline_status`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`LightRAG API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error checking LightRAG pipeline status:', error);
      throw error;
    }
  }

  static async updateDocumentProcessingStatus(documentId: string): Promise<boolean> {
    try {
      // Get document from database first
      const [document] = await db.select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // If already processed, no need to check further
      if (document.status === "processed") {
        return true;
      }

      const status = await this.checkPipelineStatus();
      
      // Extract chunk progress from latest_message if available
      let totalChunks: number | undefined;
      let processedChunks: number | undefined;
      
      if (status.latest_message) {
        const chunkMatch = status.latest_message.match(/Chunk (\d+) of (\d+)/);
        if (chunkMatch) {
          processedChunks = parseInt(chunkMatch[1]);
          totalChunks = parseInt(chunkMatch[2]);
        }
      }

      // Check if document is fully processed and ready for queries
      let isProcessed = false;
      let processingMessage = '';
      
      // Extract track ID from processed data
      const processedData = document.processedData as { 
        lightragDocumentId?: string; 
        trackId?: string; 
        [key: string]: unknown; 
      } | null;
      const trackId = processedData?.lightragDocumentId || processedData?.trackId;
      
      if (trackId) {
        // Use track ID to check if document is fully processed
        logger.log(`Checking track status for document ${documentId}, trackId: ${trackId}`);
        const trackStatus = await this.checkDocumentTrackStatus(trackId);
        
        // ALWAYS update permanent document ID if we got one
        if (trackStatus.documentId && trackStatus.documentId.startsWith('doc-')) {
          console.error(`[CRITICAL] Found permanent LightRAG doc ID: ${trackStatus.documentId} for document ${documentId}`);
          const currentData = document.processedData as Record<string, unknown> | null;
          
          // Update the database with the permanent document ID
          await db.update(documents)
            .set({
              processedData: {
                ...currentData,
                lightragDocumentId: trackStatus.documentId,
                permanentDocId: trackStatus.documentId,
                trackId: trackId
              }
            })
            .where(eq(documents.id, documentId));
          
          console.error(`[CRITICAL] Updated document ${documentId} with permanent ID: ${trackStatus.documentId}`);
        }
        
        if (trackStatus.processed) {
          isProcessed = true;
          processingMessage = 'Document fully indexed and ready for queries';
          logger.log(`Document ${documentId} is fully processed and ready for queries`);
        } else if (trackStatus.exists) {
          // Document exists but still being processed
          isProcessed = false;
          processingMessage = trackStatus.message || 'Document uploaded, indexing in progress...';
          logger.log(`Document ${documentId} exists but still being indexed: ${trackStatus.status}`);
        } else {
          // Track ID not found - might be an issue
          isProcessed = false;
          processingMessage = 'Document upload verification pending...';
          logger.log(`Document ${documentId} track ID not found, status: ${trackStatus.status}`);
        }
      } else {
        // No document ID yet - still uploading or pending
        isProcessed = false;
        processingMessage = status.busy ? 'Pipeline busy, document queued...' : 'Document pending upload...';
        logger.log(`Document ${documentId} has no LightRAG track ID yet`);
      }

      // Update document status in database
      await db.update(documents)
        .set({
          lightragProcessingStatus: {
            busy: status.busy,
            jobName: status.job_name,
            jobStart: status.job_start,
            docs: status.docs,
            batches: status.batchs,
            currentBatch: status.cur_batch,
            totalChunks,
            processedChunks,
            latestMessage: processingMessage || status.latest_message,
            lastChecked: new Date().toISOString()
          },
          status: isProcessed ? "processed" : "processing",
          processingCompletedAt: isProcessed ? new Date() : undefined,
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));

      return isProcessed;
    } catch (error) {
      logger.error(`Error updating document ${documentId} processing status:`, error);
      
      // Mark document as failed if there's an error
      await db.update(documents)
        .set({
          status: "failed",
          updatedAt: new Date()
        })
        .where(eq(documents.id, documentId));
      
      return false;
    }
  }

  static async pollDocumentStatus(documentId: string, maxAttempts: number = 60, intervalMs: number = 30000): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const isComplete = await this.updateDocumentProcessingStatus(documentId);
        
        if (isComplete) {
          logger.log(`Document ${documentId} processing completed`);
          return true;
        }
        
        logger.log(`Document ${documentId} still processing (attempt ${attempts + 1}/${maxAttempts}`);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        logger.error(`Error polling document ${documentId} status:`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }
    
    logger.error(`Document ${documentId} processing timeout after ${maxAttempts} attempts`);
    return false;
  }

  static async getDocumentProcessingProgress(documentId: string) {
    try {
      const document = await db.select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!document.length) {
        throw new Error(`Document ${documentId} not found`);
      }

      const doc = document[0];
      const status = doc.lightragProcessingStatus as {
        busy: boolean;
        jobName?: string;
        jobStart?: string;
        docs: number;
        batches: number;
        currentBatch: number;
        totalChunks?: number;
        processedChunks?: number;
        latestMessage?: string;
        lastChecked?: string;
      } | null;

      return {
        status: doc.status,
        isComplete: doc.status === "processed",
        isFailed: doc.status === "failed",
        isProcessing: doc.status === "processing",
        progress: status?.processedChunks && status?.totalChunks 
          ? Math.round((status.processedChunks / status.totalChunks) * 100)
          : null,
        latestMessage: status?.latestMessage,
        processingStarted: doc.processingStartedAt,
        processingCompleted: doc.processingCompletedAt,
        lastChecked: status?.lastChecked
      };
    } catch (error) {
      logger.error(`Error getting document ${documentId} processing progress:`, error);
      throw error;
    }
  }

  static async checkDocumentExists(documentId: string): Promise<boolean> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/${documentId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': LIGHTRAG_API_KEY,
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        return true;
      } else if (response.status === 404) {
        return false;
      } else {
        logger.warn(`Unexpected status when checking document ${documentId}: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error checking if document ${documentId} exists:`, error);
      return false;
    }
  }

  /**
   * Check the processing status of a specific document using its track ID
   * This tells us if the document is fully processed and ready for queries
   */
  static async checkDocumentTrackStatus(trackId: string): Promise<{
    exists: boolean;
    processed: boolean;
    status?: string;
    message?: string;
    documentId?: string;
  }> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/track_status/${trackId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': LIGHTRAG_API_KEY,
          'accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // CRITICAL DEBUG: Log the actual response structure
        console.error(`[CRITICAL] Track status response for ${trackId}:`, JSON.stringify(data, null, 2));
        
        // The track_status endpoint returns { track_id, documents: [], total_count, status_summary }
        const hasDocuments = data.documents && data.documents.length > 0;
        const documentCount = data.total_count || 0;
        
        // Extract the permanent document ID if available
        let permanentDocId = null;
        let documentStatus = null;
        
        if (hasDocuments && data.documents[0]) {
          permanentDocId = data.documents[0].id; // This is the "doc-xxx" ID
          documentStatus = data.documents[0].status;
          console.error(`[CRITICAL] Found permanent doc ID: ${permanentDocId}, status: ${documentStatus}`);
        }
        
        // Check status_summary for processed documents
        const statusSummary = data.status_summary || {};
        const processedCount = statusSummary.PROCESSED || statusSummary.processed || 0;
        const hasProcessedInSummary = processedCount > 0;
        
        console.error(`[CRITICAL] Status summary:`, statusSummary);
        console.error(`[CRITICAL] Has processed in summary: ${hasProcessedInSummary}, count: ${processedCount}`);
        
        // Document is processed if:
        // 1. We have documents in the array (they exist in LightRAG)
        // 2. Status summary shows PROCESSED > 0
        // 3. Individual document status is "PROCESSED"
        const isProcessed = hasDocuments || hasProcessedInSummary || 
                          (documentStatus && ['PROCESSED', 'processed', 'ready'].includes(documentStatus));
        
        logger.log(`Track ${trackId} processed: ${isProcessed} (docs: ${documentCount}, permanentId: ${permanentDocId})`);
        
        return {
          exists: true,
          processed: isProcessed,
          status: isProcessed ? 'ready' : 'tracking',
          message: isProcessed ? 
            `Document ready (ID: ${permanentDocId || trackId})` : 
            'Document still processing',
          documentId: permanentDocId // Return the permanent document ID
        };
      } else if (response.status === 404) {
        return {
          exists: false,
          processed: false,
          status: 'not_found'
        };
      } else {
        logger.warn(`Unexpected status when checking track ${trackId}: ${response.status}`);
        return {
          exists: false,
          processed: false,
          status: 'error'
        };
      }
    } catch (error) {
      logger.error(`Error checking track status for ${trackId}:`, error);
      return {
        exists: false,
        processed: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async checkEntityExists(entity: string): Promise<EntityExistsResponse> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/graph/entity/exists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        },
        body: JSON.stringify({ entity })
      });

      if (!response.ok) {
        throw new Error(`LightRAG entity check error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Error checking entity "${entity}":`, error);
      throw error;
    }
  }

  static async checkMultipleEntities(entities: string[]): Promise<Record<string, EntityExistsResponse>> {
    try {
      const results: Record<string, EntityExistsResponse> = {};
      
      // Check entities in parallel for better performance
      const promises = entities.map(async (entity) => {
        try {
          const result = await this.checkEntityExists(entity);
          return { entity, result };
        } catch (error) {
          return { 
            entity, 
            result: { exists: false, entity, message: error instanceof Error ? error.message : "Unknown error" }
          };
        }
      });

      const responses = await Promise.all(promises);
      responses.forEach(({ entity, result }) => {
        results[entity] = result;
      });

      return results;
    } catch (error) {
      logger.error('Error checking multiple entities:', error);
      throw error;
    }
  }

  static async getSubgraph(entities: string[], depth: number = 2): Promise<SubgraphResponse> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/graphs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        },
        body: JSON.stringify({ entities, depth })
      });

      if (!response.ok) {
        throw new Error(`LightRAG subgraph error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error getting subgraph:', error);
      throw error;
    }
  }

  static extractEntitiesFromText(text: string): string[] {
    // Basic entity extraction - looks for proper nouns and key terms
    // This could be enhanced with more sophisticated NLP
    const entities = [];
    
    // Extract potential proper nouns (capitalized words that aren't at sentence start)
    const properNounRegex = /(?<![.!?]\s)(?<!\.\s\s)\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
    const properNouns = text.match(properNounRegex) || [];
    entities.push(...properNouns);
    
    // Extract quoted terms (might be definitions or important concepts)
    const quotedTerms = text.match(/"([^"]+)"/g) || [];
    entities.push(...quotedTerms.map(term => term.replace(/"/g, '')));
    
    // Extract terms in parentheses (often definitions or explanations)
    const parentheticalTerms = text.match(/\(([^)]+)\)/g) || [];
    entities.push(...parentheticalTerms.map(term => term.replace(/[()]/g, '')));
    
    // Remove duplicates and filter out common words
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'these', 'those'];
    return [...new Set(entities)]
      .filter(entity => entity.length > 2 && !commonWords.includes(entity.toLowerCase()))
      .slice(0, 20); // Limit to first 20 entities to avoid API overload
  }

  static async deleteDocument(documentId: string, deleteFile: boolean = false): Promise<DeleteDocumentResponse> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/delete_document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        },
        body: JSON.stringify({
          doc_ids: [documentId],
          delete_file: deleteFile
        })
      });

      if (!response.ok) {
        throw new Error(`LightRAG delete error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Error deleting document "${documentId}":`, error);
      throw error;
    }
  }

  static async deleteMultipleDocuments(documentIds: string[], deleteFiles: boolean = false): Promise<DeleteDocumentResponse> {
    validateApiKey();
    try {
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/delete_document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        },
        body: JSON.stringify({
          doc_ids: documentIds,
          delete_file: deleteFiles
        })
      });

      if (!response.ok) {
        throw new Error(`LightRAG batch delete error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Error deleting documents ${documentIds.join(', ')}:`, error);
      throw error;
    }
  }

  static async verifyDocumentDeletion(documentId: string, maxAttempts: number = 10, intervalMs: number = 2000): Promise<boolean> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        // Check pipeline status to see if deletion is complete
        const status = await this.checkPipelineStatus();
        
        // If pipeline is not busy and no processing is happening, deletion should be complete
        if (!status.busy && !status.request_pending) {
          logger.log(`Document ${documentId} deletion verified as complete`);
          return true;
        }
        
        logger.log(`Deletion verification attempt ${attempts + 1}/${maxAttempts} - pipeline still processing`);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        logger.error(`Error verifying document ${documentId} deletion:`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }
    
    logger.warn(`Document ${documentId} deletion verification timeout after ${maxAttempts} attempts`);
    return false;
  }

  static async safeDeleteDocument(documentId: string): Promise<{
    success: boolean;
    lightragStatus: DeleteDocumentResponse | null;
    verified: boolean;
    error?: string;
  }> {
    try {
      logger.log(`Starting safe deletion of document: ${documentId}`);
      
      // Step 1: Check initial pipeline status
      const initialStatus = await this.checkPipelineStatus();
      if (initialStatus.busy) {
        return {
          success: false,
          lightragStatus: null,
          verified: false,
          error: "LightRAG is currently busy processing. Please try again later."
        };
      }

      // Step 2: Delete the document
      const deleteResponse = await this.deleteDocument(documentId, false);
      logger.log(`Delete response for ${documentId}:`, deleteResponse);

      // Step 3: Handle different deletion statuses
      if (deleteResponse.status === "not_allowed") {
        return {
          success: false,
          lightragStatus: deleteResponse,
          verified: false,
          error: "Deletion not allowed - document may be in use or protected"
        };
      }

      if (deleteResponse.status === "busy") {
        return {
          success: false,
          lightragStatus: deleteResponse,
          verified: false,
          error: "LightRAG is busy. Please try again in a moment."
        };
      }

      // Step 4: If deletion started or succeeded, verify completion
      let verified = false;
      if (deleteResponse.status === "deletion_started" || deleteResponse.status === "success") {
        verified = await this.verifyDocumentDeletion(documentId);
      }

      return {
        success: deleteResponse.status === "success" || deleteResponse.status === "deletion_started",
        lightragStatus: deleteResponse,
        verified,
        error: deleteResponse.status === "fail" ? deleteResponse.message : undefined
      };

    } catch (error) {
      logger.error(`Safe deletion failed for document ${documentId}:`, error);
      return {
        success: false,
        lightragStatus: null,
        verified: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  static async listAllDocuments(): Promise<Array<{ id: string; title: string; content?: string; timestamp?: string; trackId?: string; status?: string }>> {
    validateApiKey();
    try {
      // Get documents list from LightRAG
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // If endpoint doesn't exist, return empty array
          logger.warn('LightRAG documents list endpoint not available');
          return [];
        }
        throw new Error(`LightRAG list documents error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle the actual LightRAG response format: { "statuses": { "processed": [...] } }
      if (data.statuses && data.statuses.processed && Array.isArray(data.statuses.processed)) {
        return data.statuses.processed.map((doc: Record<string, unknown>) => ({
          id: doc.id,
          title: doc.file_path || doc.id,
          content: doc.content_summary,
          timestamp: doc.created_at,
          trackId: doc.track_id,
          status: doc.status
        }));
      }
      
      // Handle other possible formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.documents && Array.isArray(data.documents)) {
        return data.documents;
      } else if (data.docs && Array.isArray(data.docs)) {
        return data.docs;
      } else {
        logger.warn('Unexpected response format from LightRAG documents list:', data);
        return [];
      }
    } catch (error) {
      logger.error('Error listing LightRAG documents:', error);
      // Return empty array instead of throwing to allow graceful handling
      return [];
    }
  }

  static async clearAllDocuments(): Promise<ClearDocumentsResponse> {
    validateApiKey();
    try {
      logger.warn("Clearing ALL documents from LightRAG - this is irreversible!");
      
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': LIGHTRAG_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`LightRAG clear all error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('Error clearing all documents:', error);
      throw error;
    }
  }

  static validateFileForUpload(file: File): UploadValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Extract file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // File validation rules
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB limit to protect server resources
    const minSizeBytes = 100; // 100 bytes minimum
    const maxPages = 10; // Maximum 10 pages for PDFs
    
    // Supported file types (based on common document processing capabilities)
    const supportedTypes = {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'application/rtf': ['.rtf']
    };

    const supportedExtensions = Object.values(supportedTypes).flat().map(ext => ext.slice(1));
    
    // Size validation
    if (file.size > maxSizeBytes) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of 2MB. Please use a smaller file to protect server resources.`);
    }
    
    if (file.size < minSizeBytes) {
      errors.push(`File size (${file.size} bytes) is too small. Minimum size is 100 bytes`);
    }

    // File type validation
    if (!supportedExtensions.includes(extension)) {
      errors.push(`File type '.${extension}' is not supported. Supported types: ${supportedExtensions.join(', ')}`);
    }

    // MIME type validation
    if (!Object.keys(supportedTypes).includes(file.type) && file.type !== '') {
      warnings.push(`MIME type '${file.type}' may not be fully supported. Upload may still work but processing could fail.`);
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)');
    }

    if (!/^[a-zA-Z0-9._\-\s()[\]{}]+$/.test(file.name)) {
      warnings.push('File name contains special characters that may cause issues');
    }

    // Empty file check
    if (file.size === 0) {
      errors.push('File appears to be empty');
    }

    // Page count warning for PDFs (can't check actual pages without parsing)
    if (extension === 'pdf') {
      // Rough estimate: average PDF page is ~100KB
      const estimatedPages = Math.ceil(file.size / (100 * 1024));
      if (estimatedPages > maxPages) {
        warnings.push(`File may exceed the ${maxPages} page limit (estimated ${estimatedPages} pages based on file size). Consider splitting large documents.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension
      }
    };
  }

  static async uploadDocument(file: File): Promise<UploadDocumentResponse> {
    validateApiKey();
    try {
      // Validate file before upload
      const validation = this.validateFileForUpload(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Upload warnings:', validation.warnings);
      }

      // Check if pipeline is busy before upload
      const pipelineStatus = await this.checkPipelineStatus();
      if (pipelineStatus.busy) {
        throw new Error('LightRAG is currently busy processing other documents. Please try again in a few moments.');
      }

      logger.log(`Uploading document: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

      // Prepare FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload to LightRAG
      const response = await fetch(`${LIGHTRAG_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'X-API-Key': LIGHTRAG_API_KEY
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Upload failed (${response.status})`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // CRITICAL DEBUG: Log exactly what LightRAG returns
      console.error(`[CRITICAL] LightRAG upload response for ${file.name}:`, JSON.stringify(data, null, 2));
      console.error(`[CRITICAL] Response has track_id: ${!!data.track_id}`);
      console.error(`[CRITICAL] track_id value: "${data.track_id}"`);
      
      // Check if we got the expected fields
      if (!data.track_id) {
        console.error(`[ERROR] LightRAG upload response missing track_id! Full response:`, data);
      }
      
      logger.log(`Upload response for ${file.name}:`, data);

      return data;
    } catch (error) {
      logger.error(`Error uploading document "${file.name}":`, error);
      throw error;
    }
  }

  static async safeUploadDocument(file: File, maxRetries: number = 3): Promise<{
    success: boolean;
    uploadResponse: UploadDocumentResponse | null;
    validation: UploadValidationResult;
    retryCount: number;
    error?: string;
  }> {
    const validation = this.validateFileForUpload(file);
    
    if (!validation.isValid) {
      return {
        success: false,
        uploadResponse: null,
        validation,
        retryCount: 0,
        error: validation.errors.join(', ')
      };
    }

    let lastError: string | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const uploadResponse = await this.uploadDocument(file);
        
        // Check if upload was successful
        if (uploadResponse.status === 'success' || uploadResponse.status === 'duplicated') {
          logger.log(`Upload successful after ${attempt} retries`);
          return {
            success: true,
            uploadResponse,
            validation,
            retryCount: attempt
          };
        } else if (uploadResponse.status === 'failure') {
          lastError = uploadResponse.message || 'Upload failed';
          break; // Don't retry on explicit failure
        } else if (uploadResponse.status === 'partial_success') {
          logger.warn('Upload partially successful:', uploadResponse.message);
          return {
            success: true,
            uploadResponse,
            validation,
            retryCount: attempt,
            error: `Partial success: ${uploadResponse.message}`
          };
        }
      } catch (error) {
        retryCount = attempt;
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a retryable error
        if (lastError.includes('busy') || lastError.includes('network') || lastError.includes('timeout')) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            logger.log(`Upload attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          // Non-retryable error
          break;
        }
      }
    }

    return {
      success: false,
      uploadResponse: null,
      validation,
      retryCount,
      error: lastError || 'Upload failed after all retries'
    };
  }

  static async uploadMultipleDocuments(files: File[]): Promise<{
    successful: Array<{ file: File; response: UploadDocumentResponse; trackId?: string }>;
    failed: Array<{ file: File; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      duplicated: number;
    };
  }> {
    const successful: Array<{ file: File; response: UploadDocumentResponse; trackId?: string }> = [];
    const failed: Array<{ file: File; error: string }> = [];

    logger.log(`Starting batch upload of ${files.length} files`);

    // Process files sequentially to avoid overwhelming LightRAG
    for (const file of files) {
      try {
        const result = await this.safeUploadDocument(file);
        
        if (result.success && result.uploadResponse) {
          successful.push({
            file,
            response: result.uploadResponse,
            trackId: result.uploadResponse.track_id
          });
        } else {
          failed.push({
            file,
            error: result.error || 'Upload failed'
          });
        }
      } catch (error) {
        failed.push({
          file,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Brief delay between uploads to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duplicated = successful.filter(s => s.response.status === 'duplicated').length;

    return {
      successful,
      failed,
      summary: {
        total: files.length,
        successful: successful.length,
        failed: failed.length,
        duplicated
      }
    };
  }
}