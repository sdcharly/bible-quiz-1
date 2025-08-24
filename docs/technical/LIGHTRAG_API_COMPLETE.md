# LightRAG API Complete Documentation

## Overview
LightRAG Server provides a comprehensive API for document management, knowledge graph operations, and RAG (Retrieval-Augmented Generation) querying. This document covers the complete API specification based on the official LightRAG documentation.

## API Base URL
- Production: `https://lightrag-6bki.onrender.com`
- Default Port: `9621`
- API Documentation: `/docs` (Swagger UI), `/redoc` (ReDoc)

## Authentication
- **Header**: `X-API-Key: {your-api-key}`
- All endpoints require API key authentication unless whitelisted
- JWT-based authentication also supported for account management

## Core Concepts

### 1. Two-ID System (CRITICAL)
LightRAG uses two different IDs for different purposes:

#### Track ID (`track-xxxxx` or `upload_xxxxx`)
- **Purpose**: Track upload and processing status
- **Returned by**: Upload endpoints
- **Lifetime**: Temporary (during processing)
- **Used with**: `/documents/track_status/{track_id}`

#### Document ID (`doc-xxxxx`)
- **Purpose**: Permanent document identifier
- **Generated**: After processing completes
- **Found in**: `track_status` response → `documents[0].id`
- **Used with**: All document operations (query, delete, etc.)

## API Endpoints

### 1. Document Upload

#### POST `/documents/upload`
Upload a single document for processing.

**Request:**
```http
POST /documents/upload
Content-Type: multipart/form-data
X-API-Key: {api-key}

file: {binary-file-data}
```

**Response:**
```json
{
  "status": "success",
  "message": "Document uploaded successfully",
  "track_id": "upload_20250824_124707_0e0ba7b0"
}
```

**Status Values:**
- `success`: Upload successful, processing started
- `duplicated`: Document already exists (still returns track_id)
- `partial_success`: Some issues but upload proceeded
- `failure`: Upload failed

### 2. Text Insertion

#### POST `/documents/text`
Insert a single text directly without file upload.

**Request:**
```json
{
  "text": "Your text content here",
  "metadata": {
    "title": "Optional title",
    "source": "Optional source"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "track_id": "text_20250824_124707_abc123"
}
```

#### POST `/documents/texts`
Insert multiple texts in batch.

**Request:**
```json
{
  "texts": [
    {
      "text": "First text content",
      "metadata": {"title": "Text 1"}
    },
    {
      "text": "Second text content",
      "metadata": {"title": "Text 2"}
    }
  ]
}
```

### 3. Document Processing Status Query

#### GET `/track_status/{track_id}`
This endpoint provides comprehensive status information for documents being processed.

**CRITICAL**: Must use `track_id` (NOT `document_id`) - this is the ID returned from upload endpoints

**Purpose:**
- Track upload and processing progress
- Get document processing status (pending/processing/processed/failed)
- Retrieve content summary and metadata
- Access error messages if processing failed
- Monitor timestamps for creation and updates

**Response Structure:**
```json
{
  "track_id": "upload_20250824_124707_0e0ba7b0",
  "documents": [
    {
      "id": "doc-37831c235b4d00befda9161bdb6c26c8",  // Permanent document ID (use for future operations)
      "content_summary": "Document content preview...", // First ~500 chars of processed content
      "content_length": 294763,                        // Total character count
      "status": "processed",                           // Current processing status
      "created_at": "2025-08-24T12:47:25.525664+00:00",  // Upload timestamp
      "updated_at": "2025-08-24T13:00:47.883136+00:00",  // Last update timestamp
      "track_id": "upload_20250824_124707_0e0ba7b0",     // Original track ID
      "chunks_count": 72,                                 // Number of chunks created
      "error_msg": null,                                  // Error details if failed
      "metadata": {
        "processing_start_time": 1756039645,              // Unix timestamp when processing started
        "processing_end_time": 1756040447,                // Unix timestamp when processing completed
        "file_name": "proverbs_5_commentary.pdf",         // Original filename
        "file_size": 613900,                              // File size in bytes
        "processing_duration": 802                        // Processing time in seconds
      },
      "file_path": "proverbs_5_commentary.pdf"           // Stored file reference
    }
  ],
  "total_count": 1,                                      // Total documents in this track
  "status_summary": {                                    // Summary of all document statuses
    "DocStatus.PROCESSED": 1                             // Count by status
  }
}
```

**Document Status Values:**
- `pending`: Document uploaded, waiting in queue
- `processing`: Currently being processed (chunking, embedding, indexing)
- `processed`: Successfully processed and ready for queries
- `failed`: Processing failed (check `error_msg` for details)
- `deleted`: Marked for deletion

**Key Fields Explained:**
- **`track_id`**: The tracking ID used to monitor this upload batch
- **`documents[].id`**: The permanent document ID - **SAVE THIS** for all future operations
- **`content_summary`**: Preview of the document content for verification
- **`chunks_count`**: Number of chunks created (affects query quality)
- **`error_msg`**: Detailed error information if processing failed
- **`metadata`**: Additional processing information and timestamps

**Usage Patterns:**

1. **During Processing (documents array empty):**
```json
{
  "track_id": "upload_20250824_124707_0e0ba7b0",
  "documents": [],
  "total_count": 0,
  "status_summary": {}
}
```

2. **Processing Complete (documents array populated):**
```json
{
  "track_id": "upload_20250824_124707_0e0ba7b0",
  "documents": [{"id": "doc-xxx", "status": "processed", ...}],
  "total_count": 1,
  "status_summary": {"DocStatus.PROCESSED": 1}
}
```

3. **Processing Failed:**
```json
{
  "track_id": "upload_20250824_124707_0e0ba7b0",
  "documents": [{
    "id": null,
    "status": "failed",
    "error_msg": "File size exceeds maximum limit of 10MB",
    ...
  }],
  "total_count": 1,
  "status_summary": {"DocStatus.FAILED": 1}
}
```

**Important Notes:**
- Poll this endpoint every 5-10 seconds during processing
- Empty `documents` array indicates processing is still in progress
- Once `documents` array is populated, extract `documents[0].id` as the permanent document ID
- Save the permanent document ID for all future operations (queries, deletion, etc.)
- The track_id is only for status checking and becomes less useful after processing completes

### 4. Query Endpoints

#### POST `/query`
Standard RAG query against the knowledge base.

**Request:**
```json
{
  "query": "What is the biblical meaning of wisdom?",
  "mode": "hybrid",
  "only_need_context": false,
  "stream": false,
  "parameters": {
    "max_tokens": 500,
    "temperature": 0.7
  }
}
```

**Query Modes:**
- `local`: Search local context only
- `global`: Search global knowledge graph
- `hybrid`: Combined local and global (default, recommended)
- `naive`: Simple retrieval without graph
- `mix`: Mixed retrieval strategies

**Response:**
```json
{
  "response": "The biblical meaning of wisdom...",
  "context": [
    {
      "source": "doc-123",
      "content": "Relevant passage...",
      "score": 0.95
    }
  ],
  "mode": "hybrid",
  "tokens_used": 450
}
```

#### POST `/query/stream`
Streaming version of query endpoint for real-time responses.

**Same request format as `/query` but returns Server-Sent Events (SSE)**

### 5. Document Operations

#### GET `/documents`
List all documents in the system.

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-123",
      "title": "Document Title",
      "status": "processed",
      "created_at": "2025-08-24T12:00:00Z",
      "chunks_count": 45
    }
  ],
  "total": 10
}
```

#### DELETE `/documents/{document_id}`
Delete a specific document.

**CRITICAL**: Must use `document_id` (doc-xxx), NOT `track_id`

**Response:**
```json
{
  "status": "success",
  "message": "Document deleted successfully"
}
```

**Possible Status Values:**
- `success`: Deletion completed
- `deletion_started`: Async deletion initiated
- `not_allowed`: Document is in use or protected
- `busy`: System busy, retry later
- `fail`: Deletion failed

### 6. Pipeline Status

#### GET `/pipeline/status`
Check if the processing pipeline is busy.

**Response:**
```json
{
  "busy": false,
  "queue_length": 0,
  "current_job": null
}
```

### 7. Health Check

#### GET `/health`
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-08-24T12:00:00Z"
}
```

## Configuration

### Environment Variables
```bash
# LLM Configuration
LLM_PROVIDER=openai  # or ollama, azure, bedrock
OPENAI_API_KEY=your-key
OPENAI_API_BASE=https://api.openai.com/v1

# Embedding Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# Server Configuration
LIGHTRAG_HOST=0.0.0.0
LIGHTRAG_PORT=9621
LIGHTRAG_API_KEY=your-api-key

# Storage Configuration
LIGHTRAG_WORKING_DIR=/app/data
LIGHTRAG_STORAGE_TYPE=local  # or s3, azure

# Processing Configuration
LIGHTRAG_CHUNK_SIZE=1200
LIGHTRAG_CHUNK_OVERLAP=100
LIGHTRAG_MAX_ASYNC=4
```

### Configuration File (config.ini)
```ini
[llm]
provider = openai
model = gpt-4
temperature = 0.7

[embedding]
provider = openai
model = text-embedding-3-small
dimension = 1536

[storage]
type = local
path = ./data

[processing]
chunk_size = 1200
chunk_overlap = 100
max_workers = 4
```

## Error Handling

### Common Error Responses
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional information"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created (upload success)
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid API key)
- `404`: Not Found (document/track not found)
- `409`: Conflict (duplicate document)
- `429`: Rate Limited
- `500`: Internal Server Error
- `503`: Service Unavailable (pipeline busy)

## Best Practices

### 1. ID Usage
```javascript
// Correct usage
const uploadResponse = await upload(file);
const trackId = uploadResponse.track_id;  // Use for status checks

const statusResponse = await checkStatus(trackId);  // NOT documentId
const documentId = statusResponse.documents[0].id;  // Extract when ready

await deleteDocument(documentId);  // Use documentId for operations
```

### 2. Status Polling
```javascript
async function pollStatus(trackId) {
  let attempts = 0;
  const maxAttempts = 60;  // 10 minutes max
  
  while (attempts < maxAttempts) {
    const status = await checkStatus(trackId);
    
    if (status.documents && status.documents.length > 0) {
      const doc = status.documents[0];
      if (doc.status === 'processed') {
        return doc.id;  // Return permanent document ID
      }
      if (doc.status === 'failed') {
        throw new Error(doc.error_msg);
      }
    }
    
    await sleep(10000);  // Wait 10 seconds
    attempts++;
  }
  
  throw new Error('Processing timeout');
}
```

### 3. Error Recovery
```javascript
async function safeUpload(file, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await upload(file);
      if (response.status === 'duplicated') {
        // Document exists, get existing ID
        return response.track_id;
      }
      return response.track_id;
    } catch (error) {
      if (error.status === 503 && i < maxRetries - 1) {
        await sleep(5000 * (i + 1));  // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

## Rate Limits
- Upload: 10 documents per minute
- Queries: 100 per minute
- Status checks: 300 per minute
- Deletion: 5 per minute

## Webhooks (Optional)
Configure webhooks for async notifications:

```json
{
  "webhook_url": "https://your-app.com/webhook",
  "events": ["processing_complete", "processing_failed"],
  "secret": "webhook-secret"
}
```

## Docker Deployment
```yaml
version: '3.8'
services:
  lightrag:
    image: ghcr.io/hkuds/lightrag:latest
    ports:
      - "9621:9621"
    environment:
      - LIGHTRAG_API_KEY=${LIGHTRAG_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

## Migration from v1 to v2
- Track IDs format changed from `track-xxx` to `upload_xxx`
- Document IDs remain as `doc-xxx`
- Status endpoint moved from `/status/{id}` to `/documents/track_status/{track_id}`
- Query modes renamed: `local_only` → `local`, `global_only` → `global`

## Support
- GitHub Issues: https://github.com/HKUDS/LightRAG/issues
- Documentation: https://lightrag-hku.readthedocs.io/
- API Reference: https://lightrag-6bki.onrender.com/docs

## Version
Current API Version: 2.0.0
Last Updated: 2025-08-24