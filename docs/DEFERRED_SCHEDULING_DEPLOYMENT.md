# Deferred Quiz Scheduling - Deployment Guide
**Phase 8: Documentation & Deployment**

## 📚 Feature Overview

The Deferred Quiz Scheduling feature allows educators to create quizzes without immediately setting a start time. The time can be set later during the publish phase, providing more flexibility in quiz preparation.

## 🏗️ Architecture

### Database Changes
- **New Columns in `quizzes` table**:
  - `time_configuration` (JSONB) - Stores scheduling metadata
  - `scheduling_status` (TEXT) - Values: 'legacy', 'deferred', 'scheduled'
  - `scheduled_by` (TEXT) - Educator ID who set the time
  - `scheduled_at` (TIMESTAMP) - When the time was set

### API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/educator/quiz/create-deferred` | POST | Create quiz with optional time |
| `/api/educator/quiz/[id]/schedule` | POST | Set/update quiz time |
| `/api/educator/quiz/[id]/schedule` | GET | Get scheduling info |
| `/api/student/quizzes/enhanced` | GET | Get quizzes with availability |

### UI Components
- `SchedulingModeSelector` - Choose between immediate/deferred
- `SchedulingModal` - Set quiz time interface
- `PublishButton` - Smart publish with scheduling
- `QuizCard` - Student quiz display
- `QuizStatusBadge` - Visual status indicator

## 🚀 Deployment Steps

### Step 1: Environment Variables
```bash
# Feature flags (add to .env)
NEXT_PUBLIC_ENABLE_DEFERRED_TIME=false  # Start with OFF
NEXT_PUBLIC_DEFERRED_TIME_PERCENTAGE=0  # Gradual rollout percentage
NEXT_PUBLIC_DEFERRED_TIME_EDUCATORS=""  # Comma-separated educator IDs for testing
```

### Step 2: Database Migration
```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_before_deferred_$(date +%Y%m%d).sql

# 2. Run migration
npm run db:migrate

# 3. Verify migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name IN ('time_configuration', 'scheduling_status');"

# 4. Run legacy quiz migration
npx tsx scripts/migrate-legacy-quizzes.ts
```

### Step 3: Deploy Application
```bash
# 1. Build and test
npm run build
npm test

# 2. Deploy to staging
git push staging main

# 3. Test on staging
# - Create quiz with deferred scheduling
# - Verify legacy quizzes work
# - Test student enrollment

# 4. Deploy to production
git push production main
```

### Step 4: Feature Flag Rollout
```javascript
// Progressive rollout strategy
// Week 1: Internal testing
NEXT_PUBLIC_ENABLE_DEFERRED_TIME=true
NEXT_PUBLIC_DEFERRED_TIME_EDUCATORS="educator1,educator2"

// Week 2: 10% rollout
NEXT_PUBLIC_DEFERRED_TIME_PERCENTAGE=10

// Week 3: 50% rollout
NEXT_PUBLIC_DEFERRED_TIME_PERCENTAGE=50

// Week 4: Full rollout
NEXT_PUBLIC_DEFERRED_TIME_PERCENTAGE=100
```

## 🔍 Monitoring

### Key Metrics to Track
```sql
-- Quiz creation by scheduling type
SELECT 
    DATE(created_at) as date,
    scheduling_status,
    COUNT(*) as quiz_count
FROM quizzes
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), scheduling_status
ORDER BY date DESC;

-- Unscheduled published quizzes
SELECT COUNT(*) 
FROM quizzes 
WHERE status = 'published' 
AND scheduling_status = 'deferred' 
AND start_time IS NULL;

-- Average time to schedule (deferred quizzes)
SELECT AVG(
    EXTRACT(EPOCH FROM (scheduled_at - created_at))/3600
) as avg_hours_to_schedule
FROM quizzes
WHERE scheduling_status = 'deferred'
AND scheduled_at IS NOT NULL;
```

### Error Monitoring
Monitor for:
- Increased 404s on quiz start (unscheduled quizzes)
- Validation errors on publish
- Null pointer exceptions on `quiz.startTime`

## 🔧 Rollback Plan

If issues arise:

### Quick Disable (Feature Flag)
```bash
# Disable feature immediately
NEXT_PUBLIC_ENABLE_DEFERRED_TIME=false
# Redeploy or use runtime config
```

### Database Rollback
```sql
-- Rollback script (if needed)
-- Note: This doesn't remove columns, just resets data
UPDATE quizzes 
SET scheduling_status = 'legacy'
WHERE scheduling_status IN ('deferred', 'scheduled');

-- Force all quizzes to have start time
UPDATE quizzes
SET start_time = created_at + INTERVAL '7 days'
WHERE start_time IS NULL AND status = 'draft';
```

## 📖 User Documentation

### For Educators
**Creating a Quiz with Deferred Scheduling:**
1. Click "Create Quiz"
2. Select "Set Time Later" option
3. Configure quiz questions and settings
4. When ready, click "Schedule & Publish"
5. Set the date/time in the modal
6. Quiz goes live!

**Rescheduling a Published Quiz:**
1. Go to quiz details
2. Click "Reschedule" button
3. Update time in modal
4. Students are notified (if implemented)

### For Students
**Enrolling in Unscheduled Quizzes:**
- You can enroll even if time isn't set
- You'll see "Time to be announced"
- You'll be notified when time is set
- Quiz appears in your enrolled list

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Cannot publish quiz" error
**Solution**: Ensure time is set for deferred quizzes before publishing

**Issue**: Students can't see quiz time
**Solution**: Check if quiz has `scheduling_status = 'deferred'` and `start_time IS NULL`

**Issue**: Legacy quizzes show wrong status
**Solution**: Run migration script: `npx tsx scripts/migrate-legacy-quizzes.ts`

## 📊 Success Metrics

Track after deployment:
- % of quizzes using deferred scheduling
- Average time between creation and scheduling
- Student enrollment rate for unscheduled vs scheduled
- Support tickets related to scheduling

## 🔐 Security Considerations

- Only quiz creator can set/change time
- Time validation prevents past dates
- Students cannot access quiz before scheduled time
- Audit trail via `scheduled_by` and `scheduled_at`

## 📝 API Documentation

### Create Quiz with Deferred Scheduling
```typescript
POST /api/educator/quiz/create-deferred
{
  title: string,
  description?: string,
  documentIds: string[],
  questionCount: number,
  duration: number,
  // Optional for deferred mode
  startTime?: string,
  timezone?: string,
  useDeferredScheduling: boolean
}
```

### Schedule Quiz Time
```typescript
POST /api/educator/quiz/[id]/schedule
{
  startTime: string,  // ISO 8601
  timezone: string,   // IANA timezone
  duration: number,   // minutes
  notifyStudents?: boolean
}
```

## ✅ Deployment Checklist

- [ ] Database backed up
- [ ] Migration script tested on staging
- [ ] Feature flags configured
- [ ] Monitoring dashboards updated
- [ ] User documentation published
- [ ] Support team briefed
- [ ] Rollback plan tested
- [ ] Load testing completed
- [ ] Security review passed
- [ ] Analytics tracking verified

---

**Status**: Ready for Deployment
**Version**: 1.0.0
**Last Updated**: 2024
**Owner**: Quiz Team