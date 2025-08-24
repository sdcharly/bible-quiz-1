# LightRAG API Critical Findings and Documentation

## Date: August 24, 2025

## CRITICAL ISSUE DISCOVERED
Documents are showing as "processing" indefinitely because we may not be receiving or correctly handling the `track_id` from LightRAG upload responses.

## LightRAG API Endpoints Documentation

### 1. Document Upload Endpoint
**Endpoint:** `POST /documents/upload`

**Request:**
- Method: POST
- Headers: 
  - `X-API-Key: {api_key}`
  - `accept: application/json`
- Body: FormData with file

**Response (InsertResponse):**
```json
{
  "status": "success",  // "success" | "duplicated" | "partial_success" | "failure"
  "message": "File 'document.pdf' uploaded successfully. Processing will continue in background.",
  "track_id": "upload_20250729_170612_abc123"  // CRITICAL: This ID is needed for all subsequent operations
}
```

**⚠️ CRITICAL FINDING:** 
- The `track_id` is ESSENTIAL for checking document status and deletion
- If we don't get or save this `track_id`, we cannot:
  1. Check if document is processed
  2. Delete document from LightRAG
  3. Query document status

### 2. Track Status Endpoint
**Endpoint:** `GET /documents/track_status/{track_id}`

**Purpose:** Check if document is processed and ready for queries

**Response (TrackStatusResponse):**
```json
{
  "track_id": "upload_20250729_170612_abc123",
  "documents": [
    {
      "id": "doc_123",
      "status": "processed",  // "pending" | "processing" | "processed" | "failed"
      "filename": "document.pdf",
      // other fields...
    }
  ],
  "total_count": 1,
  "status_summary": {
    "processed": 1
  }
}
```

**Status Values:**
- `pending`: Document uploaded but not yet being processed
- `processing`: Document is currently being indexed
- `processed`: Document is ready for queries ✅
- `failed`: Processing failed

### 3. Document Deletion
**Endpoint:** `DELETE /documents/{document_id}`

**Note:** This uses the document ID from LightRAG, NOT our internal database ID

## ROOT CAUSE ANALYSIS

### The Problem Flow:
1. **Upload:** We upload document to LightRAG
2. **Response:** LightRAG should return `track_id` in response
3. **Fallback Issue:** If no `track_id` returned, we incorrectly use our internal `documentId`
4. **Status Check Fails:** When checking status with internal ID, LightRAG returns empty (doesn't recognize our ID)
5. **UI Issue:** Document stays in "processing" forever
6. **Delete Fails:** Cannot delete from LightRAG without proper ID

### Current Code Issue:
```typescript
// In upload route:
const trackId = response.track_id || documentId;  // WRONG! Falls back to our ID
```

If `response.track_id` is undefined/null, we use our internal ID which LightRAG doesn't recognize.

## SOLUTION APPROACH

### Immediate Fix:
1. Add comprehensive logging to see what LightRAG actually returns
2. Never fallback to internal ID for track_id
3. If no track_id received, mark document as failed

### Proper Implementation:
```typescript
// Correct approach:
if (!response.track_id) {
  // Mark as failed - cannot track without LightRAG ID
  await db.update(documents)
    .set({ 
      status: "failed",
      processedData: {
        error: "No track_id received from LightRAG",
        response: response
      }
    })
    .where(eq(documents.id, documentId));
  
  throw new Error("LightRAG did not return a track_id for document tracking");
}

const trackId = response.track_id; // Use only LightRAG's ID
```

## VERIFICATION STEPS

1. **Check existing documents:** Look at processedData to see if track_id is our internal ID
2. **Monitor new uploads:** Log what LightRAG actually returns
3. **Fix status checking:** Only use valid LightRAG track_ids
4. **Update existing docs:** May need to re-upload if using wrong IDs

## LESSONS LEARNED

1. **Never use fallback IDs** when integrating with external services
2. **Validate required fields** from API responses
3. **Fail fast** if critical data is missing
4. **Log extensively** during integration development
5. **Document ID mapping** is critical for multi-system integrations

## ACTION ITEMS

- [ ] Fix upload handler to not fallback to internal ID
- [ ] Add validation for track_id presence
- [ ] Create migration to identify documents with invalid track_ids
- [ ] Implement proper error handling when track_id is missing
- [ ] Add monitoring for upload response structure