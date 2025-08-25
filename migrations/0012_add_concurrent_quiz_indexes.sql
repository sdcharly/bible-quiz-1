-- Additional performance indexes for 100+ concurrent quiz operations
-- Optimized for classroom scenarios with many students taking quizzes simultaneously

-- CRITICAL: Composite index for concurrent quiz start operations
-- This index dramatically speeds up the enrollment check during quiz start
CREATE INDEX IF NOT EXISTS idx_enrollments_concurrent_start 
ON enrollments(quiz_id, student_id, status)
WHERE status IN ('enrolled', 'in_progress');

-- CRITICAL: Index for finding active quiz attempts quickly
-- Helps prevent duplicate attempts and speeds up resume operations
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_active 
ON quiz_attempts(student_id, quiz_id, status, created_at DESC)
WHERE status = 'in_progress';

-- CRITICAL: Index for quiz time validation
-- Speeds up checking if quiz is within valid time window
CREATE INDEX IF NOT EXISTS idx_quizzes_time_window 
ON quizzes(id, start_time, duration, status)
WHERE status = 'published';

-- Index for concurrent question response inserts
-- Reduces lock contention during quiz submission
CREATE INDEX IF NOT EXISTS idx_question_responses_attempt 
ON question_responses(attempt_id, question_id);

-- Index for quick leaderboard queries
-- Enables fast ranking without full table scans
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_leaderboard 
ON quiz_attempts(quiz_id, score DESC, end_time)
WHERE status = 'completed';

-- Index for educator dashboard performance
-- Speeds up analytics queries for educators
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_educator_analytics 
ON quiz_attempts(quiz_id, created_at DESC)
INCLUDE (status, score, total_questions);

-- Partial index for finding abandoned attempts to clean up
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_cleanup 
ON quiz_attempts(created_at)
WHERE status = 'in_progress' OR status = 'abandoned';

-- Index for session-based quiz operations
-- Helps with session validation during quiz operations
-- Note: We can't use NOW() in partial index, so we index all sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active 
ON "session"("userId", "expiresAt" DESC);

-- Index for enrollment group operations
-- Speeds up bulk enrollment queries
CREATE INDEX IF NOT EXISTS idx_enrollments_group 
ON enrollments(quiz_id, group_enrollment_id)
WHERE group_enrollment_id IS NOT NULL;

-- Composite index for user authentication lookups
-- Reduces query time for login operations during peak load
CREATE INDEX IF NOT EXISTS idx_users_auth 
ON "user"(email, role);

-- Update table statistics for query planner optimization
-- This is crucial after adding new indexes
ANALYZE quiz_attempts;
ANALYZE enrollments;
ANALYZE question_responses;
ANALYZE quizzes;
ANALYZE "session";

-- Display index usage statistics (for monitoring)
-- Note: This is informational only and won't fail if permissions are insufficient
DO $$
BEGIN
    RAISE NOTICE 'New concurrent quiz indexes created successfully';
    RAISE NOTICE 'Run VACUUM ANALYZE on production after applying these indexes';
END $$;