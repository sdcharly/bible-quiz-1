/**
 * Student Panel Theme Configuration
 * Consistent with educator panel's amber biblical theme
 */

export const studentTheme = {
  // Primary Colors - Amber (Biblical theme)
  primary: {
    50: "amber-50",
    100: "amber-100",
    200: "amber-200",
    300: "amber-300",
    400: "amber-400",
    500: "amber-500",
    600: "amber-600",
    700: "amber-700",
    800: "amber-800",
    900: "amber-900",
  },
  
  // Success Colors - Green (Quiz completion/passing)
  success: {
    50: "green-50",
    100: "green-100",
    200: "green-200",
    300: "green-300",
    400: "green-400",
    500: "green-500",
    600: "green-600",
    700: "green-700",
    800: "green-800",
    900: "green-900",
  },
  
  // Warning Colors - Yellow (Time warnings, alerts)
  warning: {
    50: "yellow-50",
    100: "yellow-100",
    200: "yellow-200",
    300: "yellow-300",
    400: "yellow-400",
    500: "yellow-500",
    600: "yellow-600",
    700: "yellow-700",
    800: "yellow-800",
    900: "yellow-900",
  },
  
  // Error Colors - Red (Failures, time up)
  error: {
    50: "red-50",
    100: "red-100",
    200: "red-200",
    300: "red-300",
    400: "red-400",
    500: "red-500",
    600: "red-600",
    700: "red-700",
    800: "red-800",
    900: "red-900",
  },
  
  // Neutral Colors - Gray (Text, backgrounds)
  neutral: {
    50: "gray-50",
    100: "gray-100",
    200: "gray-200",
    300: "gray-300",
    400: "gray-400",
    500: "gray-500",
    600: "gray-600",
    700: "gray-700",
    800: "gray-800",
    900: "gray-900",
  }
} as const;

/**
 * Theme utility functions
 */
export const themeUtils = {
  
  /**
   * Get button classes based on variant
   */
  getButtonClasses: (variant: "primary" | "secondary" | "success" | "danger" | "outline") => {
    switch (variant) {
      case "primary":
        return "bg-amber-600 hover:bg-amber-700 text-white";
      case "secondary":
        return "bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-100";
      case "success":
        return "bg-green-600 hover:bg-green-700 text-white";
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "outline":
        return "border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20";
      default:
        return "";
    }
  },
  
  /**
   * Get badge/tag classes based on type
   */
  getBadgeClasses: (type: "default" | "success" | "warning" | "error" | "info") => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "error":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300";
      case "info":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  },
  
  /**
   * Get card hover classes
   */
  getCardHoverClasses: () => {
    return "hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-200";
  },
  
  /**
   * Get input focus classes
   */
  getInputFocusClasses: () => {
    return "focus:ring-amber-500 focus:border-amber-500 dark:focus:ring-amber-400 dark:focus:border-amber-400";
  }
};

/**
 * Common theme patterns for consistency
 */
export const themePatterns = {
  // Page gradient background
  pageGradient: "bg-gradient-to-b from-amber-50/50 to-white dark:from-gray-900 dark:to-gray-950",
  
  // Card styles
  card: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/20",
  
  // Section divider
  divider: "border-b border-amber-100 dark:border-amber-900/20",
  
  // Interactive element hover
  interactiveHover: "hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
  
  // Focus ring for accessibility
  focusRing: "focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-amber-400 dark:focus:ring-offset-gray-900",
  
  // Text colors
  text: {
    primary: "text-gray-900 dark:text-white",
    secondary: "text-gray-600 dark:text-gray-400",
    muted: "text-gray-500 dark:text-gray-500",
    link: "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300",
  }
};