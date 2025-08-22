# Redis Cache Configuration Guide

## Overview
The application supports Redis caching for improved performance. When Redis is not available, it automatically falls back to in-memory caching.

## Benefits of Redis Cache
- **Improved Performance**: 10-50x faster data retrieval for frequently accessed data
- **Reduced Database Load**: Fewer database queries mean better scalability
- **Persistent Cache**: Cache survives application restarts
- **Distributed Caching**: Share cache across multiple app instances
- **Better User Experience**: Faster page loads and API responses

## Configuration

### 1. Environment Variables
Add one of the following Redis URLs to your `.env` file:

```env
# Standard Redis URL (Redis Cloud, AWS ElastiCache, etc.)
REDIS_URL=redis://username:password@host:port

# OR Upstash Redis (Recommended for Vercel)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OR Vercel KV (Built on Upstash)
KV_URL=redis://default:token@host:port
KV_REST_API_TOKEN=your-token
```

### 2. Redis Providers

#### Option A: Upstash Redis (Recommended for Vercel)
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Choose your region (select closest to your app)
4. Copy the REST URL and token
5. Add to your environment variables

**Pricing**: Free tier includes 10,000 commands/day

#### Option B: Redis Cloud
1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create a new database
3. Copy the connection string
4. Add as `REDIS_URL` in environment

**Pricing**: Free tier includes 30MB storage

#### Option C: Vercel KV
1. In Vercel Dashboard, go to Storage
2. Create a KV Store
3. Connect to your project
4. Environment variables are added automatically

**Pricing**: Free tier includes 3000 requests/day

#### Option D: Self-Hosted Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Set in .env
REDIS_URL=redis://localhost:6379
```

## Cache Configuration

### TTL Settings (Time To Live)
The cache uses intelligent TTL based on data type:

```typescript
cacheSettings = {
  quizData: 300,        // 5 minutes
  studentList: 600,     // 10 minutes
  analyticsData: 60,    // 1 minute
  questionBank: 3600,   // 1 hour
  userSession: 1800,    // 30 minutes
  documentData: 7200,   // 2 hours
  educatorProfile: 900, // 15 minutes
  quizAttempts: 120,    // 2 minutes
  leaderboard: 300,     // 5 minutes
}
```

## Monitoring

### Performance Dashboard
1. Navigate to **Admin Dashboard** → **Performance Dashboard**
2. View the **Cache Performance** section
3. Monitor:
   - Connection status (Redis/In-Memory)
   - Hit rate (should be >80%)
   - Total operations
   - Cache entries
   - Latency metrics

### Cache Management
From the Performance Dashboard, you can:
- **Test Cache**: Run performance tests
- **Flush Cache**: Clear all cached data
- **View Metrics**: Real-time cache statistics

## Implementation Details

### Hybrid Cache Architecture
```
┌─────────────┐
│   Request   │
└──────┬──────┘
       ▼
┌─────────────┐
│ Cache Check │
└──────┬──────┘
       ▼
   ┌───────┐     Hit      ┌─────────┐
   │ Redis │─────────────▶│ Return  │
   └───┬───┘              └─────────┘
       │ Miss/Error
       ▼
   ┌───────────┐   Hit    ┌─────────┐
   │ In-Memory │─────────▶│ Return  │
   └─────┬─────┘          └─────────┘
         │ Miss
         ▼
   ┌──────────┐
   │ Database │
   └──────────┘
```

### Key Features
1. **Automatic Fallback**: If Redis fails, falls back to in-memory cache
2. **Dual Writing**: Writes to both Redis and memory for redundancy
3. **Smart Invalidation**: Pattern-based cache clearing
4. **Performance Monitoring**: Track hit rates and latency
5. **Graceful Degradation**: App works without Redis

## Usage in Code

### Basic Cache Operations
```typescript
import { Cache } from '@/lib/cache-v2';

// Get from cache
const data = await Cache.getInstance().get('key');

// Set in cache with TTL
await Cache.getInstance().set('key', data, 300); // 5 minutes

// Delete from cache
await Cache.getInstance().del('key');

// Clear pattern
await Cache.invalidate('quiz:*');
```

### Memoization Helper
```typescript
// Automatically cache function results
const quizData = await Cache.memoize(
  `quiz:${quizId}`,
  async () => await fetchQuizFromDB(quizId),
  300 // TTL in seconds
);
```

## Troubleshooting

### Redis Not Connecting
1. Check environment variables are set correctly
2. Verify Redis URL is accessible
3. Check firewall/security group settings
4. View logs in Performance Dashboard

### High Cache Misses
1. Review TTL settings - may be too short
2. Check cache key patterns
3. Ensure cache is being populated correctly
4. Monitor in Performance Dashboard

### Memory Issues
1. Implement cache eviction policies
2. Reduce TTL for large objects
3. Use pattern-based clearing regularly
4. Monitor cache size in dashboard

## Best Practices

1. **Cache Appropriate Data**
   - Static or semi-static content
   - Expensive computations
   - Frequently accessed data

2. **Don't Cache**
   - User-specific sensitive data
   - Real-time data that changes constantly
   - Large binary files

3. **Cache Key Naming**
   - Use consistent patterns: `entity:id:attribute`
   - Include version in keys when needed
   - Make keys descriptive but concise

4. **Monitor Performance**
   - Aim for >80% cache hit rate
   - Watch for slow operations (>100ms)
   - Regular cache health checks

## Production Checklist

- [ ] Redis URL configured in environment
- [ ] Connection tested from Performance Dashboard
- [ ] Cache metrics monitored
- [ ] TTL values optimized for your use case
- [ ] Fallback to in-memory cache tested
- [ ] Cache invalidation strategy defined
- [ ] Monitoring alerts set up (optional)

## Support

For issues or questions:
1. Check Performance Dashboard for diagnostics
2. Review application logs
3. Test cache operations from dashboard
4. Contact support with cache metrics screenshot