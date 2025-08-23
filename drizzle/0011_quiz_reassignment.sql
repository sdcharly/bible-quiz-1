-- Add fields to track quiz reassignments
ALTER TABLE enrollments 
ADD COLUMN is_reassignment BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_enrollment_id TEXT REFERENCES enrollments(id) ON DELETE SET NULL,
ADD COLUMN reassignment_reason TEXT,
ADD COLUMN reassigned_at TIMESTAMP,
ADD COLUMN reassigned_by TEXT REFERENCES "user"(id);

-- Add index for faster queries on reassignment lookups
CREATE INDEX idx_enrollments_parent ON enrollments(parent_enrollment_id) WHERE parent_enrollment_id IS NOT NULL;
CREATE INDEX idx_enrollments_reassignment ON enrollments(is_reassignment) WHERE is_reassignment = TRUE;