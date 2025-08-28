# Quiz Sharing & URL System

## Overview

The Quiz Sharing & URL System provides a dual-URL architecture that enables easy quiz distribution through shareable links. The system generates both standard share codes and shortened URLs, making it simple for educators to distribute quizzes and track engagement.

## What is the Quiz Sharing & URL System

This system creates unique, trackable URLs for quiz access, allowing educators to share quizzes via email, messaging apps, or social media. It features both 8-character share codes and optional 6-character short URLs for maximum flexibility in distribution channels.

### Core Workflow

1. Educator publishes a quiz
2. System generates unique share code automatically
3. Share link becomes immediately available
4. Optional short URL created on demand
5. Students access quiz through either URL format

### Key Components

- **Share Code Generation**: Automatic 8-character unique identifiers
- **Short URL Creation**: On-demand 6-character shortened links
- **Click Tracking**: Monitor link usage and engagement
- **Deferred Access**: URLs work immediately, access controlled by schedule
- **Fallback System**: Graceful handling when URLs unavailable

## Business Value

### Problem Statement

Distributing quizzes to students requires simple, reliable methods that work across all communication channels. Educators need:
- Easy-to-share links that work on all platforms
- Trackable URLs to monitor distribution effectiveness
- Short links for character-limited platforms (SMS, Twitter)
- Reliable access regardless of quiz scheduling
- Protection against link manipulation or guessing

### Solution Benefits

- **Universal Access**: Links work on any device or platform
- **Distribution Flexibility**: Share via email, SMS, social media
- **Engagement Tracking**: Monitor how links are being used
- **Schedule Independence**: Links always work, access controlled separately
- **Security**: Unguessable codes prevent unauthorized access

## User Types and Personas

### Primary Users

**Educators**
- Generate shareable links for quiz distribution
- Track link usage and student engagement
- Share links through multiple channels
- Manage quiz access through scheduling

### Secondary Users

**Students**
- Access quizzes through shared links
- Bookmark links for future access
- Share links with classmates (if permitted)
- Access from any device without login (for public quizzes)

## User Workflows

### Primary Workflow

**Quiz Publishing and Sharing**
1. Educator creates and configures quiz
2. Publishes quiz to make it available
3. System generates share code automatically
4. Educator copies share link from dashboard
5. Distributes link to students via preferred method
6. Students click link and access quiz

### Alternative Workflows

**Short URL Generation**
1. Educator needs shorter link for SMS
2. Clicks "Get Short URL" button
3. System generates 6-character code
4. Short URL displayed for copying
5. Students access via shortened link
6. System redirects to full quiz page

**Bulk Email Distribution**
1. Educator enrolls multiple students
2. System generates share links
3. Creates short URLs for email
4. Sends personalized emails with links
5. Tracks individual link clicks

**Deferred Quiz Access**
1. Educator schedules quiz for future date
2. Share links generated immediately
3. Students receive links in advance
4. Click link before start time
5. See countdown to quiz availability
6. Access automatically enabled at start time

## Functional Requirements

- Generate unique 8-character share codes
- Create optional 6-character short codes
- Track click counts for analytics
- Support custom domain for short URLs
- Handle URL regeneration if needed
- Provide QR code generation
- Support link expiration settings
- Enable link deactivation

### Supporting Features

- **Link Preview**: Show quiz title and details
- **Custom Slugs**: Allow memorable custom URLs
- **Analytics Dashboard**: Detailed click tracking
- **Bulk Generation**: Create multiple links at once
- **Link Management**: View, regenerate, or disable links
- **Integration Support**: API for third-party systems

## User Interface Specifications

**Share Link Panel (Educator Dashboard)**
- Copy button for full share URL
- "Generate Short URL" button
- Click count display
- QR code download option
- Link management actions (regenerate, disable)

**URL Display Format**
- Full URL with copy icon
- Short URL (if generated) with copy icon
- Visual indicator for link status
- Last clicked timestamp
- Total click counter

**Student Access Page**
- Quiz title and description
- Educator information
- Start button (if available)
- Countdown timer (if scheduled)
- Access requirements display

## Security Considerations

- Cryptographically secure random code generation
- Rate limiting on URL access attempts
- Protection against URL enumeration attacks
- Optional password protection for links
- IP-based access restrictions if needed
- Audit logging of all link operations

## Testing Strategy

**Functional Testing**
- Verify unique code generation
- Test URL resolution and redirects
- Validate click tracking accuracy
- Test scheduled access control

**Security Testing**
- Attempt URL guessing/enumeration
- Test rate limiting effectiveness
- Verify access control enforcement
- Check for information disclosure

**Performance Testing**
- Load test URL resolution
- Test with thousands of concurrent clicks
- Verify database query optimization
- Monitor redirect response times

## Success Metrics

- **Link Generation Success**: 100% unique codes without collisions
- **Resolution Speed**: Less than 100ms for URL resolution
- **Click Tracking Accuracy**: 99.9% accuracy in counting
- **Distribution Success**: 95% of shared links successfully accessed
- **Short URL Adoption**: 40% of educators using short URLs
- **Engagement Rate**: Average 75% click-through on shared links