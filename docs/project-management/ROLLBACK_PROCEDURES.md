# 🚨 Rollback Procedures - Quiz Time Deferral Project

**Critical Document**: Keep accessible at all times during implementation  
**Last Updated**: 2024  
**Phase**: 0.3 - Safety Implementation

## 🔴 Emergency Rollback Triggers

Execute rollback immediately if ANY of these occur:
- [ ] Quiz creation success rate drops below 90%
- [ ] Student enrollment fails for >5% of attempts  
- [ ] Email notifications stop working
- [ ] Database corruption detected
- [ ] >10 educator complaints within 1 hour
- [ ] Performance degradation >30%

## 📋 Rollback Decision Matrix

| Issue Severity | User Impact | Action | Rollback Time |
|---------------|-------------|---------|---------------|
| CRITICAL | All users affected | Immediate rollback | < 5 minutes |
| HIGH | >50% users affected | Rollback after 1 retry | < 15 minutes |
| MEDIUM | 10-50% users affected | Feature flag disable | < 30 minutes |
| LOW | <10% users affected | Monitor & patch | No rollback |

## 🔧 Phase-Specific Rollback Procedures

### **Phase 1: Database Rollback**

```bash
# 1. Stop application servers
npm run stop-production

# 2. Restore database backup
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  backups/quiz_backup_[TIMESTAMP].dump

# 3. If new columns were added, remove them
psql $DATABASE_URL << EOF
ALTER TABLE quizzes 
  DROP COLUMN IF EXISTS time_configuration,
  DROP COLUMN IF EXISTS scheduling_status,
  DROP COLUMN IF EXISTS scheduled_by,
  DROP COLUMN IF EXISTS scheduled_at;
  
DROP TYPE IF EXISTS scheduling_status_enum;
EOF

# 4. Restart application
npm run start-production

# 5. Verify
npm run health-check
```

### **Phase 2: API Rollback**

```bash
# 1. Disable feature flag immediately
export NEXT_PUBLIC_ENABLE_DEFERRED_TIME=false

# 2. Restart API servers
pm2 restart api-server

# 3. If new endpoints were added, block them at nginx
sudo nano /etc/nginx/sites-available/biblequiz
# Add:
location ~ ^/api/educator/quiz/create-deferred {
    return 503;
}
location ~ ^/api/educator/quiz/.*/configure-time {
    return 503;
}

# 4. Reload nginx
sudo nginx -s reload

# 5. Monitor logs
tail -f logs/api-errors.log
```

### **Phase 3: Frontend Rollback**

```bash
# 1. Quick rollback via feature flag
echo "NEXT_PUBLIC_ENABLE_DEFERRED_TIME=false" >> .env.production
npm run build
npm run deploy

# 2. If feature flag doesn't work, git revert
git log --oneline -10  # Find the commit before changes
git revert HEAD~[N]    # N = number of commits to revert
npm run build
npm run deploy

# 3. Clear CDN cache
npm run clear-cdn-cache

# 4. Force browser refresh for users
# Add version bump to force cache invalidation
echo "APP_VERSION=$(date +%s)" >> .env.production
npm run deploy
```

### **Phase 4: Email System Rollback**

```javascript
// In email-service.ts, add fallback
if (!quiz.startTime && !featureFlags.isDeferredTimeEnabled) {
  // Use creation time as fallback
  quiz.startTime = quiz.createdAt;
}
```

## 🎯 Quick Rollback Commands

### **1-Minute Rollback (Feature Flag)**
```bash
# Fastest option - disables feature for all users
curl -X POST https://biblequiz.textr.in/api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"flag": "ENABLE_DEFERRED_TIME", "enabled": false}'
```

### **5-Minute Rollback (Code Revert)**
```bash
# Revert last deployment
./scripts/rollback-deployment.sh --last
```

### **15-Minute Rollback (Database Restore)**
```bash
# Full restoration including database
./scripts/emergency-rollback.sh --full --backup-id [TIMESTAMP]
```

## 📊 Rollback Verification Checklist

After rollback, verify ALL of these:

### **Immediate Checks (< 2 minutes)**
- [ ] Application is accessible
- [ ] Educators can log in
- [ ] Students can view quizzes
- [ ] Database connections active

### **Functional Checks (< 5 minutes)**
- [ ] Quiz creation works (old flow)
- [ ] Time is required in step 1
- [ ] Publishing works normally
- [ ] Enrollment sends emails with time
- [ ] Students can start quizzes

### **Data Integrity Checks (< 10 minutes)**
- [ ] No quizzes lost
- [ ] No enrollments lost
- [ ] All times preserved
- [ ] User sessions intact

## 🔄 Rollback Communication Template

### **Internal Team Alert**
```
SUBJECT: [URGENT] Quiz Time Deferral Rollback Initiated

Issue: [Brief description]
Impact: [Number of users affected]
Action: Rollback initiated at [TIME]
ETA: System normal in [X] minutes
Lead: [Your name]

Updates every 15 minutes in #emergency-response
```

### **Educator Notification**
```
SUBJECT: Temporary System Maintenance

Dear Educator,

We're performing quick maintenance to ensure the best experience.
Quiz creation will be unavailable for approximately 10 minutes.

Your existing quizzes and student data are safe.

We'll notify you once complete.

Thank you for your patience.
```

## 🛟 Fallback Strategies

If rollback fails, use these fallbacks:

### **Option 1: Parallel System**
```bash
# Deploy old version to backup server
ssh backup-server
git checkout stable-before-time-deferral
npm install
npm run build
npm run start --port 3001

# Update load balancer to route to backup
```

### **Option 2: Manual Override**
```javascript
// Add to quiz creation API
if (process.env.FORCE_OLD_FLOW === 'true') {
  return oldQuizCreationHandler(req, res);
}
```

### **Option 3: Database Triggers**
```sql
-- Auto-populate startTime if null
CREATE OR REPLACE FUNCTION ensure_start_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_time IS NULL THEN
    NEW.start_time = NEW.created_at + INTERVAL '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_start_time_fallback
BEFORE INSERT OR UPDATE ON quizzes
FOR EACH ROW EXECUTE FUNCTION ensure_start_time();
```

## 📱 Emergency Contacts

| Role | Name | Contact | Escalation Time |
|------|------|---------|-----------------|
| Project Lead | [Name] | [Phone/Email] | Immediate |
| Database Admin | [Name] | [Phone/Email] | If DB issues |
| DevOps Lead | [Name] | [Phone/Email] | If deployment issues |
| Product Owner | [Name] | [Phone/Email] | If user impact >100 |

## 📝 Post-Rollback Actions

After successful rollback:

1. **Document Issue**
   - What failed?
   - Why did it fail?
   - What was the impact?

2. **Update Tests**
   - Add test case for the failure
   - Verify in staging

3. **Revise Plan**
   - Update implementation plan
   - Add additional safety checks

4. **Schedule Retry**
   - Fix identified issues
   - Plan new deployment window
   - Notify stakeholders

## 🔐 Rollback Authorization

Rollback can be initiated by:
- [ ] Project Lead (any phase)
- [ ] DevOps Team (infrastructure issues)
- [ ] Product Owner (user impact)
- [ ] On-call Engineer (after hours)

## ⚡ Quick Reference Card

```bash
# Kill switch (immediate)
export NEXT_PUBLIC_ENABLE_DEFERRED_TIME=false

# Rollback deployment
git revert HEAD && npm run deploy

# Restore database
pg_restore backups/latest.dump

# Check system health
curl https://biblequiz.textr.in/api/health

# View error logs
tail -f logs/error.log

# Emergency contact
Call: [EMERGENCY_PHONE]
```

---

**Remember**: It's better to rollback quickly and investigate than to leave users with a broken system. When in doubt, rollback!