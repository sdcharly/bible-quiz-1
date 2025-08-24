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
- **LightRAG API Complete**: `/docs/technical/LIGHTRAG_API_COMPLETE.md` - Full API specification with all endpoints
- **LightRAG API Reference**: `/docs/technical/LIGHTRAG_API_REFERENCE.md` - CRITICAL: Document processing pipeline and status checking
- **LightRAG Troubleshooting**: `/docs/technical/LIGHTRAG_API_CRITICAL_FINDINGS.md` - Root cause analysis and fixes

## LightRAG API Integration (CRITICAL)

**API Documentation**: https://lightrag-6bki.onrender.com/openapi.json

### CRITICAL: LightRAG ID System

**There are TWO different IDs in LightRAG:**

1. **Track ID** (e.g., `track-xxxxx`):
   - Returned immediately on upload: `{ status, message, track_id }`
   - Used ONLY for checking upload/processing status
   - Temporary ID for tracking the processing job
   - Use with: `GET /documents/track_status/{track_id}`

2. **Document ID** (e.g., `doc-xxxxx`):
   - Generated AFTER processing is complete
   - Found in track_status response: `documents[0].id`
   - Permanent ID for the document
   - Use for ALL future operations (query, delete, reference)
   - Use with: `DELETE /documents/{document_id}`, queries, etc.

### Correct ID Usage Flow:
1. **Upload**: Get `track_id` from response
2. **Check Status**: Use `track_id` with `/documents/track_status/{track_id}`
3. **Processing Complete**: Extract `document_id` from `documents[0].id`
4. **Store Both**: Save `track_id` for status checks, `document_id` for operations
5. **Future Use**: Always use `document_id` for queries, deletion, references

### Key Endpoints & Requirements:

1. **Document Upload** (`POST /documents/upload`):
   - Returns: `{ status, message, track_id }`
   - Save the `track_id` immediately for status checking

2. **Check Status** (`GET /documents/track_status/{track_id}`):
   - **MUST use track_id, NOT document_id**
   - Returns: `{ track_id, documents: [], total_count, status_summary }`
   - Document ready when: `documents` array has items with `id` field
   - Extract `documents[0].id` as the permanent document_id

3. **Delete Document** (`DELETE /documents/{document_id}`):
   - **MUST use document_id from documents array, NOT track_id**
   - This is the permanent document ID

### Common Issues:
- **Documents stuck in "processing"**: Using document_id for status check instead of track_id
- **Status check returns empty**: Wrong ID type (using doc-xxx instead of track-xxx)
- **Delete not working**: Using track_id instead of document_id
- **"Document not found"**: Mixing up the two ID types

### Debug Process:
1. Check `processedData.trackId` for status checks
2. Check `processedData.lightragDocumentId` for operations
3. Verify correct ID type for each API call
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

## Database Handling Guidelines (CRITICAL - SAFETY FIRST)

**IMPORTANT**: Always use environment variables for database connections. NEVER hardcode credentials.

### CRITICAL: How to Access Database URL in Different Contexts

#### 1. In Node.js Scripts (ALWAYS USE THIS METHOD):
```javascript
// CORRECT WAY - Load .env file first
require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// For command-line scripts, use this pattern:
const { Pool } = require('pg');
require('dotenv').config(); // MUST be before accessing env vars
const DATABASE_URL = process.env.POSTGRES_URL; // Note: We use POSTGRES_URL
const pool = new Pool({ connectionString: DATABASE_URL });
```

#### 2. In Next.js API Routes:
```javascript
// Next.js automatically loads .env files
import { db } from "@/lib/db"; // Use the pre-configured db instance
// DO NOT create new connections in API routes
```

#### 3. In Bash/Shell Commands:
```bash
# Method 1: Export specific variable
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node script.js

# Method 2: Use dotenv-cli (if installed)
npx dotenv -e .env node script.js

# Method 3: Inline for one command
node -r dotenv/config script.js
```

### Environment Variable Facts (STOP GUESSING):
- **Primary DB URL Variable**: `POSTGRES_URL` (NOT `DATABASE_URL`)
- **Location**: `.env` file in project root
- **Format**: `POSTGRES_URL=postgresql://user:pass@host:port/dbname`
- **Next.js**: Automatically loads from `.env`, `.env.local`, `.env.production`
- **Scripts**: MUST manually load using `require('dotenv').config()`

### Database Table Names (Case Sensitive):
```sql
-- PostgreSQL table names (exact case matters!)
session          -- Sessions table
"user"           -- User table (quoted because 'user' is reserved)
quiz_attempts    -- Quiz attempts table
quizzes          -- Quizzes table
enrollments      -- Enrollments table
documents        -- Documents table
```

### CRITICAL: Column Name Mapping (Database vs JavaScript):
```sql
-- Database columns use snake_case, Drizzle ORM maps to camelCase
-- Database Column -> JavaScript Property
educator_id      -> educatorId
file_path        -> filePath
display_name     -> displayName
upload_date      -> uploadDate
processed_data   -> processedData
created_at       -> createdAt
updated_at       -> updatedAt

-- When writing raw SQL queries:
SELECT display_name FROM documents  -- Use snake_case

-- When using Drizzle ORM in code:
doc.displayName  // Use camelCase
```

### Safe Database Operations:
```javascript
// 1. Always use parameterized queries
const result = await sql`
  SELECT * FROM users WHERE id = ${userId}
`; // SAFE - prevents SQL injection

// 2. Never concatenate strings for queries
// ❌ DANGEROUS - SQL injection risk
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// 3. Always handle errors gracefully
try {
  const result = await db.execute(query);
} catch (error) {
  logger.error('Database error:', error);
  // Don't expose database errors to users
  return { error: 'An error occurred' };
}

// 4. Always close connections
finally {
  await sql.end();
}
```

### Database Scripts Best Practices:
1. **Always require confirmation** for destructive operations
2. **Show what will be affected** before making changes
3. **Verify operations** after completion
4. **Use transactions** for multi-step operations
5. **Log all operations** for audit trail

### Common Database Commands:
```bash
# Generate schema
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes
npm run db:push

# Open database studio
npm run db:studio
```

### Safety Checklist:
- [ ] Never commit .env files with credentials
- [ ] Always use environment variables for connections
- [ ] Validate all user input before database operations
- [ ] Use prepared statements/parameterized queries
- [ ] Handle errors without exposing system details
- [ ] Close connections properly
- [ ] Test with limited permissions first
- [ ] Keep backups before major operations

### Useful Scripts for Maintenance:
- `/scripts/cleanup-all-sessions.js` - Removes all sessions (requires confirmation)
- `/scripts/cleanup-stale-quiz-attempts.js` - Marks old attempts as abandoned
- `/scripts/cleanup-sessions.ts` - Intelligent session cleanup
- `/scripts/check-documents.js` - Check document status in database

### Quick Database Debugging Commands (COPY-PASTE READY):
```bash
# Check if documents exist in database
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query('SELECT COUNT(*) FROM documents').then(r => {
  console.log('Documents:', r.rows[0].count);
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });"

# List all tables
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool.query(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\").then(r => {
  console.log('Tables:', r.rows.map(t => t.tablename).join(', '));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });"

# Check column names for a table
export $(grep -E "^POSTGRES_URL=" .env | xargs) && node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const table = 'documents'; // Change this to any table
pool.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='\"+table+\"'\").then(r => {
  console.log(table + ' columns:', r.rows.map(c => c.column_name).join(', '));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });"
```

## Testing API Routes Without Authentication Headaches

### For Admin Routes:
```bash
# 1. First, get the admin session (if needed)
# 2. Admin routes check session.user.role === 'admin'
# 3. Most admin APIs are under /api/admin/*

# Quick test for admin APIs (will fail if not authenticated)
curl http://localhost:3000/api/admin/documents/list-all

# To properly test, you need to:
# 1. Login as admin via the UI
# 2. Copy the session cookie from browser DevTools
# 3. Use it in curl: -H "Cookie: better-auth.session=..."
```

### For Development Testing:
```javascript
// Create a test script that uses the database directly
// This bypasses authentication for testing
const script = `
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
// Your test code here
pool.end();
`;
```

## Important Notes:
- Keep documentation organized in the `/docs` folder
- Don't create unnecessary files in the root directory
- Always check the TODO list before starting new work
- Run tests after making changes
- the production domain of this app is https://biblequiz.textr.in
- Must always check for type errors,Hook dependency issues after you made change in the code. I dont want to fail on deployment.
- ALWAYS use the database connection patterns documented above - NO GUESSING!