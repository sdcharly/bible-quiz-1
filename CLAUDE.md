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

## Project Documentation

### Important Documents:
- **TODO List**: `/docs/project-management/TODO_SUPER_ADMIN_INTEGRATION.md` - Master task tracking
- **Security Audit**: `/docs/project-management/SECURITY_AUDIT_REPORT.md` - Security findings and fixes
- **Environment Setup**: `/docs/deployment/ENVIRONMENT_CONFIG.md` - Deployment configuration
- **Technical Docs**: `/docs/technical/` - Implementation details and fixes

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
    └── EMAIL_THEME_UPDATE.md

scripts/                 # Development scripts
├── tests/              # Manual test scripts (gitignored)
│   ├── test-signup.js
│   ├── test-webhook.js
│   └── ...
└── utils/              # Utility scripts (future)
```

## Important Notes:
- Keep documentation organized in the `/docs` folder
- Don't create unnecessary files in the root directory
- Always check the TODO list before starting new work
- Run tests after making changes