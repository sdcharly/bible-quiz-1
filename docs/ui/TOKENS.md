# 🎨 Design Tokens

> The atomic values that create visual consistency across SimpleQuiz

## Color System

### Primary Palette - Cool & Friendly Blues

```css
--color-primary-50: #EFF6FF;   /* Lightest blue background */
--color-primary-100: #DBEAFE;  /* Light blue tint */
--color-primary-200: #BFDBFE;  /* Soft blue */
--color-primary-300: #93C5FD;  /* Sky blue */
--color-primary-400: #60A5FA;  /* Medium blue */
--color-primary-500: #3B82F6;  /* Main brand blue */
--color-primary-600: #2563EB;  /* Hover state */
--color-primary-700: #1D4ED8;  /* Active state */
--color-primary-800: #1E40AF;  /* Dark blue */
--color-primary-900: #1E3A8A;  /* Darkest blue */
```

### Secondary Palette - Success Greens

```css
--color-success-50: #ECFDF5;   /* Mint background */
--color-success-100: #D1FAE5;  /* Light success */
--color-success-200: #A7F3D0;  /* Soft green */
--color-success-300: #6EE7B7;  /* Medium green */
--color-success-400: #34D399;  /* Bright green */
--color-success-500: #10B981;  /* Success green */
--color-success-600: #059669;  /* Hover state */
--color-success-700: #047857;  /* Active state */
```

### Accent Palette - Playful Purples

```css
--color-accent-50: #F5F3FF;    /* Lavender background */
--color-accent-100: #EDE9FE;   /* Light purple */
--color-accent-200: #DDD6FE;   /* Soft purple */
--color-accent-300: #C4B5FD;   /* Medium purple */
--color-accent-400: #A78BFA;   /* Bright purple */
--color-accent-500: #8B5CF6;   /* Accent purple */
--color-accent-600: #7C3AED;   /* Hover state */
```

### Semantic Colors

```css
/* Status Colors */
--color-error: #EF4444;        /* Soft red for errors */
--color-warning: #F59E0B;      /* Amber for warnings */
--color-info: #3B82F6;         /* Blue for information */

/* UI Colors */
--color-background: #FFFFFF;   /* Main background */
--color-surface: #F9FAFB;      /* Card backgrounds */
--color-border: #E5E7EB;       /* Borders */
--color-divider: #F3F4F6;      /* Dividers */

/* Text Colors */
--color-text-primary: #111827;   /* Main text */
--color-text-secondary: #6B7280; /* Secondary text */
--color-text-tertiary: #9CA3AF;  /* Muted text */
--color-text-inverse: #FFFFFF;   /* Text on dark backgrounds */

/* Interactive States */
--color-hover: rgba(59, 130, 246, 0.1);  /* Hover overlay */
--color-focus: #3B82F6;                  /* Focus ring */
--color-disabled: #E5E7EB;               /* Disabled state */
```

## Typography

### Font Families

```css
--font-heading: 'Plus Jakarta Sans', -apple-system, system-ui, sans-serif;
--font-body: 'Inter', -apple-system, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

### Font Sizes - Mobile First

```css
/* Mobile Scale (default) */
--text-xs: 0.75rem;    /* 12px - Captions */
--text-sm: 0.875rem;   /* 14px - Small text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Large body */
--text-xl: 1.25rem;    /* 20px - Small heading */
--text-2xl: 1.5rem;    /* 24px - Heading */
--text-3xl: 1.875rem;  /* 30px - Large heading */
--text-4xl: 2.25rem;   /* 36px - Hero heading */

/* Tablet/Desktop Scale (@media min-width: 641px) */
--text-lg-desktop: 1.25rem;   /* 20px */
--text-xl-desktop: 1.5rem;    /* 24px */
--text-2xl-desktop: 1.875rem; /* 30px */
--text-3xl-desktop: 2.25rem;  /* 36px */
--text-4xl-desktop: 3rem;     /* 48px */
```

### Font Weights

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights

```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
--leading-loose: 2;
```

## Spacing System

### Base Scale (4px grid)

```css
--space-0: 0;
--space-px: 1px;
--space-0.5: 0.125rem;  /* 2px */
--space-1: 0.25rem;     /* 4px */
--space-2: 0.5rem;      /* 8px */
--space-3: 0.75rem;     /* 12px */
--space-4: 1rem;        /* 16px */
--space-5: 1.25rem;     /* 20px */
--space-6: 1.5rem;      /* 24px */
--space-8: 2rem;        /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;       /* 48px */
--space-16: 4rem;       /* 64px */
--space-20: 5rem;       /* 80px */
```

### Component Spacing

```css
/* Padding */
--padding-button: 12px 20px;
--padding-button-mobile: 16px 24px;  /* Larger for thumbs */
--padding-card: 20px;
--padding-card-mobile: 16px;
--padding-section: 24px;
--padding-section-mobile: 16px;

/* Margins */
--margin-stack-xs: 4px;
--margin-stack-sm: 8px;
--margin-stack-md: 16px;
--margin-stack-lg: 24px;
--margin-stack-xl: 32px;
```

## Border Radius

```css
--radius-none: 0;
--radius-sm: 4px;       /* Subtle rounding */
--radius-md: 8px;       /* Buttons, inputs */
--radius-lg: 12px;      /* Cards, modals */
--radius-xl: 16px;      /* Large cards */
--radius-2xl: 24px;     /* Feature cards */
--radius-full: 9999px;  /* Pills, avatars */
```

## Shadows - Soft & Friendly

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Colored shadows for special elements */
--shadow-primary: 0 4px 14px 0 rgba(59, 130, 246, 0.25);
--shadow-success: 0 4px 14px 0 rgba(16, 185, 129, 0.25);
--shadow-accent: 0 4px 14px 0 rgba(139, 92, 246, 0.25);
```

## Animation & Motion

### Durations

```css
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 700ms;
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### Transitions

```css
--transition-all: all 200ms ease-out;
--transition-colors: colors 200ms ease-out;
--transition-opacity: opacity 200ms ease-out;
--transition-transform: transform 200ms ease-out;
--transition-shadow: box-shadow 200ms ease-out;
```

## Breakpoints

```css
--breakpoint-mobile: 0px;      /* Default */
--breakpoint-tablet: 641px;    /* iPad portrait */
--breakpoint-desktop: 1025px;  /* Desktop */
--breakpoint-wide: 1280px;     /* Wide desktop */
```

## Z-Index Scale

```css
--z-dropdown: 10;
--z-sticky: 20;
--z-fixed: 30;
--z-modal-backdrop: 40;
--z-modal: 50;
--z-popover: 60;
--z-tooltip: 70;
--z-toast: 80;
```

## Component-Specific Tokens

### Buttons

```css
/* Sizes */
--button-height-sm: 36px;
--button-height-md: 44px;  /* Mobile optimized */
--button-height-lg: 52px;

/* Mobile specific */
--button-min-width-mobile: 120px;
--button-touch-target: 44px;  /* Minimum touch target */
```

### Cards

```css
--card-padding: 20px;
--card-padding-mobile: 16px;
--card-radius: 16px;
--card-shadow: var(--shadow-md);
--card-border: 1px solid var(--color-border);
```

### Forms

```css
--input-height: 44px;  /* Touch friendly */
--input-padding: 12px 16px;
--input-radius: 8px;
--input-border: 1px solid var(--color-border);
--input-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.1);
```

### Quiz Components

```css
/* Question Cards */
--quiz-card-radius: 16px;
--quiz-card-padding: 24px;
--quiz-card-padding-mobile: 20px;

/* Option Buttons */
--quiz-option-min-height: 56px;  /* Large touch target */
--quiz-option-padding: 16px 20px;
--quiz-option-radius: 12px;
--quiz-option-gap: 12px;

/* Progress Bar */
--progress-height: 8px;
--progress-radius: 4px;
--progress-bg: var(--color-primary-100);
--progress-fill: var(--color-primary-500);
```

## Gradients

```css
/* Primary gradients for CTAs */
--gradient-primary: linear-gradient(135deg, #667EEA 0%, #3B82F6 100%);
--gradient-success: linear-gradient(135deg, #10B981 0%, #34D399 100%);
--gradient-accent: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);

/* Subtle background gradients */
--gradient-surface: linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%);
--gradient-hero: linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%);
```

## Implementation Example

### CSS Variables

```css
:root {
  /* Apply all tokens */
  --color-primary: #3B82F6;
  --font-heading: 'Plus Jakarta Sans', system-ui;
  --space-md: 16px;
  --radius-friendly: 12px;
  /* ... etc */
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #111827;
    --color-surface: #1F2937;
    --color-text-primary: #F9FAFB;
    /* ... dark mode tokens */
  }
}
```

### Tailwind Config

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          // ... rest of scale
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'friendly': '12px',
      }
    }
  }
}
```

---

*These tokens form the foundation of our friendly, modern, and mobile-first design system.*