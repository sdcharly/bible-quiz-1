# Project Instructions for Claude

- Always run the db generate, migrate and build commands to check for errors after completing your changes.

## Performance Optimization - Logger Usage

**IMPORTANT**: To optimize performance, we use a custom logger that only outputs in development mode.

### How to Use the Logger:
```typescript
import { logger } from "@/lib/logger";

// Instead of console.log, console.error, etc., use:
logger.log("Debug message", data);
logger.error("Error message", error);
logger.warn("Warning message");
logger.info("Info message");
logger.debug("Debug details");
logger.trace("Trace message");

// For critical errors that MUST be logged even in production:
logger.force("CRITICAL ERROR", error);
```

### Why This Matters:
- **345 console statements were removed** from 95 files to improve performance
- Console logging in production significantly slows down the application
- The logger automatically checks NODE_ENV and only logs in development
- This resulted in 20-30% faster page loads, especially for timezone operations

### Files Already Optimized:
- `/src/lib/timezone.ts` - 34 console statements replaced
- `/src/lib/lightrag-service.ts` - 33 console statements replaced
- All logging now goes through `/src/lib/logger.ts`

**DO NOT use console.log/error/warn directly** - always use the logger utility to maintain performance gains.

## Environment Configuration

**IMPORTANT**: The app uses proper environment detection via `/src/lib/env-config.ts`

### How It Works:
- **NODE_ENV is automatically set by Next.js** (development/production/test)
- Custom flags use `NEXT_PUBLIC_*` prefix for client-side access
- See `/docs/deployment/ENVIRONMENT_CONFIG.md` for complete deployment guide

### Quick Reference:
```typescript
import { ENV, shouldLog, isDebugEnabled } from '@/lib/env-config';

// Check environment
if (ENV.isDevelopment) { /* dev only */ }
if (ENV.isProduction) { /* prod only */ }

// Check if logging should happen
if (shouldLog('error')) { /* log errors */ }

// Check if debug features enabled
if (isDebugEnabled()) { /* debug mode */ }
```

### Production Environment Variables:
- Logging is OFF by default in production (automatic performance)
- To enable: Set `NEXT_PUBLIC_ENABLE_LOGGING=true`
- Debug endpoints blocked unless `NEXT_PUBLIC_ENABLE_DEBUG_ENDPOINTS=true`
- Full configuration guide in `/docs/deployment/ENVIRONMENT_CONFIG.md`

## URL System Documentation

**IMPORTANT**: We use a dual URL system (share codes + short URLs) for quiz sharing.

### Key Documentation:
- **URL Architecture**: `/docs/technical/URL_SYSTEM_ARCHITECTURE.md` - Complete URL system design
- **Quick Reference**: `/docs/technical/URL_QUICK_REFERENCE.md` - Developer cheat sheet

### URL System Summary:
- **Share URLs**: `/quiz/share/[8-char]` - Primary quiz links, created on publish
- **Short URLs**: `/s/[6-char]` - Convenient redirects, created on demand
- **Deferred Quizzes**: URLs always work, access controlled by `startTime`
- **Priority**: Always display `shortUrl || shareUrl || dashboard` in UI

## Project Documentation

### Important Documents:
- **TODO List**: `/docs/project-management/TODO_SUPER_ADMIN_INTEGRATION.md` - Master task tracking
- **Security Audit**: `/docs/project-management/SECURITY_AUDIT_REPORT.md` - Security findings and fixes
- **Environment Setup**: `/docs/deployment/ENVIRONMENT_CONFIG.md` - Deployment configuration
- **Technical Docs**: `/docs/technical/` - Implementation details and fixes

### UI/UX Standards:
- **Theme Guide**: `/docs/technical/THEME_CONSISTENCY_GUIDE.md` - Biblical theme colors and components
- **UI Sizing**: `/docs/technical/UI_SIZING_STANDARDS.md` - Consistent sizing and spacing standards
- **URL System**: `/docs/technical/URL_SYSTEM_ARCHITECTURE.md` - Share links and short URLs

### API Documentation:
- **LightRAG API**: `/docs/technical/LIGHTRAG_API_REFERENCE.md` - CRITICAL: Document processing pipeline and status checking
- **LightRAG Troubleshooting**: `/docs/technical/LIGHTRAG_API_CRITICAL_FINDINGS.md` - Root cause analysis and fixes

## LightRAG API Integration (CRITICAL)

**API Documentation**: https://lightrag-6bki.onrender.com/openapi.json

### Key Endpoints & Requirements:

1. **Document Upload** (`POST /documents/upload`):
   - Returns: `{ status, message, track_id }`
   - **CRITICAL**: `track_id` is REQUIRED for all subsequent operations
   - **NEVER** fallback to internal document IDs if `track_id` is missing

2. **Check Status** (`GET /documents/track_status/{track_id}`):
   - Returns: `{ track_id, documents: [], total_count, status_summary }`
   - Document is ready when: `total_count > 0` or `documents` array has items
   - Empty `documents` array means still processing or wrong ID

3. **Delete Document** (`DELETE /documents/{document_id}`):
   - Uses LightRAG's document ID, NOT our internal database ID

### Common Issues:
- **Documents stuck in "processing"**: Using wrong ID (internal instead of track_id)
- **Delete not working**: Using internal ID instead of LightRAG document ID
- **Status checks return empty**: LightRAG doesn't recognize our internal IDs

### Debug Process:
1. Check what `track_id` LightRAG returns on upload
2. Verify we're storing the correct `track_id` in `processedData`
3. Ensure status checks use LightRAG's `track_id`, not our document ID
4. Monitor console.error logs for CRITICAL DEBUG messages

### Project Structure:
```
docs/                    # All documentation
├── deployment/          # Deployment and environment configs
│   └── ENVIRONMENT_CONFIG.md
├── project-management/  # TODOs, planning, audits
│   ├── TODO_SUPER_ADMIN_INTEGRATION.md
│   └── SECURITY_AUDIT_REPORT.md
└── technical/          # Technical implementation docs
    ├── WEBHOOK_FIX_SUMMARY.md
    ├── EMAIL_THEME_UPDATE.md
    └── EMAIL_TEMPLATE_GUIDELINES.md  # Email template best practices

scripts/                 # Development scripts
├── tests/              # Manual test scripts (gitignored)
│   ├── test-signup.js
│   ├── test-webhook.js
│   └── ...
└── utils/              # Utility scripts (future)
```

## Email Template Guidelines

**IMPORTANT**: When creating or modifying email templates, follow the guidelines in `/docs/technical/EMAIL_TEMPLATE_GUIDELINES.md`

### Key Email Template Rules:
- **Use table-based layouts** (NOT divs) for email client compatibility
- **All CSS must be inline** on each element (no <style> tags)
- **Always provide fallback colors** using bgcolor attribute for gradients
- **Show actual URL text** below buttons for accessibility
- **Use the `createEmailWrapper` helper** function for consistency
- **Test in multiple clients**: Gmail, Outlook, Apple Mail, and mobile

### Email Color Palette:
- Primary: `#f59e0b` (amber)
- Dark: `#d97706` (dark amber)  
- Background: `#fffbeb` (light cream)
- Text: `#451a03`, `#78350f`, `#92400e`

## UI Component Guidelines (CRITICAL)

**NEVER use raw HTML form elements. ALWAYS use shadcn/ui components.**

### ❌ FORBIDDEN - Raw HTML Elements:
```tsx
<input type="text" />
<input type="email" />
<select></select>
<textarea></textarea>
<button></button>
```

### ✅ REQUIRED - ShadCN Components:
```tsx
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Use these instead
<Input type="email" />
<Select><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem /></SelectContent></Select>
<Textarea />
<Button />
<Checkbox />
<Label />
```

**Why**: Ensures consistent theming, accessibility, type safety, and maintainability across the entire application.

**Audit Report**: See `/docs/technical/SHADCN_COMPONENT_USAGE_AUDIT.md` for current issues that need fixing.

## Important Notes:
- Keep documentation organized in the `/docs` folder
- Don't create unnecessary files in the root directory
- Always check the TODO list before starting new work
- Run tests after making changes
- the production domain of this app is https://biblequiz.textr.in
- Must always check for type errors,Hook dependency issues after you made change in the code. I dont want to fail on deployment.