# LightRAG API Reference & Integration Guide

## Overview
LightRAG is our document processing and knowledge graph system. This document explains the critical distinction between document upload and document processing, and provides API reference for CRUD operations.

## Key Concepts

### Document Lifecycle

1. **Upload Phase** - Document is uploaded to LightRAG
   - Status: `uploaded`
   - Document exists in system but NOT queryable
   - Returns a `track_id` for monitoring

2. **Processing/Indexing Phase** - LightRAG processes the document
   - Status: `processing`
   - Document is being chunked, embedded, and indexed
   - Knowledge graph is being built
   - NOT yet queryable

3. **Processed Phase** - Document is fully indexed
   - Status: `processed` or `completed`
   - Document is fully queryable
   - Can be used in RAG queries

## Critical Understanding

⚠️ **IMPORTANT**: A document can exist in LightRAG immediately after upload but may take significant time to become queryable. Never assume a document is ready just because:
- The upload succeeded
- The pipeline is not busy
- The document ID exists

Always check the track status to verify processing completion.

## API Endpoints

### Base URL
```
https://lightrag-6bki.onrender.com
```

### Authentication
All requests require the `X-API-Key` header:
```
X-API-Key: your-api-key-here
```

---

## Document Management APIs

### 1. Upload Document
**POST** `/documents/upload`

Uploads a document to LightRAG for processing.

**Request:**
```typescript
const formData = new FormData();
formData.append('file', file);

fetch(`${BASE_URL}/documents/upload`, {
  method: 'POST',
  headers: {
    'X-API-Key': API_KEY,
    'accept': 'application/json'
  },
  body: formData
})
```

**Response:**
```json
{
  "status": "success",
  "message": "File uploaded successfully",
  "document_id": "abc123-def456",  // This is the track_id
  "detail": "Processing started"
}
```

**Status Values:**
- `success` - Upload succeeded, processing started
- `duplicated` - Document already exists
- `failure` - Upload failed
- `partial_success` - Upload succeeded with warnings

---

### 2. Check Document Processing Status
**GET** `/documents/track_status/{track_id}`

⚠️ **CRITICAL**: Use this to check if a document is ready for queries.

**Request:**
```typescript
fetch(`${BASE_URL}/documents/track_status/${trackId}`, {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY,
    'accept': 'application/json'
  }
})
```

**Response:**
```json
{
  "status": "processed",  // or "processing", "pending", "failed"
  "message": "Document fully indexed and ready",
  "progress": 100,
  "details": {
    "chunks_processed": 45,
    "embeddings_created": 45,
    "entities_extracted": 23
  }
}
```

**Status Values:**
- `processed` / `completed` - Document is fully indexed and queryable
- `processing` - Currently being indexed
- `pending` - Queued for processing
- `failed` - Processing failed

---

### 3. Get Pipeline Status
**GET** `/documents/pipeline_status`

Checks the overall pipeline status (NOT specific to a document).

**Request:**
```typescript
fetch(`${BASE_URL}/documents/pipeline_status`, {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY,
    'accept': 'application/json'
  }
})
```

**Response:**
```json
{
  "busy": true,
  "job_name": "processing_batch_3",
  "job_start": "2024-01-15T10:30:00Z",
  "docs": 5,        // Total documents in queue
  "batchs": 2,      // Total batches
  "cur_batch": 1,   // Current batch being processed
  "latest_message": "Processing chunk 23 of 45"
}
```

⚠️ **WARNING**: `busy: false` does NOT mean your document is processed! It only means the pipeline is idle.

---

### 4. List Documents
**GET** `/documents`

Lists all documents with their current status.

**Request:**
```typescript
fetch(`${BASE_URL}/documents`, {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY,
    'accept': 'application/json'
  }
})
```

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_123",
      "name": "biblical_text.pdf",
      "status": "processed",
      "uploaded_at": "2024-01-15T10:00:00Z",
      "processed_at": "2024-01-15T10:35:00Z"
    }
  ]
}
```

---

### 5. Delete Document
**DELETE** `/documents/{document_id}`

Removes a document from LightRAG.

**Request:**
```typescript
fetch(`${BASE_URL}/documents/${documentId}`, {
  method: 'DELETE',
  headers: {
    'X-API-Key': API_KEY,
    'accept': 'application/json'
  }
})
```

**Response:**
```json
{
  "status": "success",
  "message": "Document deleted successfully"
}
```

---

### 6. Get Document Status Counts
**GET** `/documents/status_counts`

Gets count of documents in each status.

**Response:**
```json
{
  "processed": 45,
  "processing": 2,
  "pending": 5,
  "failed": 1
}
```

---

## Query APIs

### 1. Query Documents
**POST** `/query`

Query the knowledge base (only works with processed documents).

**Request:**
```json
{
  "query": "What does the Bible say about faith?",
  "mode": "hybrid",  // or "naive", "local", "global"
  "only_need_context": false,
  "response_type": "Multiple Paragraphs"
}
```

**Response:**
```json
{
  "result": "According to the scriptures...",
  "context": "Relevant passages used...",
  "metadata": {
    "sources": ["doc_123", "doc_456"],
    "confidence": 0.89
  }
}
```

**Query Modes:**
- `naive` - Simple retrieval
- `local` - Uses local knowledge graph
- `global` - Uses global knowledge graph
- `hybrid` - Combines local and global

---

## Implementation Guidelines

### Correct Status Checking Pattern

```typescript
async function isDocumentReady(documentId: string, trackId: string): Promise<boolean> {
  // Step 1: Check track status (NOT just document existence)
  const trackStatus = await checkDocumentTrackStatus(trackId);
  
  // Step 2: Only consider processed if track status confirms it
  if (trackStatus.status === 'processed' || trackStatus.status === 'completed') {
    return true;
  }
  
  // Step 3: Document exists but not ready
  if (trackStatus.exists) {
    console.log('Document uploaded but still processing...');
    return false;
  }
  
  // Step 4: Track not found - might be an issue
  console.log('Document track not found');
  return false;
}
```

### Polling Strategy

```typescript
async function pollDocumentStatus(trackId: string, maxAttempts = 60): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkDocumentTrackStatus(trackId);
    
    if (status.processed) {
      return true;
    }
    
    if (status.status === 'failed') {
      throw new Error('Document processing failed');
    }
    
    // Wait 30 seconds between checks
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  return false;
}
```

### Common Mistakes to Avoid

❌ **DON'T**
```typescript
// Wrong: Assuming document is ready because pipeline is not busy
if (!pipelineStatus.busy) {
  markAsProcessed(documentId);
}

// Wrong: Checking only if document exists
if (await checkDocumentExists(documentId)) {
  markAsProcessed(documentId);
}
```

✅ **DO**
```typescript
// Correct: Check track status for processing completion
const trackStatus = await checkDocumentTrackStatus(trackId);
if (trackStatus.processed) {
  markAsProcessed(documentId);
}
```

## Processing Timeline

Typical document processing stages:

1. **0-5 seconds**: Upload completes, track_id generated
2. **5-30 seconds**: Document queued for processing
3. **30 seconds - 5 minutes**: Document chunking and embedding
4. **2-10 minutes**: Knowledge graph construction
5. **5-15 minutes**: Full indexing complete, document queryable

⚠️ Processing time varies based on:
- Document size
- Document complexity
- Current pipeline load
- Server resources

## Error Handling

### Common Error Scenarios

1. **Pipeline Busy (429)**
   - Retry after delay
   - Check `retry-after` header

2. **Document Not Found (404)**
   - Verify track_id is correct
   - Document may have been deleted

3. **Processing Failed**
   - Check document format
   - Verify file size limits
   - Check for corrupted files

## Testing Checklist

- [ ] Upload returns track_id
- [ ] Track status shows "processing" initially
- [ ] Track status eventually shows "processed"
- [ ] Document only marked as ready when track status is "processed"
- [ ] Queries work only after document is processed
- [ ] Pipeline busy state handled correctly
- [ ] Error states handled gracefully

## Summary

The key insight: **Upload ≠ Ready**

Always use the track_status endpoint to verify a document is fully processed before:
- Marking it as ready in your database
- Allowing users to create quizzes from it
- Running queries against it

Remember: A document can exist in LightRAG for many minutes before it's actually queryable!