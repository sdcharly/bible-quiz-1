# Quiz URL System Architecture

## Overview
The SimpleQuiz application uses a dual URL system consisting of **share codes** and **short URLs** to provide flexible, trackable quiz access links. This document explains the relationship between these systems and provides guidelines for seamless integration.

## URL Types and Structure

### 1. Share Code URL (Primary)
- **Format**: `/quiz/share/[shareCode]`
- **Example**: `https://biblequiz.textr.in/quiz/share/A3B4C5D6`
- **Purpose**: Direct quiz access URL with 8-character alphanumeric code
- **Generated**: When quiz is published or share link is created
- **Stored in**: `quizShareLinks.shareCode` field

### 2. Short URL (Secondary/Convenience)
- **Format**: `/s/[shortCode]`
- **Example**: `https://biblequiz.textr.in/s/xYz123`
- **Purpose**: Shorter, easier-to-share URL that redirects to share code URL
- **Generated**: On-demand when first needed (lazy generation)
- **Stored in**: `quizShareLinks.shortUrl` field

## Database Schema

```typescript
// quizShareLinks table
{
  id: string;              // UUID
  quizId: string;          // References quiz
  educatorId: string;      // Owner educator
  shareCode: string;       // 8-char code (e.g., "A3B4C5D6")
  shortUrl: string | null; // 6-char code (e.g., "xYz123") - nullable
  clickCount: number;      // Track usage
  createdAt: Date;
  updatedAt: Date;
}
```

## URL Generation Flow

### When Share Links Are Created

1. **On Quiz Publish** (`/api/educator/quiz/[id]/publish/route.ts`)
   - Automatically creates share link with `shareCode`
   - Short URL is NOT generated yet (lazy loading)

2. **On Demand** (`/api/educator/quiz/[id]/share-link/route.ts`)
   - GET: Retrieves existing or creates new share link
   - POST: Regenerates share link (invalidates old one)

3. **During Email Notifications**
   - Bulk enrollment, reassignment, invitations
   - Creates share link if doesn't exist
   - Generates short URL if not already created
   - Falls back to dashboard if no URL available

### Short URL Generation (Lazy)

Short URLs are generated only when needed:
```typescript
// In email sending or share button click
const shortCode = await createShortUrl(shareCode);
const shortUrl = shortCode ? getShortUrl(shortCode) : null;
```

## URL Resolution Flow

```mermaid
graph LR
    A[User clicks short URL] --> B[/s/xYz123]
    B --> C[resolveShortUrl]
    C --> D[Increment click count]
    D --> E[Get shareCode]
    E --> F[Redirect to /quiz/share/A3B4C5D6]
    F --> G[Quiz share page]
```

## Deferred Scheduling Integration

### How Deferred Quizzes Work with URLs

1. **Creation Phase**
   - Quiz created with `schedulingStatus: 'deferred'`
   - No `startTime` set initially
   - Status remains `draft`

2. **Scheduling Phase**
   - Educator sets `startTime` via scheduling modal
   - Quiz can now be published

3. **Publishing Phase**
   - Share link automatically created
   - Both share code and short URL available
   - URLs work immediately but quiz access controlled by `startTime`

4. **Access Control**
   - URLs are always accessible
   - Quiz start page checks `startTime` and shows countdown if future
   - Students see "Quiz starts in X hours" message

### Important: URLs vs Quiz Availability
- **URLs are always active** once created
- **Quiz access is controlled by `startTime`** not URL availability
- This allows pre-sharing of links for scheduled quizzes

## Frontend Implementation Guidelines

### 1. ShareLinkButton Component
```typescript
// Best practices for share link button
const ShareLinkButton = ({ quizId }) => {
  // Always prefer shortUrl over shareUrl for display
  const displayUrl = shortUrl || shareUrl;
  
  // Show loading state while fetching
  if (loading) return <Loader />;
  
  // Handle both URL types gracefully
  const copyUrl = shortUrl || shareUrl || "";
};
```

### 2. URL Display Priority
1. **Short URL first**: If available, always show short URL to users
2. **Share URL fallback**: Use full share URL if short URL not generated
3. **Loading state**: Show spinner while generating URLs

### 3. Handling Scheduled Quizzes
```typescript
// Check if quiz is scheduled for future
if (quiz.startTime && new Date(quiz.startTime) > new Date()) {
  // Show countdown or schedule info
  return <QuizScheduledBanner startTime={quiz.startTime} />;
}
```

## Backend Implementation Guidelines

### 1. Creating Share Links
```typescript
// Always check for existing share link first
const existingLink = await db
  .select()
  .from(quizShareLinks)
  .where(eq(quizShareLinks.quizId, quizId))
  .limit(1);

if (existingLink.length > 0) {
  // Use existing
  shareCode = existingLink[0].shareCode;
} else {
  // Create new
  shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  await db.insert(quizShareLinks).values({...});
}
```

### 2. Generating Short URLs
```typescript
// Lazy generation pattern
if (!shareLink.shortUrl) {
  const shortCode = await createShortUrl(shareCode);
  if (shortCode) {
    shortUrl = getShortUrl(shortCode);
  }
} else {
  shortUrl = getShortUrl(shareLink.shortUrl);
}
```

### 3. Email URL Priority
```typescript
// In email templates, prefer short URL
const quizUrl = shortUrl || 
  (shareCode ? `${process.env.NEXT_PUBLIC_APP_URL}/quiz/share/${shareCode}` : 
  `${process.env.NEXT_PUBLIC_APP_URL}/student/dashboard`);
```

## Error Handling

### URL Generation Failures
1. **Short URL generation fails**: Fall back to share URL
2. **Share link creation fails**: Fall back to dashboard URL
3. **Invalid/expired URLs**: Redirect to home page

### Best Practices
- Always validate quiz ownership before generating share links
- Check quiz publish status before allowing share
- Log URL generation failures for monitoring
- Implement retry logic for short URL generation

## Security Considerations

1. **Share Code Generation**
   - Use cryptographically secure random generation
   - 8 characters = ~47 bits of entropy (sufficient for quiz links)

2. **Short URL Generation**
   - 6 characters to balance brevity and uniqueness
   - Collision detection with retry logic

3. **Access Control**
   - URLs don't grant access - they identify the quiz
   - Actual access controlled by enrollment status and start time
   - Authentication may be required based on quiz settings

## Monitoring and Analytics

### Click Tracking
```typescript
// Automatically tracked in resolveShortUrl
clickCount: (shareLink.clickCount || 0) + 1
```

### Metrics to Monitor
- Share link creation rate
- Short URL generation success rate
- Click-through rates
- Most shared quizzes
- Failed URL generations

## Migration and Compatibility

### Handling Legacy Quizzes
- Quizzes published before share link system: Create on first request
- Missing short URLs: Generate on demand (lazy loading)
- Invalid share codes: Regenerate through admin interface

### Database Migrations
```sql
-- Ensure share links exist for all published quizzes
INSERT INTO quiz_share_links (quiz_id, educator_id, share_code, ...)
SELECT id, educator_id, generate_share_code(), ...
FROM quizzes 
WHERE status = 'published' 
AND id NOT IN (SELECT quiz_id FROM quiz_share_links);
```

## Common Issues and Solutions

### Issue 1: "URL not available" in emails
**Cause**: Quiz not published or share link not created
**Solution**: Ensure quiz is published before sending notifications

### Issue 2: Short URL not working
**Cause**: Short URL not generated or database inconsistency
**Solution**: Regenerate share link through educator interface

### Issue 3: Deferred quiz accessible before start time
**Cause**: Missing start time validation in quiz access
**Solution**: Check `startTime` in student quiz start route

## Testing Guidelines

### Unit Tests
```typescript
describe('URL System', () => {
  test('generates unique share codes', async () => {
    const code1 = generateShareCode();
    const code2 = generateShareCode();
    expect(code1).not.toBe(code2);
  });
  
  test('creates short URL on demand', async () => {
    const shortCode = await createShortUrl('TEST1234');
    expect(shortCode).toHaveLength(6);
  });
  
  test('resolves short URL correctly', async () => {
    const shareCode = await resolveShortUrl('abc123');
    expect(shareCode).toBe('TEST1234');
  });
});
```

### Integration Tests
1. Create quiz → Publish → Verify share link created
2. Generate short URL → Verify redirect works
3. Send email → Verify correct URL used
4. Schedule quiz → Verify URL active but access controlled

## Summary

The dual URL system provides:
- **Flexibility**: Long descriptive URLs and short convenient ones
- **Tracking**: Click analytics through short URL redirects
- **Compatibility**: Works with all quiz types including deferred
- **Reliability**: Fallback mechanisms at every level

Key principle: **URLs identify quizzes, not grant access**. Access control happens at the application level based on enrollment, authentication, and scheduling.