/**
 * Application branding configuration
 * Centralizes all branding elements to use environment variables
 */

export const branding = {
  // App name and tagline
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Scrolls of Wisdom',
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE || 'Your Biblical Knowledge Quest',
  
  // Support and contact
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@biblequiz.textr.in',
  
  // Email branding
  getEmailFromHeader: () => {
    const fromName = process.env.EMAIL_FROM ? 
      process.env.EMAIL_FROM : 
      `"${branding.appName}" <noreply@biblequiz.textr.in>`;
    return fromName;
  },
  
  // Copyright footer
  getCopyrightText: () => {
    const currentYear = new Date().getFullYear();
    return `© ${currentYear} ${branding.appName} · Empowering Biblical Education`;
  },
  
  // Email footers
  getEmailFooter: () => {
    const currentYear = new Date().getFullYear();
    return `${branding.appName} - ${branding.tagline}`;
  },
  
  // App URLs
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://biblequiz.textr.in',
  
  // Get full app URL with path
  getAppUrl: (path: string = '') => {
    const baseUrl = branding.appUrl.replace(/\/+$/, ''); // Remove trailing slashes
    const cleanPath = path.replace(/^\/+/, ''); // Remove leading slashes
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
  }
} as const;

export default branding;