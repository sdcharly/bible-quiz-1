# 📚 SimpleQuiz Design System

> A friendly, modern, and approachable design system for an engaging quiz learning experience

## Quick Start

This design system provides a complete guide for building consistent, delightful UI across the SimpleQuiz application. It emphasizes friendliness, approachability, and modern youthful energy while maintaining excellent usability on all devices.

## Core Philosophy

**"Learning should feel like a conversation with a supportive friend"**

Our design system creates an environment where:
- Students feel encouraged, not intimidated
- Educators feel empowered with modern tools
- Everyone enjoys a smooth, delightful experience
- Mobile users get a first-class experience

## System Structure

### 📖 [PRINCIPLES.md](./PRINCIPLES.md)
Core design principles that guide every decision

### 🎨 [TOKENS.md](./TOKENS.md)
Design tokens including colors, typography, spacing, and more

### 🍳 [COOKBOOK.md](./COOKBOOK.md)
Practical recipes and patterns for common UI scenarios

## Quick Reference

### Brand Colors
- **Primary**: `#3B82F6` (Friendly Blue)
- **Secondary**: `#10B981` (Success Green)
- **Accent**: `#8B5CF6` (Playful Purple)

### Typography
- **Headings**: Plus Jakarta Sans (modern, friendly)
- **Body**: Inter (clean, readable)
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
          50: '#EFF6FF',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
        accent: {
          50: '#F5F3FF',
          500: '#8B5CF6',
          600: '#7C3AED',
        }
      },
      fontFamily: {
        'heading': ['Plus Jakarta Sans', 'system-ui'],
        'body': ['Inter', 'system-ui'],
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
  --color-primary: #3B82F6;
  --color-success: #10B981;
  --color-accent: #8B5CF6;
  
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
- **Icon Set**: Lucide Icons (friendly, rounded style)
- **Illustrations**: Unillustrations (when needed)

## Version History

- **v1.0.0** - Initial design system launch
  - Complete color system with cool, friendly tones
  - Mobile-first component library
  - Accessibility guidelines
  - Typography scale optimized for learning

---

Built with 💙 for learners and educators