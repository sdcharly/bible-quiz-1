# Admin-v2 Component Library Guide

## 🎯 Overview

The admin-v2 component library provides a security-first, professional set of React components specifically designed for administrative interfaces. Built with TypeScript, React, and Tailwind CSS, these components emphasize security, authority, and clear visual hierarchy.

## 📦 Installation & Import

```typescript
// Import all components from the centralized index
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  LoadingState,
  EmptyState,
  StatCard,
  ConfirmDialog,
  SecurityBadge
} from '@/components/admin-v2';
```

## 🎨 Theme System

### Color Palette

The admin panel uses a **red/burgundy** primary color scheme to convey authority and administrative control:

- **Primary**: Red-700/800 for main actions and emphasis
- **Accent**: Amber for secondary actions (consistency with main app)
- **Security Levels**: Visual indicators for risk levels
- **Status Colors**: Clear status communication

## 📚 Component Reference

### Layout Components

#### AdminPageContainer

Wraps entire admin pages with consistent spacing and background.

```typescript
<AdminPageContainer maxWidth="7xl">
  {/* Page content */}
</AdminPageContainer>
```

**Props:**
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full'
- `noPadding`: boolean
- `className`: string

#### AdminPageHeader

Professional page header with breadcrumbs and security indicators.

```typescript
<AdminPageHeader
  title="User Management"
  subtitle="Manage system users and permissions"
  icon={Users}
  securityLevel="high"
  breadcrumbs={[
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Users' }
  ]}
  actions={
    <Button className="bg-red-700 hover:bg-red-800">
      Add User
    </Button>
  }
/>
```

**Props:**
- `title`: string (required)
- `subtitle`: string
- `icon`: LucideIcon
- `securityLevel`: 'low' | 'medium' | 'high' | 'critical'
- `breadcrumbs`: Array<{label: string, href?: string}>
- `actions`: ReactNode

#### AdminSection

Content sections with optional security indicators.

```typescript
<AdminSection
  title="Recent Activity"
  description="Monitor system events"
  icon={Activity}
  securityLevel="medium"
>
  {/* Section content */}
</AdminSection>
```

### Navigation Components

#### AdminTabNavigation

Professional tab navigation with badge support.

```typescript
<AdminTabNavigation
  tabs={[
    { id: 'overview', label: 'Overview', icon: BarChart },
    { id: 'pending', label: 'Pending', icon: Clock, badge: 5, badgeVariant: 'danger' },
    { id: 'approved', label: 'Approved', icon: Check }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

### Security Components

#### ConfirmDialog

Multi-level security confirmation dialog for critical actions.

```typescript
<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Delete User Account"
  description="This action cannot be undone."
  securityLevel="critical"
  requireTypedConfirmation="DELETE"
  showConsequences={[
    "Remove all user data permanently",
    "Revoke all access permissions",
    "Delete associated records"
  ]}
  onConfirm={handleDelete}
/>
```

**Security Levels:**
- `low`: Basic confirmation
- `medium`: Warning with confirmation
- `high`: Strong warning with typed confirmation
- `critical`: Critical warning with consequences list

#### SecurityBadge

Visual security and permission indicators.

```typescript
// Security level badge
<SecurityBadge level="high" />

// Permission badge
<PermissionBadge role="admin" />

// Status badge
<StatusBadge status="pending" />
```

### Feedback Components

#### LoadingState

Consistent loading indicators.

```typescript
<LoadingState 
  text="Loading users..." 
  fullPage={true}
  size="lg" 
/>
```

#### EmptyState

Professional empty states with actions.

```typescript
<EmptyState
  icon={Users}
  title="No users found"
  description="Get started by adding your first user"
  action={{
    label: "Add User",
    onClick: handleAddUser
  }}
/>
```

### Data Display Components

#### StatCard

Statistics display cards with trends.

```typescript
<StatCard
  label="Total Users"
  value="1,234"
  icon={Users}
  trend={{ value: 12, label: "vs last month" }}
  variant="success"
/>
```

## 🔒 Security Best Practices

### 1. Always Use Confirmation Dialogs for Destructive Actions

```typescript
// Good - High security for user deletion
<ConfirmDialog
  securityLevel="critical"
  requireTypedConfirmation="DELETE USER"
  showConsequences={consequences}
/>

// Bad - No confirmation
<Button onClick={deleteUser}>Delete</Button>
```

### 2. Visual Security Indicators

```typescript
// Show security level in headers
<AdminPageHeader securityLevel="high" />

// Show security badges for sensitive sections
<AdminSection securityLevel="critical">
  {/* Sensitive content */}
</AdminSection>
```

### 3. Permission-Based Rendering

```typescript
// Use permission badges to show access levels
<div className="flex items-center gap-2">
  <span>Current Role:</span>
  <PermissionBadge role={user.role} />
</div>
```

## 💡 Usage Examples

### Complete Admin Page Example

```typescript
"use client";

import { useState, useEffect } from 'react';
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminTabNavigation,
  LoadingState,
  EmptyState,
  StatCard,
  ConfirmDialog
} from '@/components/admin-v2';
import { Users, Shield, Activity, Settings } from 'lucide-react';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState(false);
  
  if (loading) {
    return <LoadingState fullPage text="Loading users..." />;
  }

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="User Management"
        subtitle="Manage system users and permissions"
        icon={Users}
        securityLevel="high"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Users' }
        ]}
      />

      {/* Stats */}
      <AdminSection transparent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value="1,234"
            icon={Users}
            trend={{ value: 12 }}
            variant="success"
          />
        </div>
      </AdminSection>

      {/* Tabs */}
      <AdminTabNavigation
        tabs={[
          { id: 'all', label: 'All Users', icon: Users },
          { id: 'pending', label: 'Pending', badge: 5, badgeVariant: 'warning' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="mb-6"
      />

      {/* Content */}
      <AdminSection title="User List" icon={Users}>
        {/* User list content */}
      </AdminSection>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="Delete User"
        description="This will permanently delete the user account."
        securityLevel="critical"
        requireTypedConfirmation="DELETE"
        onConfirm={handleDelete}
      />
    </AdminPageContainer>
  );
}
```

## 🚀 Migration Guide

### From Old Admin Components

```typescript
// Old approach
<div className="bg-white shadow">
  <h1>Admin Dashboard</h1>
</div>

// New approach with admin-v2
<AdminPageHeader
  title="Admin Dashboard"
  securityLevel="low"
/>
```

### Replacing Alerts

```typescript
// Old approach
alert('User deleted successfully');

// New approach
<ConfirmDialog
  securityLevel="high"
  onConfirm={handleDelete}
/>
```

## 📋 Component Checklist

Before deploying admin pages:

- [ ] Uses AdminPageContainer wrapper
- [ ] Has AdminPageHeader with breadcrumbs
- [ ] Security levels set appropriately
- [ ] Confirmation dialogs for destructive actions
- [ ] Loading and empty states implemented
- [ ] Consistent red/burgundy theme
- [ ] No raw HTML form elements
- [ ] Proper TypeScript types
- [ ] Error handling in place

## 🎨 Visual Consistency Rules

1. **Primary Actions**: Always use `bg-red-700 hover:bg-red-800`
2. **Secondary Actions**: Use `border-red-200 hover:bg-red-50`
3. **Danger Actions**: Use `bg-red-600` with border
4. **Icons**: Always wrap in colored background containers
5. **Security Indicators**: Use left border for security levels

## 📊 Performance Tips

1. Import only needed components
2. Use loading states for async operations
3. Implement skeleton loaders for lists
4. Lazy load heavy components
5. Use React.memo for expensive renders

## 🔐 Security Reminders

- Always validate permissions server-side
- Log all admin actions for audit trails
- Use typed confirmations for critical actions
- Show clear consequences for destructive operations
- Implement rate limiting for admin APIs