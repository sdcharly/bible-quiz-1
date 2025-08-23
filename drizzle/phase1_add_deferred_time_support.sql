-- =====================================================
-- PHASE 1: Database Migration for Quiz Time Deferral
-- Date: 2024
-- Purpose: Add columns to support deferred time configuration
-- 
-- IMPORTANT: This migration is BACKWARD COMPATIBLE
-- Existing functionality will continue to work unchanged
-- =====================================================

BEGIN;

-- 1. Add new JSONB column for flexible time configuration
-- This will store time-related data that can be set later
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS time_configuration jsonb DEFAULT NULL;

COMMENT ON COLUMN quizzes.time_configuration IS 
'Stores deferred time configuration: {startTime, timezone, duration, configuredAt, configuredBy}';

-- 2. Add scheduling status to track quiz state
-- Using text instead of enum for flexibility during development
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS scheduling_status text DEFAULT 'legacy';

COMMENT ON COLUMN quizzes.scheduling_status IS 
'Tracks scheduling state: legacy (old quizzes), prepared (no time), scheduled (time set), published';

-- 3. Add audit columns for tracking who and when scheduled
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS scheduled_by text DEFAULT NULL;

ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS scheduled_at timestamp DEFAULT NULL;

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_scheduling_status 
ON quizzes(scheduling_status) 
WHERE scheduling_status != 'legacy';

-- 5. Backfill existing data
-- Mark all existing quizzes as 'legacy' to distinguish them
UPDATE quizzes 
SET 
    time_configuration = jsonb_build_object(
        'startTime', start_time,
        'timezone', timezone,
        'duration', duration,
        'configuredAt', created_at,
        'configuredBy', educator_id,
        'isLegacy', true
    ),
    scheduling_status = 'legacy',
    scheduled_by = educator_id,
    scheduled_at = created_at
WHERE time_configuration IS NULL;

-- 6. Create a view for easier querying of time data
CREATE OR REPLACE VIEW quiz_time_view AS
SELECT 
    id,
    title,
    status,
    scheduling_status,
    -- Use COALESCE to fall back to original columns for legacy data
    COALESCE(
        (time_configuration->>'startTime')::timestamp,
        start_time
    ) as effective_start_time,
    COALESCE(
        time_configuration->>'timezone',
        timezone
    ) as effective_timezone,
    COALESCE(
        (time_configuration->>'duration')::integer,
        duration
    ) as effective_duration,
    CASE 
        WHEN time_configuration->>'isLegacy' = 'true' THEN 'Legacy Quiz'
        WHEN time_configuration IS NOT NULL THEN 'New System'
        ELSE 'Pending Configuration'
    END as time_system
FROM quizzes;

-- 7. Add check constraint to ensure data consistency
-- This is disabled by default and can be enabled after testing
-- ALTER TABLE quizzes ADD CONSTRAINT check_time_configuration 
-- CHECK (
--     (scheduling_status = 'legacy' AND start_time IS NOT NULL) OR
--     (scheduling_status IN ('prepared', 'scheduled', 'published'))
-- );

-- 8. Create helper function to get quiz time
CREATE OR REPLACE FUNCTION get_quiz_start_time(quiz_id text)
RETURNS timestamp AS $$
DECLARE
    result timestamp;
BEGIN
    SELECT 
        COALESCE(
            (time_configuration->>'startTime')::timestamp,
            start_time
        ) INTO result
    FROM quizzes 
    WHERE id = quiz_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to check if quiz uses new system
CREATE OR REPLACE FUNCTION is_deferred_time_quiz(quiz_id text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM quizzes 
        WHERE id = quiz_id 
        AND scheduling_status != 'legacy'
    );
END;
$$ LANGUAGE plpgsql;

-- 10. Create audit trigger for tracking changes
CREATE OR REPLACE FUNCTION audit_time_configuration_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if time_configuration actually changed
    IF OLD.time_configuration IS DISTINCT FROM NEW.time_configuration THEN
        INSERT INTO audit_log (
            table_name,
            record_id,
            action,
            old_value,
            new_value,
            changed_by,
            changed_at
        ) VALUES (
            'quizzes',
            NEW.id,
            'time_configuration_change',
            OLD.time_configuration::text,
            NEW.time_configuration::text,
            current_user,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncomment this after creating audit_log table if needed
-- CREATE TRIGGER trigger_audit_time_configuration
-- AFTER UPDATE ON quizzes
-- FOR EACH ROW
-- EXECUTE FUNCTION audit_time_configuration_change();

-- 11. Add helpful comments
COMMENT ON FUNCTION get_quiz_start_time(text) IS 
'Returns effective start time for a quiz, handling both legacy and new system';

COMMENT ON FUNCTION is_deferred_time_quiz(text) IS 
'Returns true if quiz uses the new deferred time system';

-- 12. Verification queries
DO $$
DECLARE
    legacy_count integer;
    total_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count FROM quizzes;
    SELECT COUNT(*) INTO legacy_count FROM quizzes WHERE scheduling_status = 'legacy';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Total quizzes: %', total_count;
    RAISE NOTICE '  Legacy quizzes marked: %', legacy_count;
    RAISE NOTICE '  New columns added successfully';
    
    -- Verify no data was lost
    IF EXISTS (
        SELECT 1 FROM quizzes 
        WHERE start_time IS NOT NULL 
        AND time_configuration IS NULL
    ) THEN
        RAISE EXCEPTION 'Data integrity check failed: Some quizzes missing time_configuration';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- Run these queries to verify the migration worked
-- =====================================================

-- Check migration success
SELECT 
    'Migration Status' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'FAILED: No quizzes found'
        WHEN COUNT(*) = COUNT(CASE WHEN time_configuration IS NOT NULL THEN 1 END) THEN 'SUCCESS: All quizzes migrated'
        ELSE 'PARTIAL: Some quizzes not migrated'
    END as status,
    COUNT(*) as total_quizzes,
    COUNT(CASE WHEN time_configuration IS NOT NULL THEN 1 END) as migrated_quizzes
FROM quizzes;

-- Sample data check
SELECT 
    id,
    title,
    scheduling_status,
    time_configuration->>'isLegacy' as is_legacy,
    start_time,
    (time_configuration->>'startTime')::timestamp as config_start_time
FROM quizzes
LIMIT 5;