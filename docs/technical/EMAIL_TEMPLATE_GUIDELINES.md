# Email Template Guidelines

## Overview
This document outlines the best practices and standards for creating HTML email templates in the Scrolls of Wisdom application. These guidelines ensure maximum compatibility across all email clients including Gmail, Outlook, Yahoo Mail, and mobile apps.

## Core Principles

### 1. Table-Based Layout
**Always use tables for layout structure, NOT divs**
- Tables provide the most consistent rendering across email clients
- Outlook specifically has poor support for div-based layouts
- Use nested tables for complex layouts

### 2. Inline CSS Only
**All styles must be inline on each element**
- Many email clients strip out `<style>` tags
- Inline CSS ensures styles are preserved
- Use the `style` attribute directly on HTML elements

### 3. Fallback Colors
**Always provide solid color fallbacks for gradients**
```html
<!-- Good: Has both bgcolor attribute and background-color style -->
<td bgcolor="#f59e0b" style="background-color: #f59e0b;">
```

### 4. Show Link URLs
**Always display the actual URL below buttons**
```html
<a href="${url}" style="...">Click Here</a>
<!-- Also include: -->
<p>Or copy and paste this link: ${url}</p>
```

## Template Structure

### Use the Helper Function
We have a `createEmailWrapper` helper that provides the standard structure:

```typescript
const createEmailWrapper = (headerContent: string, bodyContent: string, footerContent: string) => {
  // Returns a complete HTML email with proper table structure
}
```

### Basic Template Pattern
```typescript
const emailTemplate = (params) => {
  const headerContent = `
    <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">
      Title Here
    </h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">
      Subtitle Here
    </p>
  `;

  const bodyContent = `
    <!-- All content with inline styles -->
  `;

  const footerContent = `
    <p style="margin: 5px 0; color: #78350f;">Footer text</p>
  `;

  return createEmailWrapper(headerContent, bodyContent, footerContent);
};
```

## Color Palette (Biblical Theme)

### Primary Colors
- **Primary Amber**: `#f59e0b` (buttons, headers, emphasis)
- **Dark Amber**: `#d97706` (borders, secondary elements)
- **Light Background**: `#fffbeb` (content background)
- **Lightest Background**: `#fef3c7` (footer, info boxes)

### Text Colors
- **Dark Text**: `#451a03` (main body text)
- **Medium Text**: `#78350f` (secondary text)
- **Accent Text**: `#92400e` (headings, important text)
- **Warning Text**: `#b45309` (italics, notes)

### Typography
- **Headings**: `font-family: Georgia, 'Times New Roman', serif;`
- **Body Text**: `font-family: Georgia, 'Times New Roman', serif;`
- Always specify fallback fonts

## HTML Email Best Practices

### 1. Meta Tags
```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 2. Outlook Conditional Comments
```html
<!--[if mso]>
<noscript>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
</noscript>
<![endif]-->
```

### 3. Table Attributes
```html
<table cellpadding="0" cellspacing="0" border="0" width="100%">
```

### 4. Image Best Practices
- Always include alt text
- Use absolute URLs
- Specify width and height
- Consider that images may be blocked by default

### 5. Button Structure
```html
<div style="text-align: center; margin: 25px 0;">
  <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
    Button Text
  </a>
</div>
```

### 6. Scripture/Quote Boxes
```html
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
  <tr>
    <td style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px;">
      <p style="margin: 0; color: #78350f; font-style: italic;">
        Quote text here
      </p>
    </td>
  </tr>
</table>
```

## Compatibility Guidelines

### Avoid These CSS Properties
- `display: flex` - Poor support
- `position: absolute/fixed` - Not supported
- CSS Grid - Not supported
- `box-shadow` - Limited support
- Complex selectors - Use inline styles instead
- CSS animations - Not supported

### Safe CSS Properties
- `background-color`
- `color`
- `font-family`, `font-size`, `font-weight`
- `margin`, `padding` (use on `<td>` for Outlook)
- `text-align`
- `border` (simple borders only)
- `width`, `height` (use on tables)

## Testing Checklist

Before deploying any email template:

- [ ] Test in Gmail (web and mobile)
- [ ] Test in Outlook (2016, 2019, Office 365)
- [ ] Test in Apple Mail
- [ ] Test in Yahoo Mail
- [ ] Test on mobile devices (iOS Mail, Gmail app)
- [ ] Verify images have alt text
- [ ] Check that links are absolute URLs
- [ ] Ensure fallback colors are in place
- [ ] Verify text is readable with images disabled
- [ ] Check that the plain text version is included

## Common Issues and Solutions

### Issue: Gradient not showing in Outlook
**Solution**: Use `bgcolor` attribute with solid fallback color

### Issue: Layout breaks in Outlook
**Solution**: Use tables instead of divs, add MSO conditional comments

### Issue: Fonts not rendering correctly
**Solution**: Always specify fallback fonts, use web-safe fonts

### Issue: Buttons not clickable on mobile
**Solution**: Ensure adequate padding and use `display: inline-block`

### Issue: Images blocked by default
**Solution**: Use alt text, ensure design works without images

## Example: Complete Email Template

```typescript
export const sampleEmailTemplate = (userName: string, actionUrl: string) => {
  const subject = `Welcome to Scrolls of Wisdom, ${userName}!`;
  
  const headerContent = `
    <h1 style="margin: 0; font-size: 28px; color: white; font-family: Georgia, 'Times New Roman', serif;">
      📜 Welcome to Scrolls of Wisdom!
    </h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; color: white;">
      Your Biblical Journey Begins
    </p>
  `;

  const bodyContent = `
    <h2 style="color: #92400e; font-size: 24px; margin-top: 0; font-family: Georgia, 'Times New Roman', serif;">
      Greetings, ${userName}!
    </h2>
    
    <p style="color: #451a03; margin: 15px 0;">
      Your account has been created successfully.
    </p>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${actionUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
        Get Started
      </a>
    </div>
    
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #fef3c7; padding: 10px; border-radius: 4px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Or copy and paste this link:</strong><br>
            <span style="color: #78350f; word-break: break-all;">${actionUrl}</span>
          </p>
        </td>
      </tr>
    </table>
  `;

  const footerContent = `
    <p style="margin: 5px 0; color: #78350f;">
      © 2024 Scrolls of Wisdom
    </p>
  `;

  const html = createEmailWrapper(headerContent, bodyContent, footerContent);
  
  const text = `
Welcome ${userName}!

Your account has been created successfully.

Get started at: ${actionUrl}

© 2024 Scrolls of Wisdom
  `;
  
  return { subject, html, text };
};
```

## References
- [Campaign Monitor CSS Support Guide](https://www.campaignmonitor.com/css/)
- [Can I Email](https://www.caniemail.com/)
- [Litmus Email Testing](https://www.litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)

## Maintenance
This document should be updated whenever:
- New email clients emerge with different rendering engines
- Existing email clients update their rendering capabilities
- New templates are added to the system
- Issues are discovered with existing templates