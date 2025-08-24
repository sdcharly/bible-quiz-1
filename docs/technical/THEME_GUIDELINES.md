# Biblical Theme Guidelines

## Core Theme Principles

This application uses a **Biblical/Amber/Gold** theme throughout. All UI components should follow these standardized guidelines.

## Color Palette

### Primary Colors (Amber/Gold)
- **Gradients**: `from-amber-500 to-amber-600` (hover: `from-amber-600 to-amber-700`)
- **Backgrounds**: `bg-amber-50 dark:bg-amber-900/20`
- **Text**: `text-amber-700 dark:text-amber-300`
- **Borders**: `border-amber-200 dark:border-amber-800`
- **Focus States**: `focus:ring-amber-500 focus:border-amber-500`

### Never Use
- ❌ Green colors (e.g., `from-green-500`, `text-green-600`)
- ❌ Default blue for informational boxes (replace with amber tones)

## Typography

### Font Classes
- **Headings/Titles**: `font-heading` (Playfair Display)
- **Body Text**: `font-body` (Inter)

### Label Styling
```tsx
<Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
  Label Text
</Label>
```

### With Icons
```tsx
<Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
  <Calendar className="h-4 w-4 mr-1" />
  Date & Time
</Label>
```

## Component Patterns

### Input Fields
```tsx
<Input
  type="text"
  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500"
/>
```

### Select Fields
```tsx
<SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-amber-500 focus:border-amber-500">
  <SelectValue />
</SelectTrigger>
```

### Buttons
```tsx
// Primary Button
<Button className="font-body bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
  Primary Action
</Button>

// Outline Button
<Button 
  variant="outline" 
  className="font-body border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
>
  Secondary Action
</Button>
```

### Information Boxes
```tsx
// Info/Preview Box
<div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
  <div className="text-sm text-amber-600 dark:text-amber-400">
    Information content
  </div>
</div>

// Error Box
<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
  <div className="flex items-center text-red-700 dark:text-red-300">
    <AlertCircle className="h-4 w-4 mr-2" />
    <span className="text-sm">Error message</span>
  </div>
</div>
```

## Spacing Standards

### Container Spacing
- **Modal/Dialog Content**: `space-y-6`
- **Form Sections**: `space-y-4`
- **Grid Layouts**: 
  - Date/Time inputs: `grid-cols-2 gap-2`
  - Full-width sections: `grid-cols-1 md:grid-cols-2 gap-4`

### Component Spacing
- **Label to Input**: `mb-2` on Label
- **Icon to Text**: `mr-1` or `mr-2` depending on icon size

## Dialog/Modal Structure

```tsx
<Dialog>
  <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
    <DialogHeader>
      <DialogTitle className="font-heading text-2xl text-amber-900 dark:text-amber-100">
        Title
      </DialogTitle>
      <DialogDescription className="font-body text-amber-700 dark:text-amber-300">
        Description
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-6 py-4">
      {/* Content */}
    </div>
    
    <DialogFooter>
      {/* Buttons */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Dark Mode Support

Always include both light and dark mode classes:
- Light: `text-amber-700 bg-amber-50`
- Dark: `dark:text-amber-300 dark:bg-amber-900/20`

## Implementation Checklist

When creating or updating components:
- [ ] Use amber/gold colors, not green or default blue
- [ ] Apply `font-heading` for titles, `font-body` for content
- [ ] Include proper spacing (`space-y-6` for sections, `space-y-4` for form groups)
- [ ] Add dark mode variants for all colors
- [ ] Use consistent input/select styling with focus states
- [ ] Follow grid layout patterns (2-column for date/time, responsive for others)
- [ ] Apply gradient backgrounds for primary buttons
- [ ] Use amber tones for informational boxes

## Files Following These Standards
- `/src/components/quiz/SchedulingModal.tsx`
- `/src/app/educator/quiz/create/page.tsx` (legacy reference)
- `/src/components/quiz/PublishButton.tsx`