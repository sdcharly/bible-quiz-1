# Shareable Quiz Links Feature

## Overview
Implemented a comprehensive shareable link system for quizzes that allows educators to easily share quiz links via WhatsApp and other chat apps. The system includes a self-hosted URL shortener and smart routing based on user authentication status.

## Key Features

### 1. Share Link Generation
- **Unique Share Codes**: Each quiz gets a unique 8-character alphanumeric share code
- **Self-Hosted URL Shortener**: Generates short URLs in format `/s/[shortCode]` 
- **Click Tracking**: Tracks how many times each link has been clicked
- **Persistent Links**: Share links are stored in database and reused for same quiz

### 2. Smart User Routing
The share link (`/quiz/share/[shareCode]`) intelligently handles different user scenarios:

#### For Authenticated Users:
- **Already Enrolled**: Direct redirect to quiz page
- **Not Enrolled**: Auto-enrollment and redirect to quiz
- **Not a Student**: Shows error (only students can access via share links)

#### For Non-Authenticated Users:
- Shows quiz preview with title, description, questions count, and duration
- Provides "Sign Up & Start Quiz" button that redirects to signup with invitation token
- After signup, user is auto-enrolled and can start the quiz

### 3. UI Components

#### ShareLinkButton Component
- One-click copy to clipboard
- WhatsApp sharing integration
- Email sharing option
- Shows click count statistics
- Regenerate link capability
- Preview link in new tab

#### Integration Points
- Added to Quiz Management page (`/educator/quiz/[id]/manage`)
- Added to Educator's Quiz Library (`/educator/quizzes`)
- Icon-only button for published quizzes in list view

## Technical Implementation

### Database Schema
```sql
-- New table: quiz_share_links
CREATE TABLE quiz_share_links (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  educator_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL UNIQUE,
  short_url TEXT,
  expires_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### API Routes

1. **Share Link Generation**
   - `GET /api/educator/quiz/[id]/share-link` - Get or create share link
   - `POST /api/educator/quiz/[id]/share-link` - Regenerate share link

2. **Public Access**
   - `GET /api/quiz/share/[shareCode]` - Get quiz info for share page
   - `POST /api/quiz/share/[shareCode]/enroll` - Auto-enroll authenticated users

3. **URL Shortener**
   - `GET /s/[shortCode]` - Redirect short URL to full share URL

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── educator/quiz/[id]/share-link/route.ts  # Share link management
│   │   └── quiz/share/[shareCode]/
│   │       ├── route.ts                            # Quiz info endpoint
│   │       └── enroll/route.ts                     # Auto-enrollment
│   ├── quiz/share/[shareCode]/page.tsx            # Share link landing page
│   └── s/[shortCode]/route.ts                     # Short URL redirect
├── components/
│   └── quiz/ShareLinkButton.tsx                   # Reusable share button
└── lib/
    └── link-shortener.ts                          # URL shortening service
```

## User Flow

### Educator Flow
1. Educator publishes a quiz
2. Clicks "Share Link" button on quiz management page
3. System generates unique share link and short URL
4. Educator copies link with one click
5. Shares via WhatsApp or other chat apps

### Student Flow (Existing User)
1. Receives share link from educator
2. Clicks link → lands on share page
3. If not logged in → redirected to login
4. After login → auto-enrolled if needed
5. Redirected to quiz taking page

### Student Flow (New User)
1. Receives share link from educator
2. Clicks link → sees quiz preview
3. Clicks "Sign Up & Start Quiz"
4. Completes signup with pre-filled invitation
5. Auto-enrolled and educator relationship created
6. Can immediately start the quiz

## Security Considerations

1. **Access Control**
   - Only educators can generate/regenerate share links for their own quizzes
   - Only students can access quizzes through share links
   - Share links only work for published quizzes

2. **Data Protection**
   - Share codes are cryptographically random
   - Optional expiration dates for links
   - Click tracking without storing personal data

3. **Rate Limiting**
   - Consider adding rate limiting for share link access
   - Prevent abuse of auto-enrollment feature

## Future Enhancements

1. **Analytics Dashboard**
   - Detailed click analytics per share link
   - Conversion tracking (clicks to enrollments)
   - Geographic distribution of clicks

2. **Advanced Sharing**
   - Custom expiration dates per link
   - Maximum usage limits
   - Password-protected links
   - Multiple share links per quiz with different settings

3. **Integration Improvements**
   - QR code generation for physical sharing
   - Social media sharing buttons
   - Bulk share link generation for multiple quizzes

## Email Integration

### Unified Email System
The shareable links are now used in all email notifications, providing a consistent experience across all communication channels.

#### Email Scenarios Using Share Links:

1. **New User Invitations with Quiz**
   - URL Format: `/s/[shortCode]?email=[email]&utm_source=email&utm_medium=invitation&utm_campaign=quiz_invite`
   - Pre-fills email in signup form
   - Auto-enrolls after signup
   - Creates educator relationship

2. **Existing User Quiz Assignments**
   - URL Format: `/s/[shortCode]?utm_source=email&utm_medium=assignment&utm_campaign=quiz_invite`
   - Auto-enrolls if not enrolled
   - Direct access to quiz if enrolled

3. **Bulk Enrollment Notifications**
   - URL Format: `/s/[shortCode]?utm_source=email&utm_medium=bulk_enrollment&utm_campaign=quiz_assignment`
   - Optional email notifications with checkbox
   - Same share link for all enrolled students
   - Tracks engagement per student

#### Benefits of Email Integration:
- **Consistent URLs**: Same link works in email, WhatsApp, and other channels
- **Better Tracking**: UTM parameters track email engagement
- **Simplified Flow**: No need for separate invitation tokens for quiz invites
- **Auto-enrollment**: Students are automatically enrolled when accessing via email
- **Shorter URLs**: Short links (`/s/ABC123`) are cleaner in emails

#### Implementation Details:
- Share links are automatically created when sending invitations
- UTM parameters differentiate traffic sources
- Email parameter pre-fills signup for new users
- Backward compatible with existing invitation system

## Testing Checklist

### Basic Share Link Tests
- [ ] Generate share link for published quiz
- [ ] Copy link to clipboard
- [ ] Share via WhatsApp
- [ ] Access as non-authenticated user
- [ ] Sign up through share link
- [ ] Access as authenticated enrolled student
- [ ] Access as authenticated non-enrolled student
- [ ] Regenerate share link
- [ ] Test short URL redirect
- [ ] Verify click counting works
- [ ] Test with expired quiz
- [ ] Test with archived quiz

### Email Integration Tests
- [ ] Send invitation to new user with quiz - verify share link used
- [ ] Send quiz assignment to existing user - verify share link used
- [ ] Bulk enroll with notifications - verify emails sent with share links
- [ ] Bulk enroll without notifications - verify no emails sent
- [ ] Click email link as new user - verify signup flow with pre-filled email
- [ ] Click email link as existing user - verify auto-enrollment
- [ ] Verify UTM parameters are tracked correctly
- [ ] Test email link with expired quiz
- [ ] Verify short URLs work in emails