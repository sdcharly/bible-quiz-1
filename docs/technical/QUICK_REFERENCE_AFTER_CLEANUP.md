# 🚀 Quick Reference - Post-Cleanup Codebase

## 📁 Where Things Are Now

### Components
```bash
# Student Components (Mixed v1 + v2)
/components/student/          # GroupInfo, StudentPageWrapper only
/components/student-v2/       # Everything else

# Educator Components (v2 only) 
/components/educator-v2/      # All educator components
# /components/educator/       # ❌ DELETED - Don't use
```

### API Routes
```bash
# Student APIs
/api/student/quizzes/route.ts     # ✅ Unified endpoint (handles all optimizations)
# /api/student/quizzes/optimized  # ❌ DELETED - Merged into main route
# /api/student/quizzes/enhanced   # ❌ DELETED - Merged into main route

# Educator APIs
/api/educator/analytics/route.ts   # ✅ Main analytics (with optimizations)
# /api/educator/analytics/optimized # ❌ DELETED - Merged into main route
```

### Cache Files
```bash
/lib/api-cache.ts     # API response caching (has optimized code)
/lib/cache-v2.ts      # Admin metrics & monitoring
/lib/quiz-cache.ts    # Quiz-specific caching
# /lib/cache.ts       # ❌ DELETED (was unused)
```

## ⚡ Common Tasks

### Adding a New Student Component
```typescript
// 1. Check if exists in v2 first
import { ComponentName } from "@/components/student-v2";

// 2. If not in v2, check v1
import { GroupInfo } from "@/components/student/GroupInfo";

// 3. If creating new, add to v2
// Create in: /components/student-v2/category/ComponentName.tsx
```

### Adding a New Educator Component
```typescript
// ALWAYS use v2 (v1 is deleted)
import { ComponentName } from "@/components/educator-v2";

// Create new in: /components/educator-v2/category/ComponentName.tsx
```

### Using Feature Flags
```typescript
// ✅ CORRECT - String literal, 1 parameter
import { isFeatureEnabled } from '@/lib/feature-flags';

if (isFeatureEnabled('OPTIMIZED_DB_POOL')) { }
if (isFeatureEnabled('DEFERRED_TIME')) { }

// ❌ WRONG - Don't use these patterns
isFeatureEnabled(FEATURES.SOME_FLAG)        // No object access
isFeatureEnabled('SOME_FLAG', userId)       // No second parameter
```

### Database Imports
```typescript
// ✅ Standard for all routes
import { db } from "@/lib/db";

// ⚠️ Exception: Only for health monitoring
import { checkDbHealth } from "@/lib/db-optimized";
```

### Caching API Responses
```typescript
// Use the optimized cache (it's in api-cache.ts now)
import { fetchWithOptimizedCache } from "@/lib/api-cache";

const data = await fetchWithOptimizedCache('/api/endpoint', {
  ttl: 300 // 5 minutes
});
```

## 🚫 Don't Do These

### Don't Create Duplicate Files
```bash
# ❌ WRONG
/api/student/something/route.ts
/api/student/something/optimized/route.ts  # Don't create this

# ✅ RIGHT
/api/student/something/route.ts  # Use feature flags internally
```

### Don't Import From Deleted Directories
```typescript
// ❌ These will fail
import { Something } from "@/components/educator";  // Deleted
import { PageHeader } from "@/components/student";  // Deleted
import { cache } from "@/lib/cache";                // Deleted

// ✅ Use these instead
import { Something } from "@/components/educator-v2";
import { PageHeader } from "@/components/student-v2";
import { fetchWithOptimizedCache } from "@/lib/api-cache";
```

### Don't Access Postgres.js Internals
```typescript
// ❌ These properties don't exist
sql.options.idle
sql.options.max

// ✅ Use our wrapper functions
import { getPoolStats } from "@/lib/db-optimized";
```

## 🔍 Quick Checks

### Check for Duplicates
```bash
# Find any remaining optimized/enhanced files
find src -name "*optimized*" -o -name "*enhanced*"

# Check component usage
grep -r "from.*@/components/student\"" src --include="*.tsx"
grep -r "from.*@/components/educator\"" src --include="*.tsx"
```

### TypeScript Validation
```bash
# Quick type check (excludes test files)
npx tsc --noEmit --skipLibCheck

# Full build test
npm run build
```

### Database Consistency
```bash
# Check what database each module uses
grep -r "from.*@/lib/db" src/app/api/student --include="*.ts" | wc -l
grep -r "from.*@/lib/db" src/app/api/educator --include="*.ts" | wc -l
```

## 📊 Current State Summary

| Module | Components | API Routes | Database | Status |
|--------|------------|------------|----------|--------|
| Student | Mixed (v1+v2) | Unified | @/lib/db | ✅ Clean |
| Educator | v2 only | Cleaned | @/lib/db | ✅ Clean |
| Admin | admin-v2 | Standard | @/lib/db | ✅ Clean |

## 🎯 Migration Roadmap

### Remaining Work (Low Priority)
1. Migrate `GroupInfo.tsx` to student-v2
2. Migrate `StudentPageWrapper.tsx` to student-v2
3. Delete `/components/student/` directory

### Completed ✅
- All duplicate API routes removed
- All unused files deleted
- Feature flags standardized
- TypeScript errors fixed
- Database imports consistent

---
*Last Updated: August 30, 2025*
*Full Report: `/docs/technical/CODEBASE_CLEANUP_REPORT.md`*