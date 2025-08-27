# Documentation Hub

Production-ready documentation for the SimpleQuiz (Scrolls of Wisdom) application.

## 📚 Documentation Structure

### `/deployment` - Production Deployment
Essential guides for deploying and maintaining the application:
- **ENVIRONMENT_CONFIG.md** - Complete environment variable setup
- **PERFORMANCE_OPTIMIZATION.md** - Performance tuning and monitoring

### `/project-management` - Active Development
Current project status and roadmaps:
- **TODO_SUPER_ADMIN_INTEGRATION.md** - Master TODO list for admin features
- **SECURITY_AUDIT_REPORT.md** - Security compliance and findings

### `/technical` - Technical References
Core technical documentation for developers:

#### System Architecture
- **URL_SYSTEM_ARCHITECTURE.md** - URL system design (share codes, short URLs)
- **URL_QUICK_REFERENCE.md** - Quick reference for URL handling
- **SESSION_MANAGEMENT.md** - Session handling and security

#### API Documentation
- **LIGHTRAG_API_COMPLETE.md** - Complete LightRAG API specification
- **LIGHTRAG_API_REFERENCE.md** - Integration guide with critical ID system info
- **LIGHTRAG_API_CRITICAL_FINDINGS.md** - Known issues and fixes

#### Design Standards
- **EDUCATOR_DESIGN_STANDARDS.md** - Educator panel UI/UX standards
- **THEME_CONSISTENCY_GUIDE.md** - Biblical theme and color standards
- **UI_SIZING_STANDARDS.md** - Consistent sizing and spacing
- **DESIGN_SYSTEM.md** - Core design system documentation
- **SHADCN_COMPONENT_USAGE_AUDIT.md** - Component standards and audit

#### Email System
- **EMAIL_TEMPLATE_GUIDELINES.md** - Email template best practices
- **PROMOTIONAL_EMAIL_TEMPLATES.md** - Marketing email templates

#### Feature Documentation
- **EDUCATOR_REMINDER_SYSTEM.md** - Automated reminder system
- **ADMIN_NOTIFICATION_SYSTEM.md** - Admin notification features
- **PERMISSION_TEMPLATES.md** - Permission system architecture
- **GRADING_SYSTEM_ANALYSIS.md** - Quiz grading logic

#### AI Integration
- **ai/streaming.md** - AI streaming implementation

### `/ui` - UI Framework
Comprehensive UI documentation:
- **COOKBOOK.md** - UI patterns and recipes
- **PRINCIPLES.md** - Design principles
- **TOKENS.md** - Design token system
- **TYPOGRAPHY.md** - Typography standards
- **README.md** - UI documentation index

### `/business` - Business Context
- **starter-prompt.md** - Business requirements and context

## 🚀 Quick Start for Developers

### Essential Reading Order:
1. Start with `/deployment/ENVIRONMENT_CONFIG.md` for setup
2. Review `/technical/EDUCATOR_DESIGN_STANDARDS.md` for UI standards
3. Check `/project-management/TODO_SUPER_ADMIN_INTEGRATION.md` for current work
4. Reference `/technical/URL_QUICK_REFERENCE.md` for URL handling

### For Specific Tasks:

#### Working on Educator Features?
- Read: `EDUCATOR_DESIGN_STANDARDS.md`
- Reference: `THEME_CONSISTENCY_GUIDE.md`
- Use: Educator-v2 components (never write duplicate UI)

#### Implementing Email Features?
- Follow: `EMAIL_TEMPLATE_GUIDELINES.md`
- Use: `createEmailWrapper` helper function
- Reference: `PROMOTIONAL_EMAIL_TEMPLATES.md` for examples

#### Integrating with LightRAG?
- **CRITICAL**: Read `LIGHTRAG_API_REFERENCE.md` first
- Understand the track_id vs document_id distinction
- Check `LIGHTRAG_API_CRITICAL_FINDINGS.md` for known issues

#### Security & Permissions?
- Review: `SECURITY_AUDIT_REPORT.md`
- Implement: `PERMISSION_TEMPLATES.md`
- Check: `SESSION_MANAGEMENT.md`

## 📋 Documentation Standards

### When to Create New Documentation:
- New feature implementations
- API integrations
- Security findings
- Architecture decisions
- Breaking changes

### Documentation Format:
```markdown
# Title
## Overview
Brief description of the topic

## Key Concepts
Essential information

## Implementation Details
Code examples and specifics

## Best Practices
Do's and don'ts

## Troubleshooting
Common issues and solutions
```

## 🗂️ Phase 1 Completion Note

Phase 1 documentation has been archived in `docs_backup_phase1_complete_[date].tar.gz`. This includes:
- Completed refactoring documentation (15 files)
- Obsolete technical documentation (23 files)
- Completed project management docs (10 files)
- Old deployment guides (Redis, etc.)

The current documentation set represents production-ready, essential references for ongoing development and maintenance.

## 🔍 Finding Information

### Use grep for quick searches:
```bash
# Find all references to a topic
grep -r "topic" docs/

# Find specific API endpoints
grep -r "POST /api" docs/technical/

# Find UI component standards
grep -r "component" docs/technical/EDUCATOR_DESIGN_STANDARDS.md
```

### Key Search Terms:
- "CRITICAL" - Important warnings
- "TODO" - Pending tasks
- "DEPRECATED" - Obsolete features
- "IMPORTANT" - Key information
- "Example" - Code examples

## 📝 Maintenance

This documentation is actively maintained. Updates should be made when:
- Features are added or modified
- Security issues are discovered
- Best practices change
- New integrations are added

Last cleanup: Phase 1 Complete (August 2024)