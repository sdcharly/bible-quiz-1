-- Add generated tsvector column for full-text search
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS search_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_quizzes_search_vector ON quizzes USING GIN (search_vector);

-- Also create prefix index for fallback searches (e.g., when full-text doesn't match)
CREATE INDEX IF NOT EXISTS idx_quizzes_title_prefix ON quizzes (title text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_quizzes_description_prefix ON quizzes (description text_pattern_ops);

-- Add comment explaining the search strategy
COMMENT ON COLUMN quizzes.search_vector IS 'Generated tsvector for full-text search on title and description';