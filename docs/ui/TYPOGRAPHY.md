# Typography Guidelines - Biblical Theme

## Font Philosophy

Our typography system combines **scholarly tradition** with **modern readability** to create an experience that feels both authoritative and approachable.

## Font Families

### Primary Font Stack

#### Headings (Serif - Scholarly Authority)
```css
font-family: Georgia, Cambria, 'Times New Roman', serif;
```
- **Georgia**: Primary heading font - warm, readable serif
- **Cambria**: Modern serif alternative (Windows)
- **Times New Roman**: Universal fallback
- **Purpose**: Evokes biblical scholarship, traditional texts, authority

#### Body Text (Sans-serif - Modern Readability)
```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```
- **Inter**: Primary body font - optimized for screens
- **System fonts**: Native performance and familiarity
- **Purpose**: Maximum readability for learning content

#### UI Elements (System Stack)
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
```
- **Purpose**: Native UI consistency across platforms

## Typography Scale

### Desktop Sizes
```scss
// Headings (Georgia)
.text-hero    { font-size: 3rem; line-height: 1.2; }     // 48px - Hero sections
.text-h1      { font-size: 2.25rem; line-height: 1.25; } // 36px - Page titles
.text-h2      { font-size: 1.875rem; line-height: 1.3; } // 30px - Section headers
.text-h3      { font-size: 1.5rem; line-height: 1.4; }   // 24px - Subsections
.text-h4      { font-size: 1.25rem; line-height: 1.5; }  // 20px - Card titles

// Body Text (Inter)
.text-lg      { font-size: 1.125rem; line-height: 1.75; } // 18px - Lead text
.text-base    { font-size: 1rem; line-height: 1.75; }     // 16px - Body text
.text-sm      { font-size: 0.875rem; line-height: 1.5; }  // 14px - Secondary
.text-xs      { font-size: 0.75rem; line-height: 1.5; }   // 12px - Captions
```

### Mobile Sizes (Responsive)
```scss
@media (max-width: 640px) {
  .text-hero { font-size: 2.25rem; }  // 36px
  .text-h1   { font-size: 1.875rem; } // 30px
  .text-h2   { font-size: 1.5rem; }   // 24px
  .text-h3   { font-size: 1.25rem; }  // 20px
}
```

## Font Weights

### Georgia (Headings)
- **400 (Normal)**: Subheadings, quotes
- **600 (Semi-bold)**: Standard headings
- **700 (Bold)**: Emphasis, hero text

### Inter (Body)
- **400 (Regular)**: Body text
- **500 (Medium)**: UI labels, buttons
- **600 (Semi-bold)**: Important text
- **700 (Bold)**: Inline emphasis

## Usage Guidelines

### When to Use Each Font

#### Use Georgia for:
- ✅ Page titles and hero text
- ✅ Section headings (h1-h6)
- ✅ Biblical quotes and verses
- ✅ Testimonials
- ✅ Important callouts
- ✅ Certificate/achievement text

#### Use Inter for:
- ✅ Body paragraphs
- ✅ Form labels and inputs
- ✅ Navigation menus
- ✅ Buttons and CTAs
- ✅ Data tables
- ✅ Lists and descriptions
- ✅ Help text and instructions

#### Never:
- ❌ Use Georgia for long body text (hard to read)
- ❌ Use Georgia for UI elements (looks dated)
- ❌ Mix serif fonts within the same hierarchy
- ❌ Use decorative fonts

## Implementation Examples

### React/Tailwind Classes

```jsx
// Page Title
<h1 className="font-heading text-4xl font-bold text-amber-900">
  Biblical Knowledge Assessment
</h1>

// Section Header
<h2 className="font-heading text-2xl font-semibold text-amber-800">
  Choose Your Testament
</h2>

// Body Paragraph
<p className="font-body text-base text-gray-700 leading-relaxed">
  Embark on a journey through ancient wisdom...
</p>

// Button
<button className="font-body font-medium text-sm">
  Start Quiz
</button>

// Form Label
<label className="font-body text-sm font-medium text-gray-700">
  Your Name
</label>
```

### CSS Implementation

```css
/* Base styles in globals.css */
h1, h2, h3, h4, h5, h6 {
  font-family: Georgia, Cambria, 'Times New Roman', serif;
  font-weight: 600;
  color: var(--color-heading);
}

body {
  font-family: Inter, -apple-system, system-ui, sans-serif;
  font-weight: 400;
  line-height: 1.75;
  color: var(--color-text);
}

.font-heading {
  font-family: Georgia, Cambria, 'Times New Roman', serif;
}

.font-body {
  font-family: Inter, -apple-system, system-ui, sans-serif;
}
```

## Special Use Cases

### Biblical Quotes
```jsx
<blockquote className="font-heading text-lg italic text-amber-700 border-l-4 border-amber-500 pl-4">
  "For wisdom is better than rubies..."
  <cite className="block font-body text-sm not-italic mt-2 text-gray-600">
    - Proverbs 8:11
  </cite>
</blockquote>
```

### Quiz Questions
```jsx
<div className="quiz-question">
  <h3 className="font-heading text-xl mb-4">
    Question 1: The First Commandment
  </h3>
  <p className="font-body text-base mb-6">
    What did God command on the first day of creation?
  </p>
</div>
```

### Data Tables
```jsx
<table>
  <thead>
    <tr>
      <th className="font-body font-semibold text-sm uppercase">Student</th>
      <th className="font-body font-semibold text-sm uppercase">Score</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="font-body text-base">John Doe</td>
      <td className="font-body text-base">85%</td>
    </tr>
  </tbody>
</table>
```

## Accessibility Considerations

1. **Contrast Ratios**
   - Headings (Georgia): Minimum 3:1 against background
   - Body text (Inter): Minimum 4.5:1 against background

2. **Font Sizes**
   - Minimum body text: 16px (1rem)
   - Minimum interactive text: 14px (0.875rem)

3. **Line Height**
   - Body text: 1.5-1.75 for optimal readability
   - Headings: 1.2-1.4 for compact display

4. **Letter Spacing**
   - Default for both fonts (no adjustment needed)
   - Avoid negative letter-spacing

## Font Loading Strategy

```html
<!-- Preconnect to Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Load Inter from Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Georgia is a system font, no loading needed -->
```

## Common Pitfalls to Avoid

1. **Don't use Georgia for:**
   - Form inputs (use Inter)
   - Small text under 14px (poor readability)
   - Dense data tables (use Inter)

2. **Don't mix fonts randomly:**
   - Stick to the defined hierarchy
   - Don't introduce new fonts without purpose

3. **Don't ignore hierarchy:**
   - Maintain consistent sizing relationships
   - Use weight and color for emphasis, not just size

## Summary

- **Georgia**: Headers, titles, biblical quotes (scholarly authority)
- **Inter**: Body text, UI elements, forms (modern readability)
- **Consistent hierarchy**: Clear visual structure
- **Responsive sizing**: Optimized for all devices
- **Accessibility first**: Always maintain proper contrast and sizing