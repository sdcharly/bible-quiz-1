# Theme Consistency Guide - Biblical Theme

## Overview
SimpleQuiz uses a biblical-themed design system with amber/orange colors inspired by ancient scrolls and sacred texts. This guide ensures consistent theming across all components.

## Color Palette

### Primary Colors (Amber/Orange)
- **Primary**: `amber-600` / `orange-600`
- **Primary Hover**: `amber-700` / `orange-700`
- **Primary Light**: `amber-50` / `amber-100`
- **Primary Dark**: `amber-900`

### Gradients
- **Standard**: `bg-gradient-to-r from-amber-600 to-orange-600`
- **Background**: `bg-gradient-to-br from-amber-50 to-orange-100`
- **Button**: `bg-gradient-to-r from-amber-500 to-orange-600`

### Semantic Colors
- **Success**: `green-600` / `green-500`
- **Error**: `red-600` / `red-500`
- **Warning**: `amber-500` / `orange-500`
- **Info**: `amber-600` (not blue!)
- **Neutral**: `gray-500` / `gray-600`

## Component Standards

### Loading Indicators
Always use the `BiblicalLoader` component for consistency:

```tsx
import { BiblicalLoader, BiblicalPageLoader } from "@/components/ui/biblical-loader";

// Inline loader
<BiblicalLoader size="sm" text="Loading..." inline />

// Page loader
<BiblicalPageLoader text="Loading quiz..." />

// Custom usage
<BiblicalLoader 
  size="lg" 
  text="Processing..." 
  className="my-4" 
/>
```

**Never use:**
- `<div className="animate-spin rounded-full border-b-2 border-blue-600">`
- `<Loader2 className="animate-spin text-blue-600">`

### Progress Bars
Use amber/orange gradients for all progress indicators:

```tsx
// Correct
<div className="bg-gradient-to-r from-amber-500 to-orange-600 h-full transition-all" 
     style={{ width: `${progress}%` }} />

// Incorrect
<div className="bg-blue-600 h-full" style={{ width: `${progress}%` }} />
```

### Buttons

#### Primary Actions
```tsx
<Button className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700">
  Action
</Button>
```

#### Secondary Actions
```tsx
<Button variant="outline" className="border-amber-300 hover:bg-amber-50">
  Secondary
</Button>
```

### Cards and Containers

#### Info Cards
```tsx
<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-4">
  <p className="text-amber-800 dark:text-amber-300">Info message</p>
</div>
```

#### Empty States
```tsx
<div className="text-center py-12">
  <BookOpen className="h-12 w-12 text-amber-600 opacity-50 mx-auto mb-4" />
  <p className="text-gray-500">No items found</p>
</div>
```

### Typography

#### Headings
- Main titles: `font-heading` with gradient text
- Section headers: `font-semibold` with standard colors
- Consistent sizes: `text-4xl`, `text-3xl`, `text-2xl`, `text-xl`

```tsx
// Page title
<h1 className="text-4xl font-heading font-bold">
  <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
    Title
  </span>
</h1>

// Section header
<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
  Section
</h2>
```

### Icons
- Use amber/orange colors for thematic icons
- Keep utility icons in gray tones
- Success/error icons use semantic colors

```tsx
// Thematic icon
<BookOpen className="h-6 w-6 text-amber-600" />

// Utility icon
<Settings className="h-5 w-5 text-gray-500" />

// Status icons
<CheckCircle className="h-5 w-5 text-green-500" />
<AlertCircle className="h-5 w-5 text-red-500" />
```

## Dark Mode Considerations

Always provide dark mode variants:
```tsx
className="bg-amber-50 dark:bg-amber-900/20"
className="text-amber-800 dark:text-amber-300"
className="border-amber-200 dark:border-amber-800"
```

## Common Mistakes to Avoid

### ❌ DON'T Use Blue for Info States
```tsx
// Wrong
<div className="bg-blue-50 text-blue-800">Info</div>
<Loader2 className="animate-spin text-blue-600" />
```

### ✅ DO Use Amber/Orange
```tsx
// Correct
<div className="bg-amber-50 text-amber-800">Info</div>
<BiblicalLoader size="md" />
```

### ❌ DON'T Mix Theme Colors
```tsx
// Wrong - mixing blue with biblical theme
<Button className="bg-blue-600">Action</Button>
```

### ✅ DO Stay Consistent
```tsx
// Correct - consistent biblical theme
<Button className="bg-amber-600 hover:bg-amber-700">Action</Button>
```

## Migration Checklist

When updating components:
- [ ] Replace all `text-blue-*` with `text-amber-*`
- [ ] Replace all `bg-blue-*` with `bg-amber-*` or gradients
- [ ] Replace all `border-blue-*` with `border-amber-*`
- [ ] Update loading spinners to use `BiblicalLoader`
- [ ] Ensure progress bars use amber/orange gradients
- [ ] Check dark mode variants are included
- [ ] Test component in both light and dark themes

## Testing Theme Consistency

1. **Visual Scan**: Look for any blue elements that aren't links
2. **Search Check**: `grep -r "blue-[456]00" src/`
3. **Build Check**: `npm run build` - ensure no errors
4. **Dark Mode**: Toggle dark mode and verify all elements are visible

## Resources

- Biblical Loader Component: `/src/components/ui/biblical-loader.tsx`
- Theme Colors: Tailwind amber/orange palette
- Font: `font-heading` for biblical feel
- Icons: Lucide React with amber colors for thematic elements