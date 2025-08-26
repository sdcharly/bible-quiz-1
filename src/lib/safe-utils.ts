// Safe utility functions to prevent null/undefined runtime errors
// These help prevent the "Cannot read properties of null" errors in production

import React from 'react';

export function safeMap<T, U>(
  array: T[] | null | undefined, 
  callback: (item: T, index: number) => U
): U[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  
  return array
    .filter(item => item != null) // Remove null/undefined items
    .map((item, index) => callback(item, index));
}

export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current ?? defaultValue;
}

export function safeAccess<T>(
  obj: any, 
  accessor: (obj: any) => T, 
  defaultValue: T
): T {
  try {
    if (!obj) return defaultValue;
    const result = accessor(obj);
    return result ?? defaultValue;
  } catch (error) {
    // [REMOVED: Console statement for performance]
    return defaultValue;
  }
}

// Enhanced array methods that handle null/undefined gracefully
export const SafeArray = {
  map<T, U>(
    array: T[] | null | undefined, 
    callback: (item: T, index: number) => U
  ): U[] {
    return safeMap(array, callback);
  },
  
  filter<T>(
    array: T[] | null | undefined, 
    predicate: (item: T, index: number) => boolean
  ): T[] {
    if (!array || !Array.isArray(array)) {
      return [];
    }
    return array.filter((item, index) => item != null && predicate(item, index));
  },
  
  find<T>(
    array: T[] | null | undefined, 
    predicate: (item: T, index: number) => boolean
  ): T | undefined {
    if (!array || !Array.isArray(array)) {
      return undefined;
    }
    return array.find((item, index) => item != null && predicate(item, index));
  }
};

// React component safety helpers
export function withErrorBoundary<T extends Record<string, any>>(
  component: React.ComponentType<T>
) {
  const SafeComponent = (props: T) => {
    try {
      return React.createElement(component, props);
    } catch (error) {
      // [REMOVED: Console statement for performance]
      return React.createElement('div', {
        className: 'p-4 text-red-600 border border-red-200 rounded-md'
      }, 'An error occurred while rendering this component.');
    }
  };
  
  SafeComponent.displayName = `Safe(${component.displayName || component.name})`;
  return SafeComponent;
}