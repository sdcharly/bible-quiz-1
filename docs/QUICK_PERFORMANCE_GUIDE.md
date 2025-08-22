# Quick Performance Guide

## 🚀 How to Use Performance Scripts

### 1. Monitor Current Performance
```bash
npm run perf:monitor
```

This shows:
- Active database connections
- Table sizes
- Current indexes
- Cache configuration
- Optimization recommendations

### 2. Apply Performance Indexes (One-time)
```bash
npm run perf:indexes
```

**Note**: This requires direct database access. If it doesn't work, you can manually apply the indexes from:
`/migrations/0011_add_performance_indexes.sql`

### 3. Alternative: Apply Indexes via Supabase/Neon Dashboard

If you're using Supabase or Neon, go to your database dashboard and run this SQL:

```sql
-- Create essential performance indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student 
ON quiz_attempts(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz 
ON quiz_attempts(quiz_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_quiz 
ON questions(quiz_id, order_index);

CREATE INDEX IF NOT EXISTS idx_enrollments_lookup 
ON educator_students(educator_id, student_id);

-- Analyze tables for better query planning
ANALYZE quiz_attempts;
ANALYZE questions;
ANALYZE quizzes;
ANALYZE educator_students;
```

## 📊 What the Numbers Mean

### Good Performance Indicators:
- **Active Connections**: < 20 (for 100 users)
- **Table Sizes**: < 1 GB each
- **Indexes**: Should see 10+ indexes after running perf:indexes
- **Cache**: Redis configured (shows "✅ Redis cache configured")

### Warning Signs:
- Active connections > 20
- Table sizes > 1 GB (consider archiving old data)
- No indexes found (run perf:indexes)
- Only in-memory cache (consider adding Redis)

## 🔧 Quick Optimizations

### If Performance is Slow:

1. **Check Database Connections**:
   ```bash
   npm run perf:monitor
   ```
   If connections > 20, restart your app

2. **Apply Indexes** (if not done):
   ```bash
   npm run perf:indexes
   ```

3. **Clear Old Data**:
   - Archive quiz attempts older than 6 months
   - Clean up old session data

4. **Add Redis Cache** (for production):
   - Sign up for Upstash Redis (free tier)
   - Add to .env:
     ```
     REDIS_URL=your_redis_url
     REDIS_TOKEN=your_redis_token
     ```

## 🚨 Emergency Commands

If the app is slow or unresponsive:

1. **Check what's happening**:
   ```bash
   npm run perf:monitor
   ```

2. **Restart the app**:
   ```bash
   # Local development
   npm run dev

   # Production (Vercel)
   vercel --prod

   # Production (VPS with PM2)
   pm2 restart biblequiz
   ```

3. **Clear database connections** (via database dashboard):
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'your_database_name' 
   AND pid <> pg_backend_pid();
   ```

## 📈 Expected Performance

With optimizations applied:
- **Page Load**: < 1 second
- **Quiz Submit**: < 200ms
- **Analytics Load**: < 1 second
- **Question Generation**: < 15 seconds
- **Concurrent Users**: 100+ without issues

## 🆘 Need Help?

1. Run monitoring: `npm run perf:monitor`
2. Check the logs for errors
3. Ensure database indexes are applied
4. Consider upgrading server resources if consistently hitting limits

## 🎯 Quick Checklist

- [ ] Database indexes applied (`npm run perf:indexes`)
- [ ] Connection pooling configured (automatic)
- [ ] Rate limiting active (automatic)
- [ ] WebSocket working (check question replacement)
- [ ] Cache configured (Redis for production)
- [ ] Monitoring set up (`npm run perf:monitor`)

That's it! Your app is now optimized for 100+ concurrent users! 🚀