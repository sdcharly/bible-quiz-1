-- =====================================================
-- PHASE 0.1: DATABASE AUDIT QUERIES
-- Quiz Time Deferral Project
-- Date: 2024
-- =====================================================

-- 1. COUNT QUIZZES BY STATUS
-- Understanding the distribution of quiz statuses
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM quizzes
GROUP BY status
ORDER BY count DESC;

-- 2. CHECK FOR NULL START TIMES
-- This should return 0 in current system
SELECT 
    COUNT(*) as quizzes_without_start_time
FROM quizzes
WHERE start_time IS NULL;

-- 3. ANALYZE QUIZ LIFECYCLE
-- Time between creation and publishing
SELECT 
    status,
    COUNT(*) as total_quizzes,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::INTEGER as avg_hours_to_update,
    MIN(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::INTEGER as min_hours,
    MAX(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::INTEGER as max_hours
FROM quizzes
WHERE status = 'published'
GROUP BY status;

-- 4. QUIZZES CREATED BUT NEVER PUBLISHED
-- Potential draft quizzes that got abandoned
SELECT 
    COUNT(*) as draft_quizzes,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400)::INTEGER as avg_days_old
FROM quizzes
WHERE status = 'draft';

-- 5. ENROLLMENT PATTERNS
-- How many students typically get enrolled per quiz
SELECT 
    q.status,
    COUNT(DISTINCT q.id) as quiz_count,
    COUNT(e.id) as total_enrollments,
    ROUND(AVG(enrollment_counts.count), 2) as avg_enrollments_per_quiz
FROM quizzes q
LEFT JOIN (
    SELECT quiz_id, COUNT(*) as count
    FROM enrollments
    GROUP BY quiz_id
) enrollment_counts ON q.id = enrollment_counts.quiz_id
LEFT JOIN enrollments e ON q.id = e.quiz_id
GROUP BY q.status;

-- 6. TIME MODIFICATION PATTERNS
-- Check if start_time typically equals created_at (never modified)
SELECT 
    CASE 
        WHEN ABS(EXTRACT(EPOCH FROM (start_time - created_at))) < 60 THEN 'Same time (< 1 min difference)'
        WHEN ABS(EXTRACT(EPOCH FROM (start_time - created_at))) < 3600 THEN 'Modified within 1 hour'
        WHEN ABS(EXTRACT(EPOCH FROM (start_time - created_at))) < 86400 THEN 'Modified within 1 day'
        ELSE 'Modified after 1+ days'
    END as time_modification_pattern,
    COUNT(*) as count
FROM quizzes
WHERE start_time IS NOT NULL
GROUP BY time_modification_pattern
ORDER BY count DESC;

-- 7. FUTURE vs PAST QUIZZES
-- How many quizzes are scheduled for future
SELECT 
    CASE 
        WHEN start_time > NOW() THEN 'Future'
        WHEN start_time <= NOW() AND start_time > NOW() - INTERVAL '7 days' THEN 'Past Week'
        WHEN start_time <= NOW() - INTERVAL '7 days' AND start_time > NOW() - INTERVAL '30 days' THEN 'Past Month'
        ELSE 'Older than Month'
    END as time_category,
    COUNT(*) as count,
    status
FROM quizzes
WHERE start_time IS NOT NULL
GROUP BY time_category, status
ORDER BY status, count DESC;

-- 8. TIMEZONE DISTRIBUTION
-- Understanding timezone usage
SELECT 
    timezone,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM quizzes
GROUP BY timezone
ORDER BY count DESC;

-- 9. QUIZ ATTEMPTS vs START TIME
-- How many attempts happen before/after scheduled time
SELECT 
    CASE 
        WHEN qa.start_time < q.start_time THEN 'Started Early (Error?)'
        WHEN qa.start_time >= q.start_time AND qa.start_time <= q.start_time + (q.duration || ' minutes')::INTERVAL THEN 'On Time'
        WHEN qa.start_time > q.start_time + (q.duration || ' minutes')::INTERVAL THEN 'Late Start'
        ELSE 'Unknown'
    END as attempt_timing,
    COUNT(*) as count
FROM quiz_attempts qa
JOIN quizzes q ON qa.quiz_id = q.id
WHERE q.start_time IS NOT NULL
GROUP BY attempt_timing
ORDER BY count DESC;

-- 10. REASSIGNMENT PATTERNS
-- How many quizzes have reassignments
SELECT 
    q.id,
    q.title,
    q.start_time,
    COUNT(DISTINCT CASE WHEN e.is_reassignment = true THEN e.student_id END) as reassigned_students,
    COUNT(DISTINCT CASE WHEN e.is_reassignment = false THEN e.student_id END) as original_students
FROM quizzes q
LEFT JOIN enrollments e ON q.id = e.quiz_id
WHERE q.status = 'published'
GROUP BY q.id, q.title, q.start_time
HAVING COUNT(DISTINCT CASE WHEN e.is_reassignment = true THEN e.student_id END) > 0
ORDER BY reassigned_students DESC
LIMIT 10;

-- 11. SHARE LINKS USAGE
-- How many quizzes use share links
SELECT 
    CASE 
        WHEN qsl.id IS NOT NULL THEN 'Has Share Link'
        ELSE 'No Share Link'
    END as share_link_status,
    COUNT(DISTINCT q.id) as quiz_count,
    q.status
FROM quizzes q
LEFT JOIN quiz_share_links qsl ON q.id = qsl.quiz_id
GROUP BY share_link_status, q.status
ORDER BY q.status, quiz_count DESC;

-- 12. GROUP ENROLLMENTS
-- How many quizzes use group enrollment
SELECT 
    CASE 
        WHEN ge.id IS NOT NULL THEN 'Group Enrolled'
        ELSE 'Individual Enrolled'
    END as enrollment_type,
    COUNT(DISTINCT e.quiz_id) as quiz_count,
    COUNT(e.id) as total_enrollments
FROM enrollments e
LEFT JOIN group_enrollments ge ON e.group_enrollment_id = ge.id
GROUP BY enrollment_type;

-- =====================================================
-- SUMMARY QUERY - KEY METRICS
-- =====================================================
SELECT 
    'Total Quizzes' as metric,
    COUNT(*)::TEXT as value
FROM quizzes
UNION ALL
SELECT 
    'Published Quizzes',
    COUNT(*)::TEXT
FROM quizzes WHERE status = 'published'
UNION ALL
SELECT 
    'Quizzes with Future Start Time',
    COUNT(*)::TEXT
FROM quizzes WHERE start_time > NOW()
UNION ALL
SELECT 
    'Total Enrollments',
    COUNT(*)::TEXT
FROM enrollments
UNION ALL
SELECT 
    'Total Quiz Attempts',
    COUNT(*)::TEXT
FROM quiz_attempts
UNION ALL
SELECT 
    'Quizzes with Reassignments',
    COUNT(DISTINCT quiz_id)::TEXT
FROM enrollments WHERE is_reassignment = true;