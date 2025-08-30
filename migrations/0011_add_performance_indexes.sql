-- Performance Optimization Indexes for Bible Quiz Application
-- These indexes optimize the most frequent queries in the application

-- 1. Quiz Attempts - Most frequently queried table
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_composite ON quiz_attempts(student_id, quiz_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_end_time ON quiz_attempts(end_time);

-- 2. Questions - Frequently joined with quizzes
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(order_num);

-- 3. Enrollments - Critical for student/educator queries
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_educator_id ON enrollments(educator_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_quiz_id ON enrollments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_composite ON enrollments(student_id, educator_id, status);

-- 4. Quizzes - Frequently filtered by educator and status
CREATE INDEX IF NOT EXISTS idx_quizzes_educator_id ON quizzes(educator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_start_time ON quizzes(start_time);
CREATE INDEX IF NOT EXISTS idx_quizzes_end_time ON quizzes(end_time);

-- 5. User table - Role lookups
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);

-- 6. Session management
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at);

-- 7. Documents - Educator document queries
CREATE INDEX IF NOT EXISTS idx_documents_educator_id ON documents(educator_id);
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);

-- 8. Activity logs if exists
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp) WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'activity'
);

-- Update statistics for query planner
ANALYZE quiz_attempts;
ANALYZE questions;
ANALYZE enrollments;
ANALYZE quizzes;
ANALYZE "user";
ANALYZE session;
ANALYZE documents;