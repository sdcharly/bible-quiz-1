# Scripts Directory

Production-ready utility and maintenance scripts for the SimpleQuiz application.

## Directory Structure

### Core Maintenance Scripts

#### Database Management
- **backup-database.sh** - Production database backup utility
  - Creates timestamped backups
  - Requires POSTGRES_URL environment variable
  - Usage: `./scripts/backup-database.sh`

- **cleanup-sessions.ts** - Intelligent session cleanup
  - Removes expired sessions
  - Analyzes session patterns
  - Usage: `npx tsx scripts/cleanup-sessions.ts`

- **cleanup-stale-quiz-attempts.js** - Quiz attempt maintenance
  - Marks abandoned attempts
  - Cleans incomplete submissions
  - Usage: `node scripts/cleanup-stale-quiz-attempts.js`

- **apply-performance-indexes.js** - Database optimization
  - Applies performance indexes
  - Improves query speed
  - Usage: `node scripts/apply-performance-indexes.js`

#### Admin Tools
- **admin-password-generator.js** - Generate secure admin password hashes
  - Creates bcrypt hashes for production
  - Usage: `node scripts/admin-password-generator.js`

- **generate-admin-password-hash.js** - Alternative hash generator
  - Production deployment utility
  - Usage: `node scripts/generate-admin-password-hash.js`

- **verify-admin-login.js** - Admin authentication troubleshooting
  - Verifies admin credentials
  - Debug authentication issues
  - Usage: `node scripts/verify-admin-login.js`

#### Performance Monitoring
- **monitor-performance.js** - Comprehensive performance monitoring
  - Tracks application metrics
  - Database performance analysis
  - Usage: `node scripts/monitor-performance.js`

- **monitor-performance-simple.js** - Quick health check
  - Basic performance metrics
  - Lightweight monitoring
  - Usage: `node scripts/monitor-performance-simple.js`

#### Document Management
- **check-documents.js** - Document status verification
  - Checks document processing status
  - Validates LightRAG integration
  - Usage: `node scripts/check-documents.js`

#### Development Tools
- **cleanup-unused-vars.js** - Code cleanup utility
  - Removes unused imports
  - Cleans dead code
  - Usage: `node scripts/cleanup-unused-vars.js`

- **seed-permission-templates.ts** - Permission system setup
  - Seeds default permissions
  - Initializes role templates
  - Usage: `npx tsx scripts/seed-permission-templates.ts`

### Test Scripts (`/tests`)

Manual testing utilities for development and debugging:

- **test-enrollment-sync.js** - Test enrollment synchronization
- **test-grading-system.js** - Validate grading calculations
- **test-quiz-results-security.js** - Security validation for quiz results
- **test-replace-webhook.js** - Test question replacement webhook
- **test-share-basic.js** - Basic share functionality test
- **test-shareable-link.js** - Test shareable link generation
- **test-signup.js** - Test user signup flow
- **test-webhook-flow.js** - Complete webhook flow testing
- **test-webhook.js** - Basic webhook endpoint testing

### Usage Examples

```bash
# Database maintenance
./scripts/backup-database.sh
npx tsx scripts/cleanup-sessions.ts
node scripts/cleanup-stale-quiz-attempts.js

# Admin operations
node scripts/admin-password-generator.js
node scripts/verify-admin-login.js

# Performance monitoring
node scripts/monitor-performance.js

# Testing
node scripts/tests/test-signup.js
node scripts/tests/test-webhook.js
```

## Environment Requirements

Most scripts require environment variables from `.env`:
- `POSTGRES_URL` or `DATABASE_URL` - Database connection
- `NEXTAUTH_SECRET` - Authentication secret
- Other app-specific variables

## Best Practices

1. **Always backup before running cleanup scripts**
2. **Test scripts in development first**
3. **Monitor logs when running in production**
4. **Use TypeScript versions when available**
5. **Keep scripts idempotent and safe**

## Script Categories

### 🔧 Maintenance (Run Regularly)
- cleanup-sessions.ts
- cleanup-stale-quiz-attempts.js
- monitor-performance.js

### 🛡️ Admin/Security (As Needed)
- admin-password-generator.js
- verify-admin-login.js
- backup-database.sh

### 📊 Monitoring (Continuous)
- monitor-performance.js
- check-documents.js

### 🧪 Testing (Development)
- All scripts in `/tests` folder

## Phase 1 Completion Note

Obsolete scripts from Phase 1 have been archived in `scripts_backup_phase1_complete_[date].tar.gz`. These include:
- One-time migration scripts
- Completed fix scripts for LightRAG IDs
- Legacy authentication fixes
- Phase 0 audit files

The current script collection represents the essential maintenance and operational tools needed for ongoing production support.