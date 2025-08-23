# Student Groups Implementation Plan

## Overview
Implement a biblical-themed grouping system for educators to better manage students and assign quizzes to groups rather than individuals.

## Biblical Group Naming Theme
- Default group names: "Disciples", "Apostles", "Prophets", "Elders", "Saints", "Shepherds", "Witnesses", "Messengers"
- Custom names allowed with biblical validation

## System Analysis

### Current State
1. **Student Management**: Direct educator-student relationships via `educatorStudents` table
2. **Quiz Assignment**: Individual enrollments via `enrollments` table
3. **Bulk Operations**: Currently supports bulk enrollment by selecting individual students
4. **Reassignment**: Individual quiz reassignments with tracking

### Impact Areas
1. **Database**: New tables and relationships needed
2. **APIs**: Group management and group-based quiz operations
3. **UI**: Group management interface for educators
4. **Student View**: Display group membership
5. **Admin**: Oversight of group usage and statistics
6. **Reporting**: Group-level analytics

## Database Design

### New Tables

```sql
-- Student groups table
studentGroups {
  id: text (PK)
  educatorId: text (FK -> user.id)
  name: text (unique per educator)
  description: text (optional)
  theme: text (default: "biblical")
  color: text (for UI distinction)
  maxSize: integer (default: 30)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}

-- Group members table (many-to-many)
groupMembers {
  id: text (PK)
  groupId: text (FK -> studentGroups.id)
  studentId: text (FK -> user.id)
  joinedAt: timestamp
  role: text (default: "member") -- future: "leader"
  isActive: boolean (default: true)
  addedBy: text (FK -> user.id)
  removedAt: timestamp (nullable)
  removedBy: text (FK -> user.id, nullable)
}

-- Group enrollments for quizzes
groupEnrollments {
  id: text (PK)
  groupId: text (FK -> studentGroups.id)
  quizId: text (FK -> quizzes.id)
  enrolledBy: text (FK -> user.id)
  enrolledAt: timestamp
  sendNotifications: boolean
  excludedStudentIds: jsonb (array of studentIds to exclude)
}
```

### Modified Tables
- `enrollments`: Add `groupEnrollmentId` (nullable, FK -> groupEnrollments.id)
- `activityLogs`: Add group-related action types

## Features & Considerations

### Must Have (Phase 1)
1. **Group CRUD Operations**
   - Create groups with biblical names
   - Edit group name/description
   - Soft delete groups (preserve history)
   - Group size limits based on educator permissions

2. **Member Management**
   - Add/remove students to/from groups
   - Bulk add from existing students
   - Move students between groups
   - View member list with stats

3. **Quiz Assignment**
   - Assign quiz to entire group
   - Option to exclude specific students
   - Maintain individual enrollment tracking
   - Email notifications to group members

4. **Student Experience**
   - See group membership in dashboard
   - Group name on quiz list
   - No functional changes to quiz-taking

5. **Migration & Compatibility**
   - Existing individual enrollments continue working
   - Support both group and individual assignments
   - No data loss during migration

### Nice to Have (Phase 2)
1. Group leaders (student role)
2. Group messaging/announcements
3. Group leaderboards
4. Nested groups (subgroups)
5. Group templates for quick setup

### Won't Do
1. Students in multiple groups (complexity)
2. Cross-educator group sharing
3. Group-based permissions (keep individual)

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Database schema and migrations
2. Basic API endpoints
3. Group management UI
4. Update quiz assignment flow

### Phase 2: Integration (Week 2)
1. Student dashboard updates
2. Admin oversight features
3. Analytics and reporting
4. Testing and refinement

## Risk Mitigation

### Data Integrity
- Cascade deletes properly configured
- Soft deletes for groups to preserve history
- Transaction support for bulk operations

### Performance
- Index on groupId, studentId for fast lookups
- Pagination for large groups
- Caching for group membership

### User Experience
- Clear visual distinction between group/individual assignments
- Confirmation dialogs for bulk operations
- Undo capability for recent actions

### Security
- Permission checks for group operations
- Audit logging for all changes
- Rate limiting on bulk operations

## Success Metrics
1. Reduction in time to assign quizzes (target: 50% faster)
2. Educator satisfaction with group management
3. No increase in support tickets
4. System performance maintained

## API Endpoints

### Group Management
- `GET /api/educator/groups` - List educator's groups
- `POST /api/educator/groups` - Create new group
- `GET /api/educator/groups/:id` - Get group details
- `PUT /api/educator/groups/:id` - Update group
- `DELETE /api/educator/groups/:id` - Soft delete group

### Member Management
- `GET /api/educator/groups/:id/members` - List group members
- `POST /api/educator/groups/:id/members` - Add members
- `DELETE /api/educator/groups/:id/members/:studentId` - Remove member
- `POST /api/educator/groups/:id/members/bulk` - Bulk add/remove

### Quiz Assignment
- `POST /api/educator/quiz/:id/assign-group` - Assign quiz to group
- `GET /api/educator/quiz/:id/group-enrollments` - View group enrollments

### Student APIs
- `GET /api/student/groups` - Get student's groups
- `GET /api/student/groups/:id/quizzes` - Group's assigned quizzes

## UI Components

### Educator Views
1. **Groups Page** (`/educator/groups`)
   - List all groups with member counts
   - Create new group button
   - Quick actions (edit, delete, view)

2. **Group Management** (`/educator/groups/:id`)
   - Member list with search/filter
   - Add/remove members
   - Bulk operations
   - Group statistics

3. **Quiz Assignment Modal**
   - Toggle between individual/group assignment
   - Group selection dropdown
   - Member preview with exclusion options

### Student Views
1. **Dashboard Enhancement**
   - Group membership card
   - Group-assigned quizzes section

2. **Quiz List Enhancement**
   - Group badge on quizzes
   - Filter by group

## Testing Strategy

### Unit Tests
- Group CRUD operations
- Member management logic
- Permission validations

### Integration Tests
- Quiz assignment flow
- Email notifications
- Data migration

### E2E Tests
- Complete group lifecycle
- Student experience
- Admin oversight

## Rollback Plan
1. Feature flag for group functionality
2. Database migrations reversible
3. Fallback to individual assignments
4. Data export capability

## Timeline
- Week 1: Backend implementation
- Week 2: Frontend implementation
- Week 3: Testing and refinement
- Week 4: Deployment and monitoring

## Open Questions
1. Should groups have co-educators?
2. Archive vs delete for groups?
3. Group activity notifications?
4. Import groups from CSV?