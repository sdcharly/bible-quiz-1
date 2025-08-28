# Status Color System Documentation

## Overview
This document describes the centralized status color system implemented across the application for consistent visual hierarchy and improved UX. The system uses a biblical theme with amber/orange as primary colors while ensuring accessibility and visual appeal.

## Architecture

### Core Files
- **`/src/lib/status-theme.ts`** - Main configuration file containing all status themes
- **`/src/components/ui/status-badge.tsx`** - Reusable status components

### Key Components

#### StatusBadge
A flexible badge component that displays status with consistent colors and icons.

```tsx
<StatusBadge 
  type="quiz"           // Type of entity
  status="published"    // Status value
  size="sm"            // xs | sm | md | lg
  showIcon={true}      // Show status icon
  showDot={false}      // Show dot instead of icon
  variant="badge"      // badge | pill | text
/>
```

#### StatusCard
A card wrapper that applies status-appropriate background and border colors.

```tsx
<StatusCard
  type="quiz"
  status="draft"
  interactive={true}   // Enable hover effects
  className="p-4"
>
  {/* Card content */}
</StatusCard>
```

#### StatusIndicator
A simple dot indicator with optional pulse animation.

```tsx
<StatusIndicator
  type="enrollment"
  status="in_progress"
  size="md"           // sm | md | lg
  pulse={true}        // Animate the indicator
/>
```

## Color Themes

### Quiz Status Colors

| Status | Color | Background | Usage |
|--------|-------|------------|-------|
| **Published** | Emerald (Green) | `emerald-100` | Active, available quizzes |
| **Draft** | Amber (Yellow) | `amber-100` | Work in progress |
| **Archived** | Gray | `gray-100` | Inactive/resting quizzes |
| **Scheduled** | Blue | `blue-100` | Future scheduled quizzes |

### Enrollment Status Colors

| Status | Color | Background | Usage |
|--------|-------|------------|-------|
| **Enrolled** | Amber | `amber-50` | Not started yet |
| **In Progress** | Yellow | `yellow-100` | Currently attempting |
| **Completed** | Green | `green-100` | Successfully finished |
| **Abandoned** | Red | `red-100` | Failed/quit attempts |

### Student Status Colors

| Status | Color | Background | Usage |
|--------|-------|------------|-------|
| **Active** | Emerald | `emerald-50` | Active students |
| **Inactive** | Gray | `gray-50` | Dormant accounts |
| **Pending** | Orange | `orange-50` | Awaiting activation |

### Educator Status Colors

| Status | Color | Background | Usage |
|--------|-------|------------|-------|
| **Approved** | Emerald | `emerald-50` | Verified educators |
| **Pending** | Amber | `amber-50` | Awaiting review |
| **Rejected** | Red | `red-50` | Denied access |
| **Suspended** | Gray | `gray-50` | Temporarily disabled |

### Document Status Colors

| Status | Color | Background | Usage |
|--------|-------|------------|-------|
| **Ready** | Green | `green-50` | Processed successfully |
| **Processing** | Blue | `blue-50` | Currently processing |
| **Failed** | Red | `red-50` | Processing error |

## Usage Guidelines

### 1. Always Use Components
Never hardcode status colors. Always use the provided components:

```tsx
// ❌ Bad
<span className="bg-green-100 text-green-700">Active</span>

// ✅ Good
<StatusBadge type="quiz" status="published" />
```

### 2. Type Safety
The system provides type-safe status configurations:

```tsx
import { getStatusConfig } from '@/lib/status-theme';

const config = getStatusConfig('quiz', 'published');
// Returns: { label, icon, colors }
```

### 3. Dark Mode Support
All colors automatically adapt to dark mode:
- Light backgrounds become darker with transparency
- Text colors adjust for contrast
- Borders maintain visibility

### 4. Accessibility
- All color combinations meet WCAG AA standards
- Icons provide additional visual cues beyond color
- Status text is always included (not color-only)

## Implementation Examples

### Quiz List Item
```tsx
<StatusCard type="quiz" status={quiz.status} interactive={true}>
  <div className="flex justify-between items-center p-4">
    <div>
      <h3>{quiz.title}</h3>
      <StatusBadge type="quiz" status={quiz.status} size="sm" />
    </div>
    <Button>View</Button>
  </div>
</StatusCard>
```

### Student Dashboard
```tsx
{enrollment.status === 'completed' ? (
  <StatusBadge 
    type="enrollment" 
    status="completed"
    showIcon={true}
    customLabel={`Score: ${score}%`}
  />
) : (
  <StatusIndicator 
    type="enrollment" 
    status={enrollment.status}
    pulse={enrollment.status === 'in_progress'}
  />
)}
```

### Educator Overview
```tsx
<div className="grid grid-cols-3 gap-4">
  {['draft', 'published', 'archived'].map(status => (
    <StatusCard key={status} type="quiz" status={status}>
      <div className="p-6 text-center">
        <StatusBadge type="quiz" status={status} size="lg" />
        <p className="mt-2">{getQuizCount(status)} quizzes</p>
      </div>
    </StatusCard>
  ))}
</div>
```

## Adding New Status Types

To add a new status type or value:

1. Update `/src/lib/status-theme.ts`:
```tsx
export const statusTheme = {
  // ... existing types
  newType: {
    statusValue: {
      label: 'Display Label',
      icon: 'IconName',
      colors: {
        bg: 'bg-color-100 dark:bg-color-900/30',
        border: 'border-color-200 dark:border-color-800',
        text: 'text-color-700 dark:text-color-400',
        hover: 'hover:bg-color-200 dark:hover:bg-color-900/50',
        badge: 'bg-color-100 text-color-700 dark:bg-color-900/30 dark:text-color-400',
        dot: 'bg-color-500'
      }
    }
  }
}
```

2. Update TypeScript types if needed
3. Components will automatically support the new status

## Performance Considerations

- Status configurations are memoized
- Components use `cn()` for efficient class merging
- Colors are CSS classes, not inline styles
- Dark mode uses CSS variables for instant switching

## Maintenance

### Regular Tasks
- Review color contrast ratios quarterly
- Update dark mode colors based on user feedback
- Add new status types as features evolve
- Ensure consistency across all dashboards

### Testing Checklist
- [ ] All status colors visible in light mode
- [ ] All status colors visible in dark mode
- [ ] Interactive states (hover, focus) work
- [ ] Icons display correctly
- [ ] Text remains readable at all sizes

## Related Documentation
- [Theme Consistency Guide](/docs/technical/THEME_CONSISTENCY_GUIDE.md)
- [UI Sizing Standards](/docs/technical/UI_SIZING_STANDARDS.md)
- [Educator Design Standards](/docs/technical/EDUCATOR_DESIGN_STANDARDS.md)