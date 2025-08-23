-- =====================================================
-- PHASE 1: ROLLBACK SCRIPT
-- Emergency rollback for quiz time deferral migration
-- 
-- WARNING: This will remove all Phase 1 changes
-- Make sure to backup before running!
-- =====================================================

BEGIN;

-- 1. Drop the helper functions
DROP FUNCTION IF EXISTS get_quiz_start_time(text);
DROP FUNCTION IF EXISTS is_deferred_time_quiz(text);
DROP FUNCTION IF EXISTS audit_time_configuration_change() CASCADE;

-- 2. Drop the view
DROP VIEW IF EXISTS quiz_time_view;

-- 3. Drop the index
DROP INDEX IF EXISTS idx_quizzes_scheduling_status;

-- 4. Remove the new columns
ALTER TABLE quizzes 
DROP COLUMN IF EXISTS time_configuration,
DROP COLUMN IF EXISTS scheduling_status,
DROP COLUMN IF EXISTS scheduled_by,
DROP COLUMN IF EXISTS scheduled_at;

-- 5. Verify rollback
DO $$
BEGIN
    -- Check if columns were removed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quizzes' 
        AND column_name IN ('time_configuration', 'scheduling_status', 'scheduled_by', 'scheduled_at')
    ) THEN
        RAISE EXCEPTION 'Rollback failed: Some columns still exist';
    END IF;
    
    RAISE NOTICE 'Rollback completed successfully';
    RAISE NOTICE 'All Phase 1 changes have been removed';
END $$;

COMMIT;

-- Verification query
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quizzes'
ORDER BY ordinal_position;