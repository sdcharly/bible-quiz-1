-- Create permission templates table
CREATE TABLE IF NOT EXISTS permission_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT REFERENCES "user"(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add template_id to user table
ALTER TABLE "user" ADD COLUMN permission_template_id TEXT REFERENCES permission_templates(id);

-- Create indexes
CREATE INDEX idx_permission_templates_name ON permission_templates(name);
CREATE INDEX idx_permission_templates_is_default ON permission_templates(is_default);
CREATE INDEX idx_permission_templates_is_active ON permission_templates(is_active);
CREATE INDEX idx_user_permission_template_id ON "user"(permission_template_id);

-- Insert default templates
INSERT INTO permission_templates (id, name, description, permissions, is_default, is_active) VALUES
  ('basic-educator', 'Basic Educator', 'Standard permissions for approved educators', 
   '{"canPublishQuiz": true, "canAddStudents": true, "canEditQuiz": true, "canDeleteQuiz": true, "canViewAnalytics": true, "canExportData": true, "maxStudents": 100, "maxQuizzes": 50, "maxQuestionsPerQuiz": 100}',
   true, true),
  ('premium-educator', 'Premium Educator', 'Enhanced permissions with higher limits',
   '{"canPublishQuiz": true, "canAddStudents": true, "canEditQuiz": true, "canDeleteQuiz": true, "canViewAnalytics": true, "canExportData": true, "maxStudents": 500, "maxQuizzes": 200, "maxQuestionsPerQuiz": 250}',
   false, true),
  ('unlimited-educator', 'Unlimited Educator', 'No limits on resources',
   '{"canPublishQuiz": true, "canAddStudents": true, "canEditQuiz": true, "canDeleteQuiz": true, "canViewAnalytics": true, "canExportData": true, "maxStudents": -1, "maxQuizzes": -1, "maxQuestionsPerQuiz": -1}',
   false, true),
  ('restricted-educator', 'Restricted Educator', 'Limited permissions for new educators',
   '{"canPublishQuiz": false, "canAddStudents": true, "canEditQuiz": true, "canDeleteQuiz": false, "canViewAnalytics": false, "canExportData": false, "maxStudents": 20, "maxQuizzes": 5, "maxQuestionsPerQuiz": 50}',
   false, true),
  ('read-only-educator', 'Read Only', 'View only access',
   '{"canPublishQuiz": false, "canAddStudents": false, "canEditQuiz": false, "canDeleteQuiz": false, "canViewAnalytics": true, "canExportData": false, "maxStudents": 0, "maxQuizzes": 0, "maxQuestionsPerQuiz": 0}',
   false, true);

-- Migrate existing approved educators to use the default template
UPDATE "user" 
SET permission_template_id = 'basic-educator'
WHERE role = 'educator' AND approval_status = 'approved' AND permission_template_id IS NULL;