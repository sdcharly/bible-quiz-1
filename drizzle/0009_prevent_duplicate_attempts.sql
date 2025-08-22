-- First, let's identify and handle any existing duplicate attempts
-- We'll keep only the most recent completed attempt or the in-progress one

-- Create a temporary table with the attempts we want to keep
CREATE TEMP TABLE attempts_to_keep AS
SELECT DISTINCT ON (quiz_id, student_id) id
FROM quiz_attempts
ORDER BY quiz_id, student_id, 
  CASE 
    WHEN status = 'completed' THEN 0 
    WHEN status = 'in_progress' THEN 1 
    ELSE 2 
  END,
  created_at DESC;

-- Delete duplicate attempts (keeping only the ones we identified)
DELETE FROM quiz_attempts 
WHERE id NOT IN (SELECT id FROM attempts_to_keep);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE "quiz_attempts" 
ADD CONSTRAINT "unique_quiz_student_attempt" 
UNIQUE("quiz_id", "student_id");

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_status" 
ON "quiz_attempts"("status");

CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_student_quiz" 
ON "quiz_attempts"("student_id", "quiz_id");

-- Drop the temporary table
DROP TABLE attempts_to_keep;