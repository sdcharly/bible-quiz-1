# Design System & UI Standards

## Design Principles

### 1. Consistency
- Use the same patterns throughout the application
- Maintain consistent spacing, colors, and typography
- Follow established component patterns

### 2. Accessibility (WCAG 2.1 AA Compliance)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- All interactive elements must be keyboard accessible
- Proper ARIA labels and semantic HTML
- Focus indicators on all interactive elements

### 3. Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Touch-friendly targets: minimum 44x44px

### 4. Performance
- Minimize CSS specificity
- Use Tailwind utilities over custom CSS
- Lazy load heavy components

## Design Tokens

### Spacing Scale (8px Base Grid)
```
space-0: 0px
space-1: 0.25rem (4px)
space-2: 0.5rem (8px)
space-3: 0.75rem (12px)
space-4: 1rem (16px)
space-5: 1.25rem (20px)
space-6: 1.5rem (24px)
space-8: 2rem (32px)
space-10: 2.5rem (40px)
space-12: 3rem (48px)
```

### Typography Scale
```tsx
// Headings
text-4xl: 2.25rem/2.5rem - Page titles
text-3xl: 1.875rem/2.25rem - Section headers
text-2xl: 1.5rem/2rem - Card titles
text-xl: 1.25rem/1.75rem - Subsection headers
text-lg: 1.125rem/1.75rem - Large body text

// Body
text-base: 1rem/1.5rem - Default body text
text-sm: 0.875rem/1.25rem - Secondary text
text-xs: 0.75rem/1rem - Captions and labels
```

### Color System

#### Semantic Colors
```scss
// Primary (Amber - Biblical Theme)
$primary-50: #FFFBEB;
$primary-100: #FEF3C7;
$primary-200: #FDE68A;
$primary-300: #FCD34D;
$primary-400: #FBBF24;
$primary-500: #F59E0B; // Base
$primary-600: #D97706;
$primary-700: #B45309;
$primary-800: #92400E;
$primary-900: #78350F;

// Status Colors
$success: #10B981; // Green-500
$warning: #F59E0B; // Amber-500
$error: #EF4444; // Red-500
$info: #3B82F6; // Blue-500

// Neutral (Gray)
$neutral-50: #F9FAFB;
$neutral-100: #F3F4F6;
$neutral-200: #E5E7EB;
$neutral-300: #D1D5DB;
$neutral-400: #9CA3AF;
$neutral-500: #6B7280;
$neutral-600: #4B5563;
$neutral-700: #374151;
$neutral-800: #1F2937;
$neutral-900: #111827;
```

## Component Standards

### Form Controls

#### Input Fields
```tsx
// Standard Input
<div className="space-y-2">
  <Label 
    htmlFor="input-id" 
    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
  >
    Label Text
    {required && <span className="text-error ml-1">*</span>}
  </Label>
  <Input
    id="input-id"
    type="text"
    className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent rounded-md"
    placeholder="Placeholder text"
    aria-describedby="input-help"
  />
  {helpText && (
    <p id="input-help" className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
      {helpText}
    </p>
  )}
</div>
```

#### Select Dropdowns
```tsx
<div className="space-y-2">
  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
    Select Option
  </Label>
  <Select>
    <SelectTrigger className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-primary-500">
      <SelectValue placeholder="Choose an option" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="option1">Option 1</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Buttons

#### Button Hierarchy
```tsx
// Primary - Most important action
<Button 
  className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200"
>
  Primary Action
</Button>

// Secondary - Secondary actions
<Button 
  variant="outline"
  className="border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/20"
>
  Secondary Action
</Button>

// Tertiary - Less important actions
<Button 
  variant="ghost"
  className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
>
  Tertiary Action
</Button>

// Destructive - Delete/Remove actions
<Button 
  variant="destructive"
  className="bg-error hover:bg-red-600 text-white"
>
  Delete
</Button>
```

#### Button Sizes
```tsx
size="sm"  // Height: 32px, Padding: 8px 12px, Font: text-sm
size="default" // Height: 40px, Padding: 10px 16px, Font: text-base
size="lg"  // Height: 48px, Padding: 12px 24px, Font: text-lg
```

### Cards & Containers

```tsx
// Standard Card
<Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow duration-200">
  <CardHeader className="space-y-1 pb-4">
    <CardTitle className="text-xl font-heading text-neutral-900 dark:text-neutral-100">
      Card Title
    </CardTitle>
    <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
      Card description
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
  <CardFooter className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
    {/* Actions */}
  </CardFooter>
</Card>
```

### Feedback Components

#### Alert/Notification Boxes
```tsx
// Success
<Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
  <AlertDescription className="text-green-700 dark:text-green-300">
    Success message
  </AlertDescription>
</Alert>

// Warning
<Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
  <AlertDescription className="text-amber-700 dark:text-amber-300">
    Warning message
  </AlertDescription>
</Alert>

// Error
<Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
  <AlertDescription className="text-red-700 dark:text-red-300">
    Error message
  </AlertDescription>
</Alert>

// Info
<Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
  <AlertDescription className="text-blue-700 dark:text-blue-300">
    Information message
  </AlertDescription>
</Alert>
```

### Loading States

```tsx
// Spinner
<div className="flex items-center justify-center p-8">
  <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
</div>

// Skeleton
<div className="space-y-3">
  <Skeleton className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-800" />
  <Skeleton className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800" />
</div>

// Progress Bar
<Progress value={progress} className="h-2 bg-neutral-200 dark:bg-neutral-800">
  <div className="bg-gradient-to-r from-primary-500 to-primary-600" />
</Progress>
```

## Layout Patterns

### Page Layout
```tsx
<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
  {/* Header */}
  <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
    <div className="container mx-auto px-4 py-4">
      {/* Navigation */}
    </div>
  </header>
  
  {/* Main Content */}
  <main className="container mx-auto px-4 py-8">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page content */}
    </div>
  </main>
  
  {/* Footer */}
  <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800">
    <div className="container mx-auto px-4 py-6">
      {/* Footer content */}
    </div>
  </footer>
</div>
```

### Form Layout
```tsx
<form className="space-y-6">
  {/* Section 1 */}
  <div className="space-y-4">
    <h3 className="text-lg font-heading text-neutral-900 dark:text-neutral-100">
      Section Title
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Form fields */}
    </div>
  </div>
  
  {/* Section 2 */}
  <div className="space-y-4">
    {/* More fields */}
  </div>
  
  {/* Actions */}
  <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save Changes</Button>
  </div>
</form>
```

## Responsive Patterns

### Mobile-First Grid
```tsx
// 1 column on mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>

// Responsive padding
<div className="px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>

// Responsive text size
<h1 className="text-2xl sm:text-3xl lg:text-4xl">
  Responsive Heading
</h1>
```

## Animation & Transitions

### Standard Transitions
```tsx
// Hover effects
className="transition-all duration-200 hover:scale-105"

// Color transitions
className="transition-colors duration-150"

// Shadow transitions
className="transition-shadow duration-200 hover:shadow-lg"

// Opacity transitions
className="transition-opacity duration-300"
```

### Micro-interactions
```tsx
// Button press effect
className="active:scale-95 transition-transform duration-75"

// Focus ring animation
className="focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150"
```

## Accessibility Standards

### Focus Management
```tsx
// Visible focus indicators
className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"

// Skip to main content
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
  Skip to main content
</a>
```

### ARIA Labels
```tsx
// Form fields
<Input aria-label="Search" aria-describedby="search-help" />

// Buttons with icons only
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Loading states
<div role="status" aria-live="polite">
  <Spinner />
  <span className="sr-only">Loading...</span>
</div>
```

### Keyboard Navigation
- Tab order must be logical
- All interactive elements must be keyboard accessible
- Escape key closes modals/dropdowns
- Enter/Space activates buttons
- Arrow keys navigate menus

## Implementation Checklist

### Component Creation
- [ ] Follow 8px spacing grid
- [ ] Use semantic color variables
- [ ] Include dark mode support
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard accessibility
- [ ] Test responsive behavior
- [ ] Add loading/error states
- [ ] Include focus indicators
- [ ] Follow button hierarchy
- [ ] Use consistent animations

### Code Quality
- [ ] Use Tailwind utilities over custom CSS
- [ ] Follow mobile-first approach
- [ ] Group related classes logically
- [ ] Extract repeated patterns into components
- [ ] Document complex implementations
- [ ] Test across browsers
- [ ] Validate accessibility with tools
- [ ] Check color contrast ratios
- [ ] Optimize for performance
- [ ] Follow TypeScript best practices

## Tools & Resources

### Development Tools
- **Tailwind CSS IntelliSense** - VSCode extension
- **Headless UI** - Unstyled accessible components
- **Radix UI** - Low-level UI primitives
- **clsx** - Conditional class names
- **tailwind-merge** - Merge Tailwind classes correctly

### Testing Tools
- **axe DevTools** - Accessibility testing
- **WAVE** - Web accessibility evaluation
- **Lighthouse** - Performance & accessibility audit
- **Contrast Checker** - WCAG color contrast validation

### References
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Guidelines](https://material.io/design)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)