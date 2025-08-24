# LightRAG Document ID Usage Analysis

## Overview

This document provides a comprehensive analysis of how document IDs (both internal and LightRAG) are used across the SimpleQuiz application. This analysis was conducted to ensure consistency and proper webhook integration.

## Document ID Types

### 1. Internal Document ID (`documents.id`)
- **Type**: UUID string
- **Usage**: Primary key in our database
- **Example**: `"550e8400-e29b-41d4-a716-446655440000"`

### 2. LightRAG Document ID (`track_id`)
- **Type**: String returned by LightRAG API
- **Storage**: Stored in `documents.processedData.lightragDocumentId` or `documents.processedData.trackId`
- **Usage**: Used to query/track documents in LightRAG system
- **Example**: `"doc_abc123_processed_20240101"`

## Current Usage Patterns

### Document Storage (Database Schema)

**Table**: `documents`
- `id` - Internal UUID (primary key)
- `processedData` - JSONB containing:
  - `lightragDocumentId` or `trackId` - LightRAG tracking ID
  - `lightragUrl` - LightRAG document URL
  - `status`, `message`, etc.

### Document Upload Flow

**File**: `/src/app/api/educator/documents/upload/route.ts`
```typescript
// LightRAG response contains track_id
const trackId = response.track_id || documentId;

// Stored in processedData
processedData: {
  lightragDocumentId: trackId,
  trackId: trackId,
  // ... other metadata
}
```

### Document Status Checking

**File**: `/src/lib/lightrag-service.ts`
```typescript
// Fixed extraction from processedData
const processedData = document.processedData as { 
  lightragDocumentId?: string; 
  trackId?: string; 
  [key: string]: unknown; 
} | null;
const trackId = processedData?.lightragDocumentId || processedData?.trackId;

// Used for status checking
const trackStatus = await this.checkDocumentTrackStatus(trackId);
```

## Webhook Integration

### Quiz Generation Webhooks

#### 1. Quiz Creation (`/api/educator/quiz/create-async/route.ts`)
✅ **Status**: COMPLETE - Includes document metadata with LightRAG IDs

```typescript
const documentMetadata = docs.map(doc => {
  const processedData = doc.processedData as Record<string, unknown>;
  return {
    id: doc.id,
    filename: doc.filename,
    // ... other fields
    lightragDocumentId: processedData?.lightragDocumentId || processedData?.trackId || doc.filePath,
    lightragUrl: processedData?.lightragUrl,
    processedBy: processedData?.processedBy,
    status: doc.status
  };
});

const webhookPayload = {
  documentIds,
  documentMetadata, // ✅ LightRAG IDs included
  // ... other fields
};
```

#### 2. Quiz Creation Deferred (`/api/educator/quiz/create-deferred/route.ts`)
✅ **Status**: COMPLETE - Includes document metadata with LightRAG IDs
- Same pattern as create-async

#### 3. Quiz Creation Synchronous (`/api/educator/quiz/create/route.ts`)
✅ **Status**: COMPLETE - Includes document metadata with LightRAG IDs
- Same pattern as create-async

#### 4. Question Replacement (`/api/educator/quiz/[id]/question/[questionId]/replace-async/route.ts`)
✅ **Status**: UPDATED - Now includes document metadata with LightRAG IDs

**Recent Update**:
```typescript
// Added document fetching
const docs = await db
  .select()
  .from(documents)
  .where(inArray(documents.id, quizData.documentIds));

// Added document metadata preparation
const documentMetadata = docs.map(doc => {
  const processedData = doc.processedData as { 
    lightragDocumentId?: string; 
    trackId?: string; 
    [key: string]: unknown; 
  } | null;
  return {
    id: doc.id,
    filename: doc.filename,
    // ... other fields
    lightragDocumentId: processedData?.lightragDocumentId || processedData?.trackId || doc.filePath,
    // ... other fields
  };
});

// Added to webhook payload
const webhookPayload = {
  documentIds: quizData.documentIds,
  documentMetadata, // ✅ Now included
  // ... other fields
};
```

### Webhook Callback Handling

#### 1. Quiz Generation Callback (`/api/educator/quiz/webhook-callback/route.ts`)
✅ **Status**: COMPLETE - Properly handles incoming webhook data
- No document ID usage required (processes generated questions)

#### 2. Question Replacement Callback (`/api/educator/quiz/webhook-callback-replace/route.ts`)
✅ **Status**: COMPLETE - Properly handles incoming webhook data  
- No document ID usage required (processes single replacement question)

## Frontend Usage

### Document Listing (`/src/app/educator/documents/page.tsx`)
✅ **Status**: COMPLETE - Uses compact display with proper status checking

### Document Status Component (`/src/components/document-processing-status.tsx`)
✅ **Status**: COMPLETE - Uses LightRAG service for status checking

```typescript
// Calls LightRAG service which properly extracts track_id
const status = await LightRAGService.updateDocumentProcessingStatus(documentId);
```

## API Endpoints

### Document Management
- `GET /api/educator/documents` - Lists documents with status
- `POST /api/educator/documents/upload` - Uploads and stores LightRAG track_id
- `GET /api/educator/documents/[id]/status` - Checks processing status

### Quiz Generation (All Updated)
- `POST /api/educator/quiz/create` - ✅ Includes document metadata
- `POST /api/educator/quiz/create-async` - ✅ Includes document metadata  
- `POST /api/educator/quiz/create-deferred` - ✅ Includes document metadata
- `PUT /api/educator/quiz/[id]/question/[questionId]/replace-async` - ✅ Now includes document metadata

### Webhook Callbacks
- `POST /api/educator/quiz/webhook-callback` - ✅ Handles quiz generation results
- `POST /api/educator/quiz/webhook-callback-replace` - ✅ Handles question replacement results

## Consistency Verification

### ✅ Fixed Issues
1. **TypeScript Error**: Fixed `document.lightragDocumentId` property access by properly extracting from `processedData`
2. **Missing Document Metadata**: Added document metadata to question replacement webhook
3. **Inconsistent Property Names**: Standardized on `lightragDocumentId` as primary, with `trackId` as fallback

### ✅ Verified Patterns
1. **Document Storage**: All uploads store LightRAG track_id in `processedData.lightragDocumentId`
2. **Status Checking**: All status checks use proper extraction from `processedData`
3. **Webhook Payloads**: All webhook calls now include `documentMetadata` with LightRAG IDs
4. **Error Handling**: Proper fallbacks when LightRAG IDs are missing

## Best Practices Established

### 1. Document Metadata Structure
```typescript
interface DocumentMetadata {
  id: string; // Internal document ID
  filename: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadDate: Date;
  lightragDocumentId: string; // LightRAG track_id (primary)
  lightragUrl?: string;
  processedBy?: string;
  status: DocumentStatus;
}
```

### 2. LightRAG ID Extraction Pattern
```typescript
const processedData = document.processedData as { 
  lightragDocumentId?: string; 
  trackId?: string; 
  [key: string]: unknown; 
} | null;
const trackId = processedData?.lightragDocumentId || processedData?.trackId;
```

### 3. Webhook Payload Pattern
```typescript
const webhookPayload = {
  documentIds: string[]; // Internal IDs
  documentMetadata: DocumentMetadata[]; // Full metadata including LightRAG IDs
  // ... other quiz/question data
};
```

## AI Agent Integration Benefits

With these updates, your AI agent will now receive:

### For Quiz Generation
```json
{
  "documentIds": ["internal-uuid-1", "internal-uuid-2"],
  "documentMetadata": [
    {
      "id": "internal-uuid-1",
      "filename": "genesis.pdf",
      "lightragDocumentId": "doc_genesis_20240101_processed",
      "status": "processed"
    }
  ],
  "questionCount": 10,
  "difficulty": "intermediate"
}
```

### For Question Replacement
```json
{
  "questionId": "question-uuid-to-replace",
  "documentIds": ["internal-uuid-1"],
  "documentMetadata": [
    {
      "id": "internal-uuid-1", 
      "filename": "genesis.pdf",
      "lightragDocumentId": "doc_genesis_20240101_processed",
      "status": "processed"
    }
  ],
  "isReplacement": true
}
```

## Next Steps

1. ✅ **COMPLETED**: Update question replacement webhook to include document metadata
2. ✅ **COMPLETED**: Fix TypeScript compilation errors
3. ✅ **COMPLETED**: Verify all webhook payloads include necessary LightRAG IDs
4. ✅ **COMPLETED**: Document the complete flow for future reference

## Summary

All document ID usage is now consistent across the application:
- **Storage**: LightRAG track_ids stored in `processedData.lightragDocumentId`
- **Retrieval**: Proper extraction with fallback to `trackId`
- **Webhooks**: All webhook calls include `documentMetadata` with LightRAG IDs
- **Status Checking**: Uses LightRAG service with proper ID extraction
- **Error Handling**: Graceful fallbacks when IDs are missing

Your AI agent will now have access to both internal document IDs and LightRAG document IDs in all webhook calls, enabling proper document querying and processing.