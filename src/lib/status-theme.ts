/**
 * Centralized Status Theme Configuration
 * This file defines the color scheme for different status types across the application
 * Following the biblical amber/orange theme while ensuring visual hierarchy and accessibility
 */

export const statusTheme = {
  quiz: {
    published: {
      label: 'Active',
      icon: 'CheckCircleIcon',
      colors: {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-400',
        hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dot: 'bg-emerald-500'
      }
    },
    draft: {
      label: 'Draft',
      icon: 'PencilSquareIcon',
      colors: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dot: 'bg-amber-500'
      }
    },
    archived: {
      label: 'Resting',
      icon: 'ArchiveBoxIcon',
      colors: {
        bg: 'bg-gray-100 dark:bg-gray-800/50',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
        hover: 'hover:bg-gray-200 dark:hover:bg-gray-800',
        badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
        dot: 'bg-gray-400'
      }
    },
    scheduled: {
      label: 'Scheduled',
      icon: 'ClockIcon',
      colors: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        dot: 'bg-blue-500'
      }
    }
  },
  enrollment: {
    enrolled: {
      label: 'Not Started',
      icon: 'UserPlusIcon',
      colors: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
        badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        dot: 'bg-amber-400'
      }
    },
    in_progress: {
      label: 'In Progress',
      icon: 'ArrowPathIcon',
      colors: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        border: 'border-yellow-200 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-400',
        hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
        badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        dot: 'bg-yellow-500'
      }
    },
    completed: {
      label: 'Completed',
      icon: 'CheckCircleIcon',
      colors: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        hover: 'hover:bg-green-200 dark:hover:bg-green-900/50',
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        dot: 'bg-green-500'
      }
    },
    abandoned: {
      label: 'Abandoned',
      icon: 'XCircleIcon',
      colors: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        hover: 'hover:bg-red-200 dark:hover:bg-red-900/50',
        badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        dot: 'bg-red-500'
      }
    }
  },
  student: {
    active: {
      label: 'Active',
      icon: 'UserCheckIcon',
      colors: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
        badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        dot: 'bg-emerald-500'
      }
    },
    inactive: {
      label: 'Inactive',
      icon: 'UserXIcon',
      colors: {
        bg: 'bg-gray-50 dark:bg-gray-800/30',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-500 dark:text-gray-400',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-800/50',
        badge: 'bg-gray-50 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
        dot: 'bg-gray-400'
      }
    },
    pending: {
      label: 'Pending',
      icon: 'ClockIcon',
      colors: {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-600 dark:text-orange-400',
        hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
        badge: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        dot: 'bg-orange-500'
      }
    }
  },
  educator: {
    approved: {
      label: 'Approved',
      icon: 'CheckBadgeIcon',
      colors: {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-600 dark:text-emerald-400',
        hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
        badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        dot: 'bg-emerald-500'
      }
    },
    pending: {
      label: 'Pending Review',
      icon: 'ClockIcon',
      colors: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-600 dark:text-amber-400',
        hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
        badge: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        dot: 'bg-amber-500'
      }
    },
    rejected: {
      label: 'Rejected',
      icon: 'XCircleIcon',
      colors: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
        badge: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        dot: 'bg-red-500'
      }
    },
    suspended: {
      label: 'Suspended',
      icon: 'NoSymbolIcon',
      colors: {
        bg: 'bg-gray-50 dark:bg-gray-800/30',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-500 dark:text-gray-400',
        hover: 'hover:bg-gray-100 dark:hover:bg-gray-800/50',
        badge: 'bg-gray-50 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
        dot: 'bg-gray-400'
      }
    }
  },
  document: {
    ready: {
      label: 'Ready',
      icon: 'DocumentCheckIcon',
      colors: {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-600 dark:text-green-400',
        hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
        badge: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        dot: 'bg-green-500'
      }
    },
    processing: {
      label: 'Processing',
      icon: 'ArrowPathIcon',
      colors: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
        badge: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        dot: 'bg-blue-500'
      }
    },
    failed: {
      label: 'Failed',
      icon: 'ExclamationTriangleIcon',
      colors: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
        badge: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        dot: 'bg-red-500'
      }
    }
  }
};

/**
 * Helper function to get status configuration
 * @param type - The type of status (quiz, enrollment, student, educator, document)
 * @param status - The specific status value
 * @returns The status configuration object
 */
export function getStatusConfig(type: keyof typeof statusTheme, status: string) {
  const typeConfig = statusTheme[type];
  const normalizedStatus = status.toLowerCase().replace(/-/g, '_');
  
  // Check for exact match
  if (typeConfig[normalizedStatus as keyof typeof typeConfig]) {
    return typeConfig[normalizedStatus as keyof typeof typeConfig];
  }
  
  // Fallback to a default gray theme if status not found
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    icon: 'InformationCircleIcon',
    colors: {
      bg: 'bg-gray-100 dark:bg-gray-800/50',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-600 dark:text-gray-400',
      hover: 'hover:bg-gray-200 dark:hover:bg-gray-800',
      badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
      dot: 'bg-gray-400'
    }
  };
}

/**
 * Get appropriate background gradient for cards based on status
 */
export function getStatusGradient(type: keyof typeof statusTheme, status: string) {
  const config = getStatusConfig(type, status);
  
  const gradients = {
    'bg-emerald-100': 'bg-gradient-to-r from-emerald-50 to-green-50',
    'bg-amber-100': 'bg-gradient-to-r from-amber-50 to-orange-50',
    'bg-gray-100': 'bg-gradient-to-r from-gray-50 to-slate-50',
    'bg-blue-100': 'bg-gradient-to-r from-blue-50 to-indigo-50',
    'bg-yellow-100': 'bg-gradient-to-r from-yellow-50 to-amber-50',
    'bg-green-100': 'bg-gradient-to-r from-green-50 to-emerald-50',
    'bg-red-100': 'bg-gradient-to-r from-red-50 to-pink-50',
    'bg-orange-50': 'bg-gradient-to-r from-orange-50 to-amber-50',
    'bg-emerald-50': 'bg-gradient-to-r from-emerald-50 to-teal-50',
    'bg-green-50': 'bg-gradient-to-r from-green-50 to-lime-50',
    'bg-blue-50': 'bg-gradient-to-r from-blue-50 to-sky-50',
    'bg-red-50': 'bg-gradient-to-r from-red-50 to-rose-50',
    'bg-gray-50': 'bg-gradient-to-r from-gray-50 to-zinc-50'
  };
  
  const bgClass = config.colors.bg.split(' ')[0];
  return gradients[bgClass as keyof typeof gradients] || 'bg-gradient-to-r from-gray-50 to-slate-50';
}