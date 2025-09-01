# Redis Cache Configuration

## Overview
The application now uses a distributed cache abstraction that automatically switches between Redis (production) and in-memory cache (development) based on the environment.

## Architecture

### Cache Abstraction (`/src/lib/distributed-cache.ts`)
- **Production**: Uses Redis for distributed caching across multiple instances
- **Development**: Falls back to in-memory Map for simplicity
- **Automatic failover**: If Redis is unavailable, operations continue without cache

### Key Features
1. **JSON Serialization**: Automatic JSON serialization/deserialization
2. **TTL Support**: Built-in time-to-live with millisecond precision
3. **Connection Resilience**: Automatic reconnection and retry logic
4. **Graceful Degradation**: Application continues working if cache fails
5. **Namespace Support**: Use prefixes to organize cache keys

## Configuration

### Environment Variables

#### Basic Configuration (Redis URL)
```bash
# Option 1: Full Redis URL (recommended)
REDIS_URL=redis://username:password@host:6379/0

# Option 2: Redis URL with TLS
REDIS_URL=rediss://username:password@host:6380/0
```

#### Alternative Configuration (Separate Variables)
```bash
# Option 2: Separate host/port/password
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_TLS=false  # Set to 'true' for TLS connections
```

### Popular Redis Providers

#### 1. Redis Cloud (Redis Labs)
```bash
REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
```

#### 2. Upstash Redis
```bash
REDIS_URL=redis://default:password@us1-example-12345.upstash.io:32768
```

#### 3. AWS ElastiCache
```bash
REDIS_HOST=my-cluster.abc123.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
# ElastiCache typically doesn't require password in VPC
```

#### 4. Heroku Redis
```bash
# Heroku automatically sets REDIS_URL
REDIS_URL=redis://h:password@ec2-12-34-56-78.compute-1.amazonaws.com:12345
```

#### 5. Railway Redis
```bash
REDIS_URL=redis://default:password@containers-us-west-123.railway.app:1234
```

## Usage Examples

### Basic Usage
```typescript
import { cache } from '@/lib/distributed-cache';

// Set a value with 5-minute TTL
await cache.set('user:123', userData, 5 * 60 * 1000);

// Get a value
const userData = await cache.get('user:123');

// Delete a value
await cache.del('user:123');
```

### Advanced Usage
```typescript
// Get or set pattern (cache-aside)
const analytics = await cache.getOrSet(
  'analytics:educator:123',
  async () => {
    // Expensive operation to fetch analytics
    return await fetchAnalyticsFromDB();
  },
  5 * 60 * 1000 // 5 minutes TTL
);
```

### Namespacing Keys
```typescript
// Use consistent prefixes for organization
const CACHE_PREFIXES = {
  ANALYTICS: 'analytics:',
  QUIZ: 'quiz:',
  USER: 'user:',
  SESSION: 'session:',
  DOCUMENT: 'document:'
};

// Example usage
const cacheKey = `${CACHE_PREFIXES.ANALYTICS}educator:${educatorId}:${timeRange}`;
```

## Implementation in Analytics Route

The educator analytics route (`/api/educator/analytics`) now uses the distributed cache:

```typescript
// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'analytics:educator:';

// Check cache
const cacheKey = `${CACHE_PREFIX}${educatorId}:${timeRange}`;
const cached = await cache.get(cacheKey);
if (cached) {
  return NextResponse.json(cached);
}

// ... fetch data ...

// Store in cache
await cache.set(cacheKey, responseData, CACHE_TTL);
```

## Monitoring

### Redis Connection Health
```typescript
// The cache logs connection events
// Monitor these in your logging system:
- "Redis client connected"
- "Redis client error: [error]"
- "Redis client connection closed"
```

### Cache Hit/Miss Ratio
```typescript
// Add custom metrics in your routes
logger.debug('Returning cached analytics data'); // Cache hit
logger.debug('Fetching fresh analytics data');   // Cache miss
```

## Performance Benefits

### Before (In-Memory Map)
- ❌ Not shared across instances
- ❌ Lost on restart
- ❌ Can grow unbounded
- ❌ Manual cleanup required
- ❌ No horizontal scaling

### After (Redis)
- ✅ Shared across all instances
- ✅ Persistent across restarts
- ✅ Automatic expiration (TTL)
- ✅ No manual cleanup needed
- ✅ Supports horizontal scaling
- ✅ Reduces database load

## Troubleshooting

### Redis Connection Issues

1. **Connection Refused**
```bash
# Check if Redis is running
redis-cli ping

# Check connection string
echo $REDIS_URL

# Test connection
node -e "
const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL);
client.ping().then(() => console.log('Connected!')).catch(console.error);
"
```

2. **Authentication Failed**
- Verify password in REDIS_URL
- Check if Redis requires AUTH
- Ensure URL encoding for special characters

3. **TLS/SSL Issues**
- Use `rediss://` protocol for TLS
- Set `REDIS_TLS=true` for separate config
- Check certificate validity

### Fallback Behavior

If Redis is unavailable:
1. Application logs warning but continues
2. Falls back to no caching (not in-memory)
3. All operations proceed without cache
4. No user-facing errors

### Memory Issues

Monitor Redis memory usage:
```bash
redis-cli INFO memory

# Set max memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Testing

### Local Development
```bash
# Start Redis locally
docker run -d -p 6379:6379 redis:alpine

# Set environment variable
export REDIS_URL=redis://localhost:6379

# Run the application
npm run dev
```

### Testing Cache Functionality

#### Option 1: Using TypeScript with tsx/ts-node
```typescript
// test-cache.ts
import { cache } from './src/lib/distributed-cache';

await cache.set('test', { value: 'hello' }, 5000);
const result = await cache.get('test');
console.log('Cache test:', result);
await cache.del('test');
```

Run with: `npx tsx test-cache.ts`

#### Option 2: Using Node.js with Dynamic Import
```bash
# Test script with dynamic import for ESM compatibility
node --input-type=module -e "
const { cache } = await import('./src/lib/distributed-cache.js');
await cache.set('test', { value: 'hello' }, 5000);
const result = await cache.get('test');
console.log('Cache test:', result);
await cache.del('test');
"
```

## Migration Checklist

- [x] Install ioredis dependency
- [x] Create distributed cache abstraction
- [x] Update analytics route to use new cache
- [x] Add Redis connection configuration
- [ ] Deploy Redis instance (production)
- [ ] Set REDIS_URL in production environment
- [ ] Monitor cache hit rates
- [ ] Tune TTL values based on usage patterns

## Best Practices

1. **Use Appropriate TTLs**
   - Short for frequently changing data (1-5 minutes)
   - Long for static data (1-24 hours)
   - Consider user experience vs. data freshness

2. **Key Naming Conventions**
   - Use colons for namespacing: `type:id:subtype`
   - Be consistent across the application
   - Include version in key if data structure changes

3. **Error Handling**
   - Always handle cache failures gracefully
   - Log errors for monitoring
   - Continue operation without cache if needed

4. **Security**
   - Use strong passwords for Redis
   - Enable TLS in production
   - Restrict network access to Redis
   - Don't cache sensitive unencrypted data

5. **Monitoring**
   - Track cache hit/miss ratios
   - Monitor Redis memory usage
   - Set up alerts for connection issues
   - Review slow queries with SLOWLOG