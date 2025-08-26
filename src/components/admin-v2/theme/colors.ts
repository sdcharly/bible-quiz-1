/**
 * Admin Panel Theme System
 * Security-focused color palette with professional administrative styling
 * Emphasizes authority, security awareness, and clear visual hierarchy
 */

export const adminColors = {
  // Primary Administrative Colors - Authority & Trust
  primary: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    200: 'bg-red-200',
    600: 'bg-red-700',    // Primary admin red
    700: 'bg-red-800',    // Hover states
    800: 'bg-red-900',    // Active states
    text: 'text-red-700',
    hover: 'hover:bg-red-800',
    border: 'border-red-200',
    ring: 'ring-red-500'
  },

  // Accent Colors - Consistency with main app
  accent: {
    50: 'bg-amber-50',
    100: 'bg-amber-100',
    200: 'bg-amber-200',
    500: 'bg-amber-500',
    600: 'bg-amber-600',
    700: 'bg-amber-700',
    text: 'text-amber-600',
    hover: 'hover:bg-amber-700',
    border: 'border-amber-200'
  },

  // Security Status Indicators
  security: {
    safe: 'bg-green-600 text-white',
    caution: 'bg-yellow-600 text-white',
    danger: 'bg-red-600 text-white',
    critical: 'bg-red-800 text-white',
    info: 'bg-blue-600 text-white'
  },

  // Permission Levels
  permission: {
    superAdmin: 'bg-purple-700 text-white',
    admin: 'bg-red-700 text-white',
    manager: 'bg-amber-600 text-white',
    readOnly: 'bg-gray-600 text-white',
    restricted: 'bg-gray-800 text-white'
  },

  // Action Colors
  action: {
    create: 'bg-green-600 hover:bg-green-700',
    update: 'bg-blue-600 hover:bg-blue-700',
    delete: 'bg-red-600 hover:bg-red-700',
    view: 'bg-gray-600 hover:bg-gray-700'
  },

  // Status Colors
  status: {
    active: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    suspended: 'bg-orange-100 text-orange-800 border-orange-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    approved: 'bg-green-100 text-green-800 border-green-200'
  }
};

// Semantic mappings for consistent usage
export const adminTheme = {
  // Page backgrounds
  background: {
    main: 'bg-gray-50 dark:bg-gray-900',
    card: 'bg-white dark:bg-gray-800',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    section: 'bg-white dark:bg-gray-800 border border-red-100 dark:border-gray-700'
  },

  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
    danger: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400'
  },

  // Borders
  border: {
    default: 'border-gray-200 dark:border-gray-700',
    focus: 'border-red-500 dark:border-red-400',
    danger: 'border-red-300 dark:border-red-700',
    success: 'border-green-300 dark:border-green-700'
  },

  // Shadows for depth
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    danger: 'shadow-lg shadow-red-500/20',
    hover: 'hover:shadow-lg transition-shadow'
  }
};

// Button variants for admin actions
export const adminButtonVariants = {
  primary: 'bg-red-700 hover:bg-red-800 text-white shadow-sm',
  secondary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-800',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
  outline: 'border-red-200 hover:bg-red-50 text-red-700 dark:border-red-800 dark:hover:bg-red-900/20'
};

// Security level styling
export const securityLevels = {
  low: {
    badge: 'bg-gray-100 text-gray-800',
    border: 'border-l-4 border-gray-400',
    icon: 'text-gray-500'
  },
  medium: {
    badge: 'bg-yellow-100 text-yellow-800',
    border: 'border-l-4 border-yellow-500',
    icon: 'text-yellow-600'
  },
  high: {
    badge: 'bg-orange-100 text-orange-800',
    border: 'border-l-4 border-orange-500',
    icon: 'text-orange-600'
  },
  critical: {
    badge: 'bg-red-100 text-red-800',
    border: 'border-l-4 border-red-600',
    icon: 'text-red-600'
  }
};