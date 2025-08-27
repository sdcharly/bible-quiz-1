-- Performance optimization indexes for concurrent quiz operations

-- Index for student quiz attempts (most frequent query)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student 
ON quiz_attempts(student_id, created_at DESC);

-- Index for quiz status lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz 
ON quiz_attempts(quiz_id, status);

-- Index for questions retrieval by quiz
CREATE INDEX IF NOT EXISTS idx_questions_quiz 
ON questions(quiz_id, order_index);

-- Index for educator-student enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_lookup 
ON educator_students(educator_id, student_id);

-- Additional performance indexes

-- Index for active quizzes lookup
CREATE INDEX IF NOT EXISTS idx_quizzes_status_educator 
ON quizzes(educator_id, status, created_at DESC);

-- Index for quiz attempts scoring
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_scoring 
ON quiz_attempts(quiz_id, student_id, score DESC);

-- Index for user role lookups
CREATE INDEX IF NOT EXISTS idx_users_role 
ON "user"(role, "createdAt" DESC);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user 
ON "session"("userId", "expiresAt");

-- Index for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp 
ON activity_logs(created_at DESC, entity_type);

-- Index for analytics aggregation
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_analytics 
ON quiz_attempts(student_id, quiz_id, updated_at) 
WHERE status = 'completed';

-- Partial index for pending educator approvals
CREATE INDEX IF NOT EXISTS idx_pending_educators 
ON "user"("createdAt" DESC) 
WHERE role = 'pending_educator';

-- Index for document references in quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_documents 
ON quizzes USING GIN (document_ids);

-- Analyze tables to update statistics for query planner
ANALYZE quiz_attempts;
ANALYZE questions;
ANALYZE quizzes;
ANALYZE educator_students;
ANALYZE "user";