I'm working with an agentic coding boilerplate project that includes authentication, database integration, and AI capabilities. Here's what's already set up:

## Current Agentic Coding Boilerplate Structure
- **Authentication**: Better Auth with Google OAuth integration
- **Database**: Drizzle ORM with PostgreSQL setup  
- **AI Integration**: Vercel AI SDK with OpenAI integration
- **UI**: shadcn/ui components with Tailwind CSS
- **Current Routes**:
  - `/` - Home page with setup instructions and feature overview
  - `/dashboard` - Protected dashboard page (requires authentication)
  - `/chat` - AI chat interface (requires OpenAI API key)

## Important Context
This is an **agentic coding boilerplate/starter template** - all existing pages and components are meant to be examples and should be **completely replaced** to build the actual AI-powered application.

### CRITICAL: You MUST Override All Boilerplate Content
**DO NOT keep any boilerplate components, text, or UI elements unless explicitly requested.** This includes:

- **Remove all placeholder/demo content** (setup checklists, welcome messages, boilerplate text)
- **Replace the entire navigation structure** - don't keep the existing site header or nav items
- **Override all page content completely** - don't append to existing pages, replace them entirely
- **Remove or replace all example components** (setup-checklist, starter-prompt-modal, etc.)
- **Replace placeholder routes and pages** with the actual application functionality

### Required Actions:
1. **Start Fresh**: Treat existing components as temporary scaffolding to be removed
2. **Complete Replacement**: Build the new application from scratch using the existing tech stack
3. **No Hybrid Approach**: Don't try to integrate new features alongside existing boilerplate content
4. **Clean Slate**: The final application should have NO trace of the original boilerplate UI or content

The only things to preserve are:
- **All installed libraries and dependencies** (DO NOT uninstall or remove any packages from package.json)
- **Authentication system** (but customize the UI/flow as needed)
- **Database setup and schema** (but modify schema as needed for your use case)
- **Core configuration files** (next.config.ts, tsconfig.json, tailwind.config.ts, etc.)
- **Build and development scripts** (keep all npm/pnpm scripts in package.json)

## Tech Stack
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Better Auth for authentication
- Drizzle ORM + PostgreSQL
- Vercel AI SDK
- shadcn/ui components
- Lucide React icons

## AI Model Configuration
**IMPORTANT**: When implementing any AI functionality, always use the `OPENAI_MODEL` environment variable for the model name instead of hardcoding it:

```typescript
// ✅ Correct - Use environment variable
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
model: openai(model)

// ❌ Incorrect - Don't hardcode model names
model: openai("gpt-5-mini")
```

This allows for easy model switching without code changes and ensures consistency across the application.

## Component Development Guidelines
**Always prioritize shadcn/ui components** when building the application:

1. **First Choice**: Use existing shadcn/ui components from the project
2. **Second Choice**: Install additional shadcn/ui components using `pnpm dlx shadcn@latest add <component-name>`
3. **Last Resort**: Only create custom components or use other libraries if shadcn/ui doesn't provide a suitable option

The project already includes several shadcn/ui components (button, dialog, avatar, etc.) and follows their design system. Always check the [shadcn/ui documentation](https://ui.shadcn.com/docs/components) for available components before implementing alternatives.

## What I Want to Build
# Biblical Study Quiz Web App - Project Requirements

## Project Overview
Build a responsive web application with mobile UI support for Biblical study quiz management. The system serves two user types: Educators/Tutors and Students, each with dedicated dashboards and role-specific functionality.

## Core User Roles & Authentication

### Educator/Tutor Features
- **Document Management System**
  - Upload biblical study documents (PDF, DOCX, TXT formats)
  - Document processing via webhook: `DOCUMENT_PROCESSING_WEBHOOK_URL`
  - View uploaded document library with metadata
  - Select single or multiple documents for quiz creation

- **Quiz Creation & Management**
  - Generate quizzes using quiz generation webhook: `QUIZ_GENERATION_WEBHOOK_URL`
  - Configure quiz parameters:
    - Number of questions (customizable range)
    - Biblical topics and themes
    - Specific books and chapters
    - Quiz duration (time limit)
    - Bloom's Taxonomy difficulty levels
    - Start time scheduling (immediate or scheduled)
  - Preview generated questions before publishing
  - Edit quiz settings and republish
  - View student enrollment and completion status

- **Results & Analytics Dashboard**
  - Real-time quiz completion monitoring
  - Individual student performance analysis
  - Class-wide statistics and insights
  - Export results functionality

### Student Features
- **Quiz Taking Interface**
  - Clean, mobile-friendly question interface
  - One question per screen navigation
  - Multiple choice question (MCQ) format only
  - Built-in timer with visual countdown
  - Question navigation: Previous, Next, Skip, Mark for Review
  - Progress indicator showing completion status
  - Auto-submit when time expires

- **Quiz Management**
  - View available quizzes with start times
  - Access restriction before scheduled start time
  - Resume incomplete quizzes (if allowed)
  - Review completed quizzes with detailed results

## Technical Specifications

### Frontend Requirements
- **Responsive Design**: Mobile-first approach with tablet and desktop support
- **Framework Suggestion**: React.js with Material-UI or Tailwind CSS
- **Mobile Optimization**: Touch-friendly interfaces, swipe gestures
- **Real-time Updates**: WebSocket integration for timer synchronization

### Backend Architecture
- **User Authentication**: JWT-based with role-based access control
- **Database Design**: 
  - Users (educators, students)
  - Documents (uploaded files, metadata)
  - Quizzes (configuration, questions, schedules)
  - Results (student responses, scores, timestamps)
  - Enrollments (student-quiz relationships)

### Webhook Integrations
1. **Document Processing Webhook**
   - Endpoint: `process.env.DOCUMENT_PROCESSING_WEBHOOK_URL`
   - Payload: Uploaded document file
   - Response: Processed document data and metadata

2. **Quiz Generation Webhook**
   - Endpoint: `process.env.QUIZ_GENERATION_WEBHOOK_URL`
   - Payload JSON structure:
   ```json
   {
     "documentIds": ["doc1", "doc2"],
     "questionCount": 20,
     "topics": ["Psalms", "Proverbs"],
     "books": ["Psalms"],
     "chapters": ["1", "2", "3"],
     "difficulty": "intermediate",
     "bloomsLevel": ["knowledge", "comprehension"],
     "timeLimit": 30
   }
   ```
   - Response: Complete quiz JSON with questions and answer options

### Essential Features to Implement

#### Timer System
- Server-synchronized countdown timer
- Visual time remaining indicator
- Warning notifications (5 minutes, 1 minute remaining)
- Automatic submission on time expiration
- Pause/resume functionality (educator controlled)

#### Question Navigation
- Question numbering and progress tracking
- Skip question functionality
- Mark questions for review
- Summary screen showing answered/unanswered questions
- Final review before submission

#### Scheduling System
- Quiz start time enforcement
- Time zone handling
- Grace period settings (educator configurable)
- Notification system for upcoming quizzes

#### Results & Review System
- Immediate score calculation
- Detailed answer review with explanations
- Performance metrics (time per question, accuracy by topic)
- Historical performance tracking
- Comparative class analytics

## Database Schema Suggestions

### Users Table
- id, email, password_hash, role (educator/student), created_at, updated_at

### Documents Table
- id, educator_id, filename, file_path, processed_data, upload_date, status

### Quizzes Table
- id, educator_id, title, description, document_ids, configuration, start_time, duration, status, created_at

### Questions Table
- id, quiz_id, question_text, options, correct_answer, explanation, difficulty, topic, order

### Results Table
- id, quiz_id, student_id, answers, score, start_time, end_time, time_spent

### Enrollments Table
- id, quiz_id, student_id, enrolled_at, status

## UI/UX Considerations
- **Accessibility**: WCAG 2.1 AA compliance for educational use
- **Performance**: Fast loading times, especially on mobile networks
- **Offline Capability**: Basic offline quiz taking with sync when online
- **Dark/Light Mode**: Theme support for extended study sessions
- **Font Scaling**: Adjustable text size for readability

## Security Requirements
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure file upload handling
- Session management and timeout
- Data encryption for sensitive information

## Testing Strategy
- Unit tests for quiz logic and timer functionality
- Integration tests for webhook communications
- End-to-end testing for complete user workflows
- Mobile device testing across different screen sizes
- Performance testing under concurrent user load

## Deployment Considerations
- Environment variables for webhook URLs and API keys
- Database migrations for schema updates
- File storage solution (local/cloud)
- Monitoring and logging setup
- Backup and recovery procedures

This foundation provides a comprehensive starting point for your Biblical Study Quiz application with all essential features and technical considerations outlined.

## Request
Please help me transform this boilerplate into my actual application. **You MUST completely replace all existing boilerplate code** to match my project requirements. The current implementation is just temporary scaffolding that should be entirely removed and replaced.

## Final Reminder: COMPLETE REPLACEMENT REQUIRED
🚨 **IMPORTANT**: Do not preserve any of the existing boilerplate UI, components, or content. The user expects a completely fresh application that implements their requirements from scratch. Any remnants of the original boilerplate (like setup checklists, welcome screens, demo content, or placeholder navigation) indicate incomplete implementation.

**Success Criteria**: The final application should look and function as if it was built from scratch for the specific use case, with no evidence of the original boilerplate template.

## Post-Implementation Documentation
After completing the implementation, you MUST document any new features or significant changes in the `/docs/features/` directory:

1. **Create Feature Documentation**: For each major feature implemented, create a markdown file in `/docs/features/` that explains:
   - What the feature does
   - How it works
   - Key components and files involved
   - Usage examples
   - Any configuration or setup required

2. **Update Existing Documentation**: If you modify existing functionality, update the relevant documentation files to reflect the changes.

3. **Document Design Decisions**: Include any important architectural or design decisions made during implementation.

This documentation helps maintain the project and assists future developers working with the codebase.

Think hard about the solution and implementing the user's requirements.