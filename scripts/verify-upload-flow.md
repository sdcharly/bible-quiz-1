# Upload Flow Verification

## 1. UPLOAD (POST /api/educator/documents/upload)
✅ Gets track_id from LightRAG response
✅ Stores trackId in processedData.trackId
✅ Does NOT set lightragDocumentId (fixed)
✅ Starts polling if status is "processing"

## 2. STATUS CHECK (GET /api/educator/documents/[id]/status)
✅ Calls getDocumentProcessingProgress
✅ Uses trackId from processedData to check LightRAG status
✅ Updates database when processing completes

## 3. PROCESSING PROGRESS (getDocumentProcessingProgress)
✅ Gets trackId from processedData
✅ Calls checkDocumentTrackStatus(trackId) - NOT documentId
✅ When processed, extracts document ID from response
✅ Updates database with lightragDocumentId

## 4. DELETE (DELETE /api/educator/documents/[id])
✅ Uses lightragDocumentId (NOT trackId) for deletion
✅ This is the permanent document ID

## ID Usage Summary:
- trackId: For status checking during processing
- lightragDocumentId: For all operations after processing

## Test Checklist:
1. Upload saves trackId ✅
2. Status check uses trackId ✅  
3. Processing complete saves documentId ✅
4. Delete uses documentId ✅
