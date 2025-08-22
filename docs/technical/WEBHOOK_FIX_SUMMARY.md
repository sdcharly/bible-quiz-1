# Webhook Communication Fix Summary

## Issues Identified

1. **Job Store Timing Issue**: The webhook callback endpoints (both quiz creation and question replacement) were failing when n8n responded before the job was properly stored in memory.

2. **Poor Error Handling**: When n8n sent error callbacks for non-existent jobs, the system would return 404 instead of handling gracefully.

3. **Insufficient Logging**: Limited logging made it difficult to diagnose webhook communication issues in both quiz creation and question replacement flows.

## Fixes Applied

### 1. Enhanced Quiz Creation Webhook Flow
- **Files**: 
  - `/src/app/api/educator/quiz/webhook-callback/route.ts`
  - `/src/app/api/educator/quiz/create-async/route.ts`
- **Changes**: 
  - Added graceful handling for error callbacks when job doesn't exist
  - Ensured job is created in store BEFORE calling n8n webhook
  - Added detailed logging for debugging webhook callbacks
  - Improved error messages and webhook response handling

### 2. Fixed Question Replacement Webhook Flow
- **Files**:
  - `/src/app/api/educator/quiz/webhook-callback-replace/route.ts`
  - `/src/app/api/educator/quiz/[id]/question/[questionId]/replace-async/route.ts`
- **Changes**:
  - Applied same timing fixes as quiz creation
  - Added proper error handling for non-existent jobs
  - Enhanced logging with [REPLACE-ASYNC] and [REPLACE CALLBACK] prefixes
  - Ensured job exists before webhook call

### 3. Better Polling Status Feedback
- **File**: `/src/app/api/educator/quiz/poll-status/route.ts`
- **Changes**:
  - Added detailed logging for poll requests
  - Improved error messages when job not found
  - Better user feedback for expired/missing jobs
  - Works for both quiz creation and question replacement jobs

## Testing Instructions

### 1. Verify n8n Webhook Configuration

Your n8n workflow should:
1. Receive the webhook at the URL configured in `QUIZ_GENERATION_WEBHOOK_URL`
2. Process the quiz generation request
3. Send a callback to the URL provided in the `callbackUrl` field
4. Include the `jobId` from the original request in the callback

### 2. Expected Callback Format from n8n

```json
{
  "jobId": "original-job-id-from-request",
  "status": "success",
  "questionsData": [
    {
      "question": "Question text",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correct_answer": "a",
      "explanation": "Explanation text",
      "difficulty": "medium",
      "bloomsLevel": "knowledge",
      "topic": "Topic name",
      "book": "Book name",
      "chapter": "Chapter"
    }
  ]
}
```

For errors:
```json
{
  "jobId": "original-job-id-from-request",
  "status": "error",
  "error": "Error message describing what went wrong"
}
```

### 3. Monitor Server Logs

When testing, watch the server logs for:
- `[CREATE-ASYNC]` - Job creation and webhook calls
- `[QUIZ CREATE CALLBACK]` - n8n callbacks received
- `[POLL-STATUS]` - Frontend polling requests

### 4. Test Scripts Available

Three test scripts are available:
- `test-webhook.js` - Basic webhook connectivity test
- `test-webhook-flow.js` - Comprehensive quiz creation flow diagnostic
- `test-replace-webhook.js` - Question replacement flow test

Run them with:
```bash
# Test quiz creation flow
node test-webhook-flow.js

# Test question replacement flow
node test-replace-webhook.js
```

## What to Check in n8n

### For Quiz Creation:
1. **Webhook Trigger Node**: Should accept POST requests with the quiz generation payload
2. **HTTP Request Node for Callback**: Should POST to `/api/educator/quiz/webhook-callback`
3. **Generate Multiple Questions**: Based on `questionCount` in payload
4. **Include jobId**: Must pass the `jobId` from request to callback

### For Question Replacement:
1. **Check isReplacement Flag**: Differentiate replacement requests (`isReplacement: true`)
2. **Different Callback URL**: POST to `/api/educator/quiz/webhook-callback-replace`
3. **Generate Single Question**: Always generate exactly 1 question for replacements
4. **Include jobId**: Must start with "replace-" prefix and be passed to callback

### Common Requirements:
1. **Error Handling**: Should send error callbacks with `status: "error"` if something fails
2. **JobId Propagation**: Must pass the `jobId` through the entire workflow
3. **Quick Response**: Respond within 10 seconds to acknowledge receipt
4. **JSON Format**: All callbacks must use `application/json` content-type

## Key Points

- The `jobId` MUST be included in all callbacks from n8n
- The callback URL is provided in each request as `callbackUrl`
- n8n should respond quickly (within 10 seconds) to acknowledge receipt
- Actual processing can happen asynchronously, with callbacks sent when ready
- The job will expire after 60 minutes if no callback is received

## Environment Variables Required

```bash
QUIZ_GENERATION_WEBHOOK_URL=<your-n8n-webhook-url>
NEXT_PUBLIC_APP_URL=<your-app-url>  # Used to construct callback URLs
```

## Next Steps

1. Start your Next.js server
2. Verify n8n workflow is active
3. Test quiz creation through the UI
4. Monitor logs on both sides for any issues
5. Ensure n8n can reach your callback URL (no firewall blocking)