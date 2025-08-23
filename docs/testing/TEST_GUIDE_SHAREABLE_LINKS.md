# Shareable Link Testing Guide

## Overview
This guide will help you manually test the shareable link functionality to ensure everything is working correctly.

## Prerequisites
1. Ensure the database is properly configured in your `.env` file
2. Start the development server: `npm run dev`
3. Have at least one educator account and one published quiz

## Test Scenarios

### Scenario 1: Creating a Shareable Link (Educator)

1. **Login as Educator**
   - Go to `/auth/signin`
   - Login with educator credentials
   
2. **Navigate to Quiz Management**
   - Go to `/educator/quizzes`
   - Find a published quiz
   - Click on "Manage" for that quiz

3. **Generate Share Link**
   - Look for the "Share" or "Get Shareable Link" button
   - Click to generate a shareable link
   - Copy the generated link (should look like: `http://localhost:3000/quiz/share/XXXXXXXX`)

### Scenario 2: New User Signup via Share Link

1. **Open Incognito/Private Browser Window**
   - This ensures you're not logged in
   
2. **Access the Share Link**
   - Paste the shareable link URL
   - You should see the quiz details page with:
     - Quiz title and description
     - Number of questions
     - Duration
     - Educator name
     - "Sign Up & Start Quiz" or "Log In to Start" button

3. **Sign Up Process**
   - Click "Sign Up & Start Quiz"
   - You should be redirected to `/auth/signup` with an invitation token
   - Fill in the signup form:
     - Name
     - Email (use a new email)
     - Phone (optional)
     - Password
   - Submit the form

4. **Verify Auto-Enrollment**
   - After signup, you should be redirected back to the quiz
   - The page should show "Start Quiz" or "Enroll & Start Quiz"
   - Click the button to start the quiz

### Scenario 3: Existing User Access via Share Link

1. **Sign Out and Sign In with Different Account**
   - Sign out from the current account
   - Access the share link while logged out
   
2. **Sign In Flow**
   - Click "Log In to Start"
   - Sign in with existing student credentials
   - Should be redirected back to `/quiz/share/XXXXXXXX`

3. **Auto-Enrollment Check**
   - If not enrolled: Should see "Enroll & Start Quiz" button
   - If already enrolled: Should see "Start Quiz" button
   - Click the button to proceed

### Scenario 4: Google OAuth Signup via Share Link

1. **Access Share Link (Logged Out)**
   - Open the share link in incognito mode
   
2. **Choose Google Sign-In**
   - On the signup page, click "Continue with Google"
   - Complete Google OAuth flow
   
3. **Verify Callback Handling**
   - Should be redirected to `/auth/callback`
   - Then automatically redirected to the quiz
   - Should be able to enroll and start the quiz

## Expected Behaviors

### ✅ Success Indicators

1. **Share Link Generation**
   - Educator can generate unique share codes
   - Share links are accessible without authentication
   
2. **New User Flow**
   - Invitation token is created for unauthenticated users
   - Signup form pre-fills email if provided
   - After signup, user is auto-enrolled in the quiz
   - User can immediately start the quiz
   
3. **Existing User Flow**
   - Users can sign in and access the quiz
   - Auto-enrollment happens if not already enrolled
   - Educator-student relationship is created automatically
   
4. **Permissions**
   - Published quizzes are accessible via share links
   - Unpublished quizzes show appropriate error
   - Expired links show appropriate message

### ❌ Common Issues to Check

1. **Database Connection**
   - If you see 500 errors, check database connection in `.env`
   - Ensure `DATABASE_URL` is properly set
   
2. **Session Issues**
   - Clear cookies if experiencing redirect loops
   - Check browser console for session errors
   
3. **Enrollment Issues**
   - Verify quiz is published
   - Check if educator-student relationship exists
   - Ensure enrollment records are created

## API Endpoints to Test

You can test these endpoints directly using curl or Postman:

1. **Get Quiz Info via Share Code**
   ```bash
   curl http://localhost:3000/api/quiz/share/SHARECODE
   ```
   
2. **Validate Invitation**
   ```bash
   curl "http://localhost:3000/api/invitations/validate?token=TOKEN"
   ```
   
3. **Enroll via Share Link (requires auth)**
   ```bash
   curl -X POST http://localhost:3000/api/quiz/share/SHARECODE/enroll \
     -H "Cookie: session=YOUR_SESSION"
   ```

## Database Verification

Check these tables after testing:

1. **quiz_share_links** - Should have share code entries
2. **invitations** - Should have invitation tokens (including empty email ones)
3. **educator_students** - Should have relationships created
4. **enrollments** - Should have enrollment records
5. **user** - Should have new user accounts

## Console Logs to Monitor

While testing, check the browser console and server logs for:

1. Share code generation
2. Invitation token creation
3. Session establishment after signup
4. Enrollment creation
5. Any error messages

## Troubleshooting Commands

```bash
# Check database migrations
npm run db:migrate

# Clear sessions (if needed)
npm run db:studio  # Use Drizzle Studio to inspect/modify data

# Check build for type errors
npm run build

# Run in debug mode (if you have debug logging)
DEBUG=* npm run dev
```

## Report Issues

If you encounter issues, note:
1. The exact URL you were on
2. What action you were trying to perform
3. Any error messages (browser console and server logs)
4. The state of your session (logged in/out, role)

---

## Summary of Improvements Made

The shareable link system has been improved with:

1. **Open Invitations**: Invitations with empty emails that anyone can claim
2. **Auto-Enrollment**: Automatic enrollment when accessing via share link
3. **Better Session Handling**: Proper wait times for session establishment
4. **OAuth Support**: Callback page handles OAuth returns with invitations
5. **Permissive Access**: Removed strict educator-student requirements
6. **Improved UX**: Choice dialog for sign up vs sign in

All code changes have been implemented and the build passes successfully.