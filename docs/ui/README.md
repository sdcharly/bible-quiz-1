# 📚 SimpleQuiz Design System - Biblical Theme

> A warm, scholarly design system inspired by biblical wisdom and ancient texts

## Quick Start

This design system provides a complete guide for building consistent, meaningful UI across the SimpleQuiz application. It emphasizes warmth, wisdom, and scholarly elegance while maintaining excellent usability on all devices.

## Core Philosophy

**"Learning scripture should feel like studying with a wise mentor"**

Our design system creates an environment where:
- Students feel guided through ancient wisdom
- Educators feel empowered with scholarly tools
- Everyone experiences a warm, inviting atmosphere
- Mobile users get a first-class experience

## System Structure

### 📖 [PRINCIPLES.md](./PRINCIPLES.md)
Core design principles that guide every decision

### 🎨 [TOKENS.md](./TOKENS.md)
Design tokens including colors, typography, spacing, and more

### 🍳 [COOKBOOK.md](./COOKBOOK.md)
Practical recipes and patterns for common UI scenarios

## Quick Reference

### Brand Colors - Biblical Theme
- **Primary**: `#F59E0B` (Amber/Gold - wisdom, divinity)
- **Secondary**: `#DC2626` (Deep Red - sacrifice, importance)
- **Accent**: `#7C2D12` (Brown - earthiness, humility)

### Typography
- **Headings**: Georgia, Playfair Display (classical, scholarly)
- **Body**: Inter, system-ui (clean, readable)
- **UI Elements**: System UI stack

### Spacing Scale
Mobile-optimized 4-point grid system:
- `xs: 4px`
- `sm: 8px`
- `md: 16px`
- `lg: 24px`
- `xl: 32px`
- `2xl: 48px`
- `3xl: 64px`

### Breakpoints
Mobile-first responsive design:
- **Mobile**: 0-640px (default)
- **Tablet**: 641-1024px
- **Desktop**: 1025px+

## Component Status

| Component | Status | Mobile Optimized |
|-----------|--------|------------------|
| Buttons | ✅ Ready | ✅ Yes |
| Cards | ✅ Ready | ✅ Yes |
| Forms | ✅ Ready | ✅ Yes |
| Quiz UI | ✅ Ready | ✅ Yes |
| Navigation | ✅ Ready | ✅ Yes |
| Modals | ✅ Ready | ✅ Yes |
| Loading States | ✅ Ready | ✅ Yes |
| Empty States | ✅ Ready | ✅ Yes |

## Quick Implementation

### Using with Tailwind CSS

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B', // Main amber
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        secondary: {
          50: '#FEF2F2',
          500: '#DC2626', // Deep red
          600: '#B91C1C',
        },
        accent: {
          50: '#FEF3E2',
          500: '#7C2D12', // Brown
          600: '#5C2410',
        }
      },
      fontFamily: {
        'heading': ['Georgia', 'Playfair Display', 'serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'friendly': '12px',
        'button': '8px',
        'card': '16px',
      }
    }
  }
}
```

### CSS Variables

```css
:root {
  /* Colors */
  --color-primary: #F59E0B;  /* Amber */
  --color-secondary: #DC2626; /* Deep Red */
  --color-accent: #7C2D12;   /* Brown */
  
  /* Typography */
  --font-heading: Georgia, 'Playfair Display', serif;
  --font-body: Inter, system-ui, sans-serif;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  
  /* Border Radius */
  --radius-button: 8px;
  --radius-card: 16px;
  --radius-friendly: 12px;
}
```

## Accessibility

All components follow WCAG 2.1 AA standards:
- Minimum contrast ratio of 4.5:1 for normal text
- Touch targets minimum 44x44px on mobile
- Clear focus indicators
- Screen reader friendly markup
- Keyboard navigation support

## Tools & Resources

- **Figma Library**: [Coming Soon]
- **Storybook**: [Coming Soon]
- **Icon Set**: Lucide Icons (rounded style for warmth)
- **Illustrations**: Biblical-themed when appropriate

## Version History

- **v2.0.0** - Biblical theme implementation
  - Complete amber/gold color system
  - Georgia/Playfair Display for scholarly feel
  - Warm, inviting component library
  - Mobile-first approach maintained
  
- **v1.0.0** - Initial design system launch

---

Built with 📖 for biblical learning and wisdom