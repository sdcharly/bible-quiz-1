# UI Sizing Standards Guide

## Overview
This document establishes consistent sizing standards for all UI elements in the SimpleQuiz application to ensure visual harmony and professional appearance.

## Text Sizing Standards

### Labels
- **Form Field Labels**: `text-base` (16px) - Primary labels for inputs, selects, etc.
- **Section Headers**: `text-lg` (18px) or `text-xl` (20px)
- **Inline Labels**: `text-sm` (14px) - Secondary or helper text
- **Required Asterisk**: Always use `<span className="text-red-500 ml-1">*</span>`

```tsx
// Correct - Consistent label sizing
<Label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
  Number of Questions
</Label>

// Incorrect - Too small for primary labels
<Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
  Number of Questions
</Label>
```

### Headings
- **Page Title**: `text-3xl` or `text-4xl` with `font-heading`
- **Section Title**: `text-2xl` with `font-semibold`
- **Card Title**: `text-xl` with `font-semibold`
- **Subsection**: `text-lg` with `font-medium`

```tsx
// Page title
<h1 className="text-3xl font-heading font-bold mb-2">Create Quiz</h1>

// Section title
<h2 className="text-2xl font-semibold mb-4">Quiz Configuration</h2>

// Card title
<h3 className="text-xl font-semibold">Question Details</h3>
```

## Form Elements

### Input Fields
- **Standard Width**: Full width within container (`w-full`)
- **Height**: Default Tailwind/shadcn height (typically 40px)
- **Padding**: `px-3 py-2` for consistency
- **Font Size**: Inherit from parent or `text-base`

```tsx
<Input
  type="text"
  className="w-full"
  placeholder="Enter title..."
/>
```

### Select Dropdowns
- **Width**: Match input field width (`w-full`)
- **Height**: Match input field height
- **Trigger Padding**: Same as input fields

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Buttons

#### Size Variants
- **Large**: `size="lg"` - Primary actions (Submit, Create)
- **Default**: `size="default"` - Standard actions
- **Small**: `size="sm"` - Secondary actions, table actions
- **Icon**: `size="icon"` - Icon-only buttons

```tsx
// Primary action
<Button size="lg" className="w-full md:w-auto">
  Create Quiz
</Button>

// Standard action
<Button size="default" variant="outline">
  Cancel
</Button>

// Table action
<Button size="sm" variant="ghost">
  Edit
</Button>
```

## Spacing Standards

### Margins & Padding
- **Page Container**: `p-6` or `p-8`
- **Card Padding**: `p-4` or `p-6`
- **Section Spacing**: `mb-6` or `mb-8` between major sections
- **Form Field Spacing**: `mb-4` between fields
- **Label to Input**: `mb-2`

```tsx
// Page layout
<div className="p-6">
  <div className="mb-8">
    <h1 className="text-3xl font-bold mb-2">Title</h1>
    <p className="text-gray-600">Description</p>
  </div>
  
  <div className="space-y-6">
    {/* Sections with consistent spacing */}
  </div>
</div>
```

### Grid Layouts
- **Two Column**: `grid-cols-1 md:grid-cols-2 gap-4`
- **Three Column**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Four Column**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`

## Modal Standards

### Consistent Modal Structure
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
    <div className="text-center">
      {/* Icon */}
      <div className="mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900 mb-4">
          <Icon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
        </div>
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Modal Title
      </h3>
      
      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Primary description
      </p>
      
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 h-2.5 rounded-full" />
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 justify-center mt-4">
        <Button variant="destructive" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  </div>
</div>
```

## Alignment Standards

### Text Alignment
- **Default**: Left-aligned for body text and forms
- **Center**: Headings in cards, empty states, modals
- **Right**: Numeric values in tables, timestamps

### Vertical Alignment
- **Form Labels**: Use `items-center` for single-line labels with inputs
- **Icons with Text**: Use `inline-flex items-center gap-2`
- **Cards**: Center content for empty states

```tsx
// Icon with text alignment
<div className="inline-flex items-center gap-2">
  <BookOpen className="h-4 w-4" />
  <span>Biblical Reference</span>
</div>

// Form field alignment
<div className="flex items-center space-x-2">
  <Label className="text-base">Count:</Label>
  <Input type="number" className="w-20" />
</div>
```

## Responsive Sizing

### Breakpoint Standards
- **Mobile**: Default styles
- **Tablet**: `md:` prefix (768px+)
- **Desktop**: `lg:` prefix (1024px+)
- **Wide**: `xl:` prefix (1280px+)

### Container Widths
- **Full Page**: `max-w-7xl mx-auto`
- **Content Area**: `max-w-4xl mx-auto`
- **Form Container**: `max-w-2xl mx-auto`
- **Modal**: `max-w-md w-full`

```tsx
// Responsive container
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Items */}
</div>
```

## Icon Sizing

### Standard Sizes
- **Extra Small**: `h-3 w-3` - Inline indicators
- **Small**: `h-4 w-4` - Button icons, list items
- **Medium**: `h-5 w-5` or `h-6 w-6` - Card icons
- **Large**: `h-8 w-8` - Feature icons
- **Extra Large**: `h-12 w-12` or `h-16 w-16` - Hero icons

```tsx
// Button with icon
<Button>
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>

// Card icon
<div className="p-4">
  <BookOpen className="h-6 w-6 text-amber-600 mb-2" />
  <h3>Title</h3>
</div>
```

## Common Patterns

### Form Section
```tsx
<div className="space-y-6">
  <div>
    <Label className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
      Field Label
    </Label>
    <Input className="w-full" />
    <p className="text-sm text-gray-500 mt-1">Helper text</p>
  </div>
</div>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card className="p-4">
    <CardHeader className="pb-3">
      <h3 className="text-lg font-semibold">Card Title</h3>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600">Content</p>
    </CardContent>
  </Card>
</div>
```

### Empty State
```tsx
<div className="text-center py-12">
  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
  <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
  <p className="text-sm text-gray-500">Get started by creating your first item.</p>
</div>
```

## Accessibility Considerations

1. **Minimum Touch Target**: 44x44px for mobile
2. **Focus Indicators**: Ensure visible focus states
3. **Color Contrast**: Maintain WCAG AA standards
4. **Consistent Spacing**: Predictable navigation

## Testing Checklist

- [ ] All form labels use `text-base` for primary fields
- [ ] Consistent spacing between sections (mb-6 or mb-8)
- [ ] Modals follow standard structure
- [ ] Icons sized appropriately for context
- [ ] Responsive breakpoints work correctly
- [ ] Text alignment is consistent
- [ ] Touch targets meet minimum size

## Migration Guide

When updating existing components:
1. Check label sizing - should be `text-base` not `text-sm`
2. Verify spacing between sections
3. Ensure modals match standard structure
4. Update button sizes to use consistent variants
5. Test responsive behavior