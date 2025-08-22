# Performance Optimization Guide

## Overview
This guide documents the performance optimizations implemented for handling 3 educators and 100+ concurrent students.

## 🚀 Optimizations Implemented

### 1. Database Connection Pooling
**Location**: `/src/lib/db.ts`

- **Max Connections**: 25 (optimal for 100 concurrent users)
- **Min Connections**: 5 (maintains responsive baseline)
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds
- **Prepared Statements**: Enabled for better performance

### 2. Database Indexes
**Location**: `/migrations/0011_add_performance_indexes.sql`

Applied indexes for:
- Quiz attempts by student (most frequent query)
- Questions by quiz
- Educator-student enrollments
- Activity logs by timestamp
- User role lookups
- Session management

**To apply indexes**:
```bash
node scripts/apply-performance-indexes.js
```

### 3. Rate Limiting
**Location**: `/src/lib/rate-limiter.ts`

Configured limits:
- Quiz Submissions: 10/minute
- Question Generation: 5/minute
- Analytics Refresh: 30/minute
- Document Upload: 5/5 minutes
- Authentication: 5/5 minutes

Applied to critical endpoints:
- `/api/student/quiz/[id]/submit`
- `/api/educator/quiz/[id]/question/[questionId]/replace-async`

### 4. WebSocket Connection Management
**Location**: `/src/lib/websocket.ts`

- **Max Connections per User**: 2
- **Heartbeat Interval**: 30 seconds
- **Reconnection**: Exponential backoff (1-30 seconds)
- **Connection Timeout**: 10 seconds
- Real-time metrics tracking

### 5. Cache Configuration
**Location**: `/src/lib/cache.ts`

Optimized TTLs:
- Quiz Data: 5 minutes
- Student Lists: 10 minutes
- Analytics: 1 minute (real-time)
- Question Bank: 1 hour
- Documents: 2 hours
- User Sessions: 30 minutes

Features:
- Redis with in-memory fallback
- Automatic TTL based on data type
- Performance monitoring for slow operations
- Batch operations support

## 📊 Performance Monitoring

### Monitor Database Performance
```bash
node scripts/monitor-performance.js
```

This script shows:
- Active database connections
- Slow queries
- Index usage statistics
- Table sizes
- Cache performance
- Optimization recommendations

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Database Connections | < 20 | > 20 |
| Query Response Time | < 100ms | > 200ms |
| Cache Hit Rate | > 80% | < 60% |
| WebSocket Connections | < 200 | > 250 |
| Memory Usage | < 80% | > 85% |
| CPU Usage | < 70% | > 80% |

## 🔧 Deployment Configuration

### Environment Variables
```env
# Database
POSTGRES_URL=postgresql://...
POSTGRES_MAX_CONNECTIONS=25
POSTGRES_MIN_CONNECTIONS=5

# Redis Cache (optional)
REDIS_URL=redis://...
REDIS_TOKEN=...

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REDIS=true  # Use Redis for distributed rate limiting

# WebSocket
WS_MAX_CONNECTIONS=250
WS_HEARTBEAT_INTERVAL=30000
```

### Recommended Server Specs

#### For 100 Concurrent Users:
- **CPU**: 4-6 vCPUs
- **RAM**: 8-12 GB
- **Database**: 8 GB RAM, 4 vCPUs
- **Storage**: 100 GB SSD

#### Hosting Options:

**Option 1: Vercel + Neon (Recommended)**
- Vercel Pro: $20/month
- Neon Database: $20-40/month
- Upstash Redis: $10/month
- **Total**: ~$50-70/month

**Option 2: Single VPS**
- DigitalOcean/Linode: $96/month (8 vCPU, 16 GB RAM)
- Run app + database on same server
- Use PM2 for process management

**Option 3: AWS/GCP**
- EC2/Compute: t3.large ~$60/month
- RDS PostgreSQL: db.t3.small ~$25/month
- ElastiCache: t3.micro ~$15/month
- **Total**: ~$100/month

## 🚨 Load Testing

### Install k6
```bash
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu
```

### Create Load Test
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function() {
  let response = http.get('https://your-app-url.com');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Run Load Test
```bash
k6 run load-test.js
```

## 🔄 Scaling Strategy

### When to Scale Vertically (add resources):
- CPU consistently > 70%
- Memory usage > 85%
- Database connections > 80% of pool

### When to Scale Horizontally (add servers):
- > 500 concurrent students
- > 10 educators
- Response times > 500ms consistently

### Database Scaling:
1. **Add Read Replicas** when analytics queries slow main operations
2. **Implement Connection Pooler** (PgBouncer) for > 100 connections
3. **Partition Tables** when quiz_attempts > 1 million rows

## 🛠️ Maintenance Tasks

### Daily:
- Monitor error logs
- Check slow query log
- Review rate limit violations

### Weekly:
- Run `VACUUM ANALYZE` on database
- Review cache hit rates
- Check WebSocket connection patterns

### Monthly:
- Review and optimize slow queries
- Update database statistics
- Audit rate limit configurations
- Performance load testing

## 📈 Expected Performance

With these optimizations, the system can handle:

- **100 concurrent quiz attempts** with < 200ms response time
- **Real-time updates** via WebSocket with < 100ms latency
- **Analytics queries** completing in < 1 second
- **Question generation** without blocking other operations
- **5x traffic spikes** without degradation

## 🚦 Quick Commands

```bash
# Apply database indexes
node scripts/apply-performance-indexes.js

# Monitor performance
node scripts/monitor-performance.js

# Check build
npm run build

# Run migrations
npm run db:migrate

# Start with PM2 (production)
pm2 start npm --name "biblequiz" -- start
pm2 save
pm2 startup
```

## 📞 Support

For performance issues:
1. Run `node scripts/monitor-performance.js`
2. Check slow query logs
3. Review rate limit logs
4. Monitor WebSocket connections
5. Check cache hit rates

## 🎯 Performance Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page Load | < 1s | 2s |
| Quiz Submit | < 200ms | 500ms |
| Analytics Load | < 1s | 2s |
| Question Generation | < 15s | 30s |
| WebSocket Connect | < 100ms | 500ms |
| Database Query | < 50ms | 100ms |
| Cache Lookup | < 10ms | 50ms |