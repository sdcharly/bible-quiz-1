# Permission Templates System

## Overview
The Permission Templates system provides a flexible, scalable way to manage educator permissions. Instead of hardcoding permissions, administrators can now create, manage, and apply permission templates to educators.

## Architecture

### Database Schema
```sql
-- Permission Templates Table
CREATE TABLE permission_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT REFERENCES user(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User Table Addition
ALTER TABLE user ADD COLUMN permission_template_id TEXT 
  REFERENCES permission_templates(id);
```

### Permission Structure
```typescript
interface EducatorPermissions {
  canPublishQuiz: boolean;
  canAddStudents: boolean;
  canEditQuiz: boolean;
  canDeleteQuiz: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  maxStudents: number;        // -1 for unlimited
  maxQuizzes: number;         // -1 for unlimited
  maxQuestionsPerQuiz: number; // -1 for unlimited
}
```

## Default Templates

### 1. Basic Educator (Default)
- **ID:** `basic-educator`
- **Description:** Standard permissions for approved educators
- **Limits:** 100 students, 50 quizzes, 100 questions per quiz
- **All basic permissions enabled**

### 2. Premium Educator
- **ID:** `premium-educator`
- **Description:** Enhanced permissions with higher limits
- **Limits:** 500 students, 200 quizzes, 250 questions per quiz
- **All permissions enabled**

### 3. Unlimited Educator
- **ID:** `unlimited-educator`
- **Description:** No limits on resources
- **Limits:** Unlimited (-1 for all limits)
- **All permissions enabled**

### 4. Restricted Educator
- **ID:** `restricted-educator`
- **Description:** Limited permissions for new educators
- **Limits:** 20 students, 5 quizzes, 50 questions per quiz
- **Cannot publish quizzes or delete content**

### 5. Read Only
- **ID:** `read-only-educator`
- **Description:** View only access
- **Limits:** No creation capabilities (0 for all limits)
- **Can only view analytics**

## Implementation Details

### Key Files

1. **Schema Definition**
   - `/src/lib/schema.ts` - Database schema with `permissionTemplates` table

2. **Template Management**
   - `/src/lib/permission-templates.ts` - Core template CRUD operations
   - `/src/lib/permissions.ts` - Permission checking with template support

3. **API Endpoints**
   - `/api/admin/settings/permissions/templates` - Template CRUD operations
   - `/api/admin/educators/[id]/approve` - Approval with template selection
   - `/api/admin/educators/bulk-update-template` - Bulk template updates
   - `/api/admin/seed-templates` - Seed default templates

4. **UI Components**
   - `/src/components/admin/EducatorApprovalDialog.tsx` - Template selection UI
   - `/src/app/admin/educators/EducatorsManagement.tsx` - Template display
   - `/src/app/admin/educators/[id]/EducatorDetails.tsx` - Individual educator view

### Permission Resolution Flow

1. **Check Custom Permissions:** If user has custom permissions set, use those
2. **Check Template:** If user has a template assigned, use template permissions
3. **Fallback to Status:** Use default permissions based on approval status

```typescript
// Permission resolution in getUserPermissions()
if (userData.permissions && Object.keys(userData.permissions).length > 0) {
  return userData.permissions; // Custom permissions
}

if (userData.permissionTemplateId) {
  const template = await getTemplatePermissions(userData.permissionTemplateId);
  if (template) return template.permissions; // Template permissions
}

// Fallback to approval status defaults
return DEFAULT_PERMISSIONS[userData.approvalStatus];
```

## Usage Guide

### 1. Seeding Templates
```bash
# Call the seed endpoint (requires admin authentication)
curl -X POST https://your-domain/api/admin/seed-templates \
  -H "Cookie: your-admin-session"
```

### 2. Approving Educators with Templates
When approving an educator, the admin can:
1. Select from available templates in the approval dialog
2. The default template is pre-selected
3. Template details and permissions are displayed for review

### 3. Bulk Updating Templates
```javascript
// API Request
POST /api/admin/educators/bulk-update-template
{
  "userIds": ["user1", "user2", "user3"],
  "templateId": "premium-educator"
}
```

### 4. Creating Custom Templates
```javascript
// API Request
POST /api/admin/settings/permissions/templates
{
  "name": "Custom Template",
  "description": "Custom permissions for special educators",
  "permissions": {
    "canPublishQuiz": true,
    "canAddStudents": true,
    "canEditQuiz": true,
    "canDeleteQuiz": false,
    "canViewAnalytics": true,
    "canExportData": true,
    "maxStudents": 200,
    "maxQuizzes": 100,
    "maxQuestionsPerQuiz": 150
  },
  "isDefault": false
}
```

## Migration Guide

### For Existing Educators
1. Run the seed templates endpoint to create default templates
2. Use bulk update to assign templates to existing approved educators
3. Review and adjust individual educator permissions as needed

### Database Migration
```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Seed templates (after deployment)
# Use the admin UI or call the seed endpoint
```

## Security Considerations

1. **Admin Only:** All template management requires admin authentication
2. **Activity Logging:** All template operations are logged in activity_logs
3. **Validation:** Template existence is validated before application
4. **Immutable Defaults:** Default template cannot be deleted
5. **Graceful Fallback:** System works even without templates

## Future Enhancements

1. **Template Inheritance:** Allow templates to inherit from other templates
2. **Time-based Templates:** Templates that change based on educator tenure
3. **Custom Permission Fields:** Allow adding custom permission fields
4. **Template Analytics:** Track which templates are most effective
5. **Auto-assignment Rules:** Automatically assign templates based on criteria
6. **Template Versioning:** Track changes to templates over time

## Troubleshooting

### Templates Not Appearing
1. Check if templates are seeded: Query `permission_templates` table
2. Verify `is_active = true` for templates
3. Check admin authentication for API calls

### Permissions Not Applied
1. Verify `permission_template_id` is set on user
2. Check template permissions in database
3. Clear any custom permissions that might override

### Build Errors
1. Ensure `@radix-ui/react-radio-group` is installed
2. Run `npm install` to update dependencies
3. Check for TypeScript errors with `npm run build`