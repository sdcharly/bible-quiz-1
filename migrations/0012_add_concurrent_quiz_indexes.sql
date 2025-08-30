-- Concurrent Quiz Optimization Indexes
-- These indexes specifically optimize for 100+ concurrent students taking quizzes

-- 1. Real-time quiz attempt tracking
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_start_time ON quiz_attempts(start_time);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_in_progress ON quiz_attempts(status, start_time) 
    WHERE status = 'in_progress';

-- 2. WebSocket connection tracking (if table exists)
CREATE INDEX IF NOT EXISTS idx_websocket_connections_user_id ON websocket_connections(user_id) 
    WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'websocket_connections'
    );

-- 3. Optimize educator real-time monitoring queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_educator_view ON quiz_attempts(quiz_id, status, end_time);

-- 4. Student quiz listing optimization
CREATE INDEX IF NOT EXISTS idx_enrollments_student_view ON enrollments(student_id, status, quiz_id);

-- 5. Concurrent submission handling
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submission ON quiz_attempts(quiz_id, student_id, status, created_at);

-- 6. Analytics performance for real-time dashboards
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_analytics ON quiz_attempts(quiz_id, completed_at) 
    WHERE status = 'completed';

-- 7. Question response tracking
CREATE INDEX IF NOT EXISTS idx_question_responses_attempt_id ON question_responses(attempt_id)
    WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'question_responses'
    );

-- 8. Optimize for bulk student operations
CREATE INDEX IF NOT EXISTS idx_enrollments_bulk_ops ON enrollments(educator_id, created_at);

-- Update table statistics for optimal query planning
ANALYZE quiz_attempts;
ANALYZE enrollments;
ANALYZE questions;