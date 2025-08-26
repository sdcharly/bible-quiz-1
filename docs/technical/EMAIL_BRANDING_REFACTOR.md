# Email Branding Refactor - Complete

## Problem
The email service had hardcoded app names ("BibleQuiz" and "Scrolls of Wisdom") throughout the templates, making it difficult to maintain and causing inconsistent branding when the EMAIL_FROM environment variable was not properly configured.

## Solution
Created a centralized branding system using environment variables for consistent email branding across the entire application.

## Changes Made

### 1. Created Branding Utility (`src/lib/branding.ts`)
- Centralized all branding configuration
- Uses environment variables with sensible defaults
- Provides helper functions for consistent formatting
- Environment variables:
  - `NEXT_PUBLIC_APP_NAME` - App display name
  - `NEXT_PUBLIC_APP_TAGLINE` - App tagline/subtitle
  - `NEXT_PUBLIC_SUPPORT_EMAIL` - Support contact email
  - `EMAIL_FROM` - Email sender header

### 2. Updated Email Service (`src/lib/email-service.ts`)
- Replaced all hardcoded "Scrolls of Wisdom" references with `${branding.appName}`
- Updated copyright footers to use `branding.getCopyrightText()`
- Updated email footers to use `branding.getEmailFooter()`
- Updated support email references to use `${branding.supportEmail}`
- Updated app URLs to use `branding.appUrl`
- Fixed sender header to use `branding.getEmailFromHeader()`

### 3. Updated Environment Files
- Added branding variables to `.env.example`
- Fixed hardcoded "BibleQuiz" to "Scrolls of Wisdom" in `.env` and `.env.production`
- Added new branding environment variables

### 4. Template Changes
All email templates now dynamically use:
- App name from environment
- Tagline from environment
- Support email from environment
- Consistent copyright formatting
- Proper URL generation

## Benefits

1. **Consistency**: All emails now use the same branding source
2. **Maintainability**: Single place to change app branding
3. **Environment Flexibility**: Easy to customize for different deployments
4. **No Hardcoding**: All branding elements are configurable
5. **Future-Proof**: Easy to rebrand or white-label the application

## Environment Variables Required

```env
# Application Branding
NEXT_PUBLIC_APP_NAME="Your App Name"
NEXT_PUBLIC_APP_TAGLINE="Your App Tagline"
NEXT_PUBLIC_SUPPORT_EMAIL="support@yourdomain.com"
EMAIL_FROM="Your App Name <noreply@yourdomain.com>"
```

## Testing
- Build passes successfully
- All email templates now use centralized branding
- Environment variables properly integrated
- No hardcoded app names remaining in email service

## Impact
- **Before**: Emails could show "BibleQuiz" or "Scrolls of Wisdom" inconsistently
- **After**: All emails consistently use the configured app name from environment variables
- Easy to maintain and debug email branding issues
- Supports future rebranding or multi-tenant deployments