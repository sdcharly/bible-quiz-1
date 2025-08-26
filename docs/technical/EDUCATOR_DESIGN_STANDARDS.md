# Educator Panel Design Standards & Component Guidelines

## 🎯 Core Principles

**NEVER write code like a novice. ALWAYS follow these professional standards:**

1. **Component Reusability First** - Never duplicate UI patterns
2. **Consistent Theme** - Always use amber/biblical theme colors
3. **Professional Architecture** - Use TypeScript, proper patterns, and clean code
4. **Accessibility** - All interactive elements must be keyboard accessible
5. **Responsive Design** - Mobile-first approach with proper breakpoints

---

## 📦 Required Component Usage

### For ALL Educator Pages

```typescript
// ✅ ALWAYS use this import pattern
import {
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState,
  TabNavigation
} from "@/components/educator-v2";

// ❌ NEVER import individually
// BAD: import { PageHeader } from "@/components/educator-v2/layout/PageHeader";
```

### Page Structure Template

```typescript
"use client";

import { useState, useEffect } from "react";
import { 
  PageHeader,
  PageContainer,
  Section,
  LoadingState,
  EmptyState,
  TabNavigation
} from "@/components/educator-v2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Import other shadcn components as needed

export default function EducatorPageName() {
  // State management
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // Data fetching
  useEffect(() => {
    fetchData();
  }, []);
  
  // Always handle loading state professionally
  if (loading) {
    return <LoadingState fullPage text="Loading..." />;
  }
  
  // Always handle empty states
  if (!data) {
    return (
      <PageContainer>
        <EmptyState
          icon={IconName}
          title="No data found"
          description="Description of what's missing"
          action={{
            label: "Action Label",
            onClick: () => handleAction()
          }}
        />
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <PageHeader
        title="Page Title"
        subtitle="Descriptive subtitle"
        icon={IconComponent}
        breadcrumbs={[
          { label: 'Educator', href: '/educator/dashboard' },
          { label: 'Current Page' }
        ]}
        actions={
          <Button className="bg-amber-600 hover:bg-amber-700">
            Action
          </Button>
        }
      />
      
      <Section>
        {/* Main content */}
      </Section>
    </PageContainer>
  );
}
```

---

## 🎨 Theme & Styling Standards

### Color Palette (NEVER use blue/purple)

```typescript
// ✅ CORRECT - Amber Theme Colors
const colors = {
  primary: {
    default: "amber-600",
    hover: "amber-700",
    light: "amber-50",
    border: "amber-200"
  },
  success: {
    default: "green-600",
    light: "green-50"
  },
  error: {
    default: "red-600",
    light: "red-50"
  },
  warning: {
    default: "yellow-600",
    light: "yellow-50"
  }
};

// ❌ NEVER USE
// blue-600, purple-600, indigo-600 (unless for very specific non-theme elements)
```

### Button Styling

```typescript
// ✅ CORRECT - Primary Actions
<Button className="bg-amber-600 hover:bg-amber-700 text-white">
  Primary Action
</Button>

// ✅ CORRECT - Secondary Actions
<Button variant="outline" className="border-amber-200 hover:bg-amber-50">
  Secondary Action
</Button>

// ✅ CORRECT - Destructive Actions
<Button variant="ghost" className="text-red-600 hover:bg-red-50">
  Delete
</Button>

// ❌ WRONG - Never use default blue buttons
<Button>Action</Button>  // This uses default blue theme
```

### Card Styling

```typescript
// ✅ CORRECT
<Card className="border-amber-100 hover:shadow-lg transition-shadow">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// For stat cards
<div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        Label
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        Value
      </p>
    </div>
    <Icon className="h-8 w-8 text-amber-600 opacity-20" />
  </div>
</div>
```

---

## 🔄 Tab Navigation (ALWAYS use TabNavigation component)

### ✅ CORRECT Implementation

```typescript
import { TabNavigation } from "@/components/educator-v2";
import { BarChart, Users, BookOpen } from "lucide-react";

// In component
<TabNavigation
  tabs={[
    { id: 'overview', label: 'Overview', icon: BarChart },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'content', label: 'Content', icon: BookOpen }
  ]}
  activeTab={activeTab}
  onTabChange={(tab) => setActiveTab(tab as TabType)}
  className="mb-6"
/>
```

### ❌ WRONG - Never create inline tabs

```typescript
// NEVER DO THIS
<div className="flex border-b">
  <button className={activeTab === 'tab1' ? 'border-b-2' : ''}>
    Tab 1
  </button>
</div>
```

---

## 📊 Data Display Standards

### Tables

```typescript
// ✅ CORRECT - Styled table with hover states
<div className="overflow-x-auto">
  <table className="w-full">
    <thead>
      <tr className="border-b border-amber-100">
        <th className="text-left py-2 px-4 font-medium text-gray-600">
          Header
        </th>
      </tr>
    </thead>
    <tbody>
      {data.map((item) => (
        <tr key={item.id} className="border-b hover:bg-amber-50 transition-colors">
          <td className="py-3 px-4">{item.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Empty States

```typescript
// ✅ ALWAYS handle empty data professionally
{data.length === 0 ? (
  <EmptyState
    icon={IconComponent}
    title="No items found"
    description="Get started by adding your first item"
    action={{
      label: "Add Item",
      onClick: () => handleAdd()
    }}
  />
) : (
  // Display data
)}
```

---

## 🔧 Form Components (NEVER use raw HTML)

### ❌ FORBIDDEN - Raw HTML Elements

```typescript
// NEVER use these:
<input type="text" />
<select></select>
<textarea></textarea>
<button></button>
```

### ✅ REQUIRED - ShadCN Components

```typescript
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Use these instead:
<div className="space-y-4">
  <div>
    <Label htmlFor="name">Name</Label>
    <Input id="name" value={value} onChange={handleChange} />
  </div>
  
  <div>
    <Label htmlFor="type">Type</Label>
    <Select value={type} onValueChange={setType}>
      <SelectTrigger id="type">
        <SelectValue placeholder="Select type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

---

## 🎯 Alignment Standards (CRITICAL)

### Information Display Fields

**NEVER use poor alignment. ALWAYS follow these patterns:**

#### ✅ CORRECT - Consistent Height & Alignment
```typescript
// For label-value pairs with icons
<div className="flex flex-col">
  <div className="flex items-center gap-2 mb-1 h-6">
    <Icon className="h-4 w-4 text-amber-600 flex-shrink-0" />
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Label</p>
  </div>
  <p className="text-base font-medium text-gray-900 dark:text-white pl-6">
    {value}
  </p>
</div>

// For grid layouts of info fields
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Each item follows the pattern above */}
</div>
```

#### ❌ WRONG - Inconsistent Alignment
```typescript
// NEVER DO THIS - mixing alignments
<div>
  <Icon className="inline" /> Label: {value}
</div>

// NEVER DO THIS - no consistent structure
<p><Icon /> {label}</p>
<p>{value}</p>
```

### Stat Cards Alignment

#### ✅ CORRECT - Properly Aligned Stats
```typescript
<div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        Label
      </p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
    <Icon className="h-8 w-8 text-amber-600 opacity-20" />
  </div>
</div>
```

### Form Fields Alignment

#### ✅ CORRECT - Consistent Form Layout
```typescript
<div className="space-y-4">
  <div className="flex flex-col">
    <Label className="mb-1.5 text-sm font-medium">Field Label</Label>
    <Input className="w-full" />
  </div>
</div>
```

### List Items Alignment

#### ✅ CORRECT - Aligned List Items
```typescript
<div className="space-y-2">
  {items.map(item => (
    <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-amber-50 rounded">
      <Icon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{item.title}</p>
        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
      </div>
    </div>
  ))}
</div>
```

### Common Alignment Rules

1. **Icon Alignment**: Always use `flex-shrink-0` on icons to prevent distortion
2. **Text Truncation**: Use `min-w-0` and `truncate` for long text
3. **Consistent Gaps**: Use standard gap values (2, 3, 4, 6)
4. **Vertical Rhythm**: Maintain consistent spacing between elements
5. **Grid Alignment**: Use proper grid gaps and responsive columns

---

## 📱 Responsive Design Patterns

### Grid Layouts

```typescript
// ✅ Mobile-first responsive grids
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// ✅ Responsive text sizing
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
  Title
</h1>

// ✅ Hide/show based on breakpoint
<span className="hidden sm:inline">Desktop text</span>
<span className="sm:hidden">Mobile text</span>
```

---

## ⚡ Performance Standards

### Data Fetching

```typescript
// ✅ CORRECT - Use logger, not console
import { logger } from "@/lib/logger";

const fetchData = async () => {
  try {
    const response = await fetch('/api/endpoint');
    if (response.ok) {
      const data = await response.json();
      setData(data);
    }
  } catch (error) {
    logger.error('Error fetching data:', error);
  } finally {
    setLoading(false);
  }
};

// ❌ WRONG
console.log('data'); // Never use console.log
```

### Conditional Rendering

```typescript
// ✅ CORRECT - Use ternary operators
{condition ? <Component /> : null}

// ❌ WRONG - Avoid && in JSX (causes Next.js issues)
{condition && <Component />}
```

---

## 📋 Component Checklist for New Pages

Before considering any educator page complete, verify:

- [ ] Uses `PageContainer` wrapper
- [ ] Has `PageHeader` with breadcrumbs
- [ ] Uses `Section` components for content blocks
- [ ] Implements `LoadingState` for loading
- [ ] Implements `EmptyState` for no data
- [ ] Uses `TabNavigation` for tabs (if needed)
- [ ] All buttons use amber theme colors
- [ ] All borders use amber-100/200
- [ ] No blue or purple colors (except specific non-theme elements)
- [ ] Uses shadcn/ui components (no raw HTML inputs)
- [ ] Responsive design with proper breakpoints
- [ ] Uses `logger` instead of `console`
- [ ] Proper TypeScript types
- [ ] Error handling in all async operations
- [ ] Accessibility (keyboard navigation, ARIA labels)

---

## 🚀 Quick Reference for Common Patterns

### Stats Dashboard

```typescript
<Section transparent>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard
      label="Total Students"
      value={stats.students}
      icon={Users}
      trend={stats.trend}
    />
  </div>
</Section>
```

### Action Buttons Group

```typescript
<div className="flex flex-wrap gap-2">
  <Button className="bg-amber-600 hover:bg-amber-700">
    Primary Action
  </Button>
  <Button variant="outline" className="border-amber-200 hover:bg-amber-50">
    Secondary
  </Button>
</div>
```

### Modal/Dialog

```typescript
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="border-amber-100">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button className="bg-amber-600 hover:bg-amber-700">
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎓 Remember: Professional Code = Reusable Components + Consistent Theme + Clean Architecture

**This is not just a style guide - it's a commitment to excellence. Every line of code should reflect professional standards, not amateur attempts.**