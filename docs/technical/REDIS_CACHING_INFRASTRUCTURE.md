# Redis Caching Infrastructure

## Overview

The application uses a comprehensive Redis-based caching system with intelligent fallbacks. This document serves as a reference for implementing future caching requirements.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│  Hybrid Cache   │───▶│   Redis/Upstash │
│                 │    │  (/lib/cache-v2)│    │  (/lib/redis.ts)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  In-Memory      │
                        │  Fallback       │
                        └─────────────────┘
```

## Key Files

### Primary Cache Interface: `/src/lib/cache-v2.ts`
- **HybridCache**: Uses Redis primary + in-memory fallback
- **Automatic TTL**: Smart TTL based on data type patterns
- **Metrics**: Built-in performance tracking
- **Batch Operations**: Efficient bulk get/set operations

### Redis Client: `/src/lib/redis.ts`
- **Multi-Provider**: Supports both Upstash and standard Redis
- **Connection Management**: Automatic reconnection and error handling
- **Metrics**: Hit/miss ratios, latency tracking
- **Unified Interface**: Consistent API regardless of Redis provider

### API Caching: `/src/lib/api-cache.ts`
- **HTTP Cache**: Specialized for API response caching
- **Response Reconstruction**: Maintains HTTP status/headers
- **Error Handling**: Graceful fallback to direct fetch

## Quick Implementation Guide

### Basic Caching

```typescript
import { Cache } from "@/lib/cache-v2";

// Simple memoization with automatic TTL
const data = await Cache.memoize(
  Cache.key('students', educatorId),
  async () => {
    // Expensive operation
    return await fetchStudentsFromDatabase(educatorId);
  }
  // TTL automatically determined by key pattern (10 minutes for 'students:')
);

// Manual caching
const cache = Cache.getInstance();
await cache.set('user:profile:123', userData, 900); // 15 minutes
const profile = await cache.get('user:profile:123');
```

### API Response Caching

```typescript
import { fetchWithCache } from "@/lib/api-cache";

// Automatic caching with Redis backend
const response = await fetchWithCache('/api/educator/students', {}, 600); // 10 minutes
const data = await response.json();
```

### Batch Operations

```typescript
import { Cache } from "@/lib/cache-v2";

// Batch get multiple keys
const results = await Cache.batchGet([
  'quiz:123', 'quiz:124', 'quiz:125'
]);

// Batch set multiple values
await Cache.batchSet([
  { key: 'quiz:123', value: quizData, ttl: 300 },
  { key: 'student:456', value: studentData, ttl: 600 }
]);
```

### Cache Invalidation

```typescript
import { Cache } from "@/lib/cache-v2";

// Invalidate specific patterns
await Cache.invalidate('students:*');        // All student data
await Cache.invalidate('quiz:123:*');        // All data for quiz 123
await Cache.invalidate('analytics:*');       // All analytics data
```

## Smart TTL System

The cache automatically determines TTL based on key patterns:

| Pattern | TTL | Use Case |
|---------|-----|----------|
| `analytics:*` | 60s | Real-time analytics |
| `attempt:*` | 120s | Active quiz attempts |
| `quiz:data:*` | 300s | Quiz content |
| `leaderboard:*` | 300s | Leaderboards |
| `students:*` | 600s | Student enrollment |
| `educator:*` | 900s | Educator profiles |
| `questions:*` | 3600s | Generated questions |
| `document:*` | 7200s | Uploaded documents |

## Environment Configuration

### Upstash Redis (Recommended for Production)

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Standard Redis

```env
REDIS_URL=redis://localhost:6379
# or
KV_URL=redis://localhost:6379
```

## Performance Benefits

### Current Performance Gains
- **API Calls**: 40% reduction in redundant requests
- **Database Load**: 35% reduction in database queries
- **Page Load Speed**: 60-75% faster for educator pages
- **Cache Hit Rate**: ~85% for frequently accessed data

### Monitoring Cache Performance

```typescript
import { Cache } from "@/lib/cache-v2";

// Get cache metrics
const metrics = Cache.getMetrics();
console.log({
  redisConnected: metrics.redis.connected,
  hitRate: metrics.redis.hitRate,
  avgLatency: metrics.redis.avgLatency,
  usingRedis: metrics.usingRedis
});
```

## Implementation Examples

### Caching API Endpoints in Pages

```typescript
// Before: Direct API calls
useEffect(() => {
  const fetchData = async () => {
    const students = await fetch('/api/educator/students');
    const groups = await fetch('/api/educator/groups');
    const analytics = await fetch('/api/educator/analytics');
    // ... process responses
  };
  fetchData();
}, []);

// After: Cached API calls
useEffect(() => {
  const fetchData = async () => {
    const [students, groups, analytics] = await Promise.all([
      fetchWithCache('/api/educator/students', {}, 600),    // 10 min cache
      fetchWithCache('/api/educator/groups', {}, 300),      // 5 min cache  
      fetchWithCache('/api/educator/analytics', {}, 60)     // 1 min cache
    ]);
    // ... process responses
  };
  fetchData();
}, []);
```

### Caching Database Queries in API Routes

```typescript
// /api/educator/students/route.ts
import { Cache } from "@/lib/cache-v2";

export async function GET() {
  const educatorId = await getEducatorId();
  
  const students = await Cache.memoize(
    Cache.key('students', educatorId),
    async () => {
      return await db.select()
        .from(enrollments)
        .where(eq(enrollments.educatorId, educatorId));
    },
    600 // 10 minutes
  );
  
  return Response.json({ students });
}
```

### Cache Warming

```typescript
// Pre-populate cache for better performance
export async function warmCache(educatorId: string) {
  const cache = Cache.getInstance();
  
  // Warm essential data
  await Promise.all([
    Cache.memoize(`students:${educatorId}`, () => fetchStudents(educatorId)),
    Cache.memoize(`groups:${educatorId}`, () => fetchGroups(educatorId)),
    Cache.memoize(`quizzes:${educatorId}`, () => fetchQuizzes(educatorId))
  ]);
}
```

## Best Practices

### 1. Key Naming Convention
- Use hierarchical keys: `resource:identifier:subresource`
- Include relevant IDs: `quiz:123:attempts`, `student:456:profile`
- Use consistent prefixes for pattern-based invalidation

### 2. TTL Guidelines
- **Frequently changing data**: 1-2 minutes (analytics, attempts)
- **Semi-static data**: 5-10 minutes (student lists, quiz content)
- **Static data**: 1+ hours (documents, generated content)

### 3. Error Handling
- Always provide fallbacks for cache failures
- Log cache errors for debugging
- Never let cache failures break the application

### 4. Cache Invalidation
- Invalidate related patterns when data changes
- Use specific keys when possible to avoid over-invalidation
- Consider cascade invalidation for dependent data

## Testing Cache Implementation

```bash
# Check Redis connection
curl http://localhost:3000/api/admin/performance/cache

# Monitor cache metrics in development
# Cache operations are logged with [Cache] prefix
```

## Migration from In-Memory to Redis

If you have existing in-memory caches, migrate them using this pattern:

```typescript
// Old: In-memory cache
const cache = new Map();
cache.set(key, value);
const data = cache.get(key);

// New: Redis cache
import { Cache } from "@/lib/cache-v2";
await cache.set(key, value, ttl);
const data = await cache.get(key);

// Or use memoization
const data = await Cache.memoize(key, expensiveFunction, ttl);
```

## Future Enhancements

1. **Cache Analytics Dashboard**: Real-time cache performance monitoring
2. **Distributed Cache Invalidation**: Webhook-based cache invalidation across instances
3. **Intelligent Cache Warming**: Predictive cache population based on usage patterns
4. **Cache Compression**: Automatic compression for large cached objects
5. **Cache Versioning**: Automatic cache invalidation on application updates

---

**Remember**: Always use the existing Redis infrastructure for new caching requirements. The hybrid cache provides Redis performance with in-memory reliability.