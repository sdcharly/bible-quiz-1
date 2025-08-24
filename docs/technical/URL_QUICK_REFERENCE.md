# URL System Quick Reference

## 🔗 URL Types at a Glance

| Type | Format | Example | When Created | Purpose |
|------|--------|---------|--------------|---------|
| **Share URL** | `/quiz/share/[8-char]` | `/quiz/share/A3B4C5D6` | On publish | Primary quiz link |
| **Short URL** | `/s/[6-char]` | `/s/xYz123` | On demand | Convenient sharing |
| **Dashboard** | `/student/dashboard` | `/student/dashboard` | Always available | Fallback |

## 🚀 Quick Implementation

### Frontend: Get Share Link
```typescript
// In your component
const response = await fetch(`/api/educator/quiz/${quizId}/share-link`);
const { shareUrl, shortUrl } = await response.json();

// Display priority: short > share > dashboard
const displayUrl = shortUrl || shareUrl || '/student/dashboard';
```

### Backend: Create Share Link
```typescript
// Check existing first
const existing = await db.select().from(quizShareLinks)
  .where(eq(quizShareLinks.quizId, quizId));

if (existing.length === 0) {
  // Create new
  const shareCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  await db.insert(quizShareLinks).values({
    id: crypto.randomUUID(),
    quizId,
    educatorId,
    shareCode,
    createdAt: new Date()
  });
}

// Generate short URL if needed
const shortCode = await createShortUrl(shareCode);
```

### Email: Include Quiz URL
```typescript
// Get or create share link
const shareLink = await getOrCreateShareLink(quizId);
const shortUrl = shareLink.shortUrl 
  ? getShortUrl(shareLink.shortUrl) 
  : await createShortUrl(shareLink.shareCode);

// Use in email
const quizUrl = shortUrl || 
  `${process.env.NEXT_PUBLIC_APP_URL}/quiz/share/${shareLink.shareCode}`;
```

## 📅 Deferred Quiz Handling

### Key Points
- ✅ URLs work immediately after creation
- ✅ Access controlled by `startTime`, not URL
- ✅ Students see countdown if quiz hasn't started

### Check Quiz Availability
```typescript
// In student quiz start
if (quiz.startTime && new Date(quiz.startTime) > new Date()) {
  return <QuizCountdown startTime={quiz.startTime} />;
}
// Otherwise allow quiz start
```

## 🔄 URL Flow Diagram

```
User Journey:
1. Educator publishes quiz → Share link created
2. Educator clicks share → Short URL generated (if needed)
3. Student clicks short URL → Redirects to share URL
4. Share URL page → Checks enrollment/auth → Quiz start
```

## ⚠️ Common Pitfalls

### ❌ DON'T
```typescript
// Don't hardcode URLs
const url = "https://biblequiz.textr.in/quiz/share/HARDCODED";

// Don't generate short URL on every request
const shortUrl = await createShortUrl(shareCode); // Check existing first!

// Don't block access based on URL availability
if (!shareUrl) throw new Error("Can't access quiz");
```

### ✅ DO
```typescript
// Use dynamic URLs
const url = shortUrl || shareUrl || dashboardUrl;

// Check for existing short URL
if (!shareLink.shortUrl) {
  shortUrl = await createShortUrl(shareCode);
}

// Always provide fallback
const quizUrl = shareUrl || `${baseUrl}/student/dashboard`;
```

## 🛠️ Utility Functions

### Get Full URL
```typescript
import { getShortUrl } from '@/lib/link-shortener';

// For display
const fullUrl = getShortUrl(shortCode);
// Returns: https://biblequiz.textr.in/s/abc123
```

### Check URL Validity
```typescript
// Validate share code format
const isValidShareCode = (code: string) => /^[A-F0-9]{8}$/.test(code);

// Validate short code format
const isValidShortCode = (code: string) => /^[A-Za-z0-9]{6}$/.test(code);
```

## 📊 Database Queries

### Get Share Link with Stats
```sql
SELECT 
  share_code,
  short_url,
  click_count,
  created_at
FROM quiz_share_links
WHERE quiz_id = ?
```

### Find Most Shared Quizzes
```sql
SELECT 
  q.title,
  qsl.click_count,
  qsl.share_code
FROM quiz_share_links qsl
JOIN quizzes q ON q.id = qsl.quiz_id
ORDER BY click_count DESC
LIMIT 10
```

## 🔍 Debugging

### Check URL Generation
```typescript
// In browser console
const response = await fetch('/api/educator/quiz/QUIZ_ID/share-link');
const data = await response.json();
console.log('Share URL:', data.shareUrl);
console.log('Short URL:', data.shortUrl);
console.log('Clicks:', data.clickCount);
```

### Verify Redirect
```bash
# Test short URL redirect
curl -I https://biblequiz.textr.in/s/abc123
# Should return 307 redirect to /quiz/share/[shareCode]
```

## 📝 Checklist for New Features

When adding quiz-related features:
- [ ] Generate share link on quiz publish
- [ ] Use short URL in user-facing displays
- [ ] Provide dashboard fallback for errors
- [ ] Track clicks for analytics
- [ ] Handle deferred quiz start times
- [ ] Test URL generation and redirects
- [ ] Include URLs in email notifications
- [ ] Validate quiz ownership before sharing

## 🚨 Emergency Fixes

### Regenerate All Share Links
```typescript
// Admin endpoint to fix missing share links
const publishedQuizzes = await db.select()
  .from(quizzes)
  .where(eq(quizzes.status, 'published'));

for (const quiz of publishedQuizzes) {
  await getOrCreateShareLink(quiz.id);
}
```

### Clear Invalid Short URLs
```sql
-- Remove orphaned short URLs
UPDATE quiz_share_links 
SET short_url = NULL 
WHERE short_url IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM quizzes 
  WHERE quizzes.id = quiz_share_links.quiz_id
);
```