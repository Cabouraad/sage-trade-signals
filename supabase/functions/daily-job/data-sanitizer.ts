
/**
 * Utility functions for sanitizing data and preventing circular reference errors
 */

export function sanitizeData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle dates
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeData(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Avoid circular references by tracking visited objects
    return sanitizeObject(obj, new WeakSet());
  }

  // For functions, symbols, etc., return undefined
  return undefined;
}

function sanitizeObject(obj: any, visited: WeakSet<object>): any {
  // Check for circular reference
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }

  visited.add(obj);

  const sanitized: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      // Skip React fiber properties and DOM elements
      if (key.startsWith('_react') || 
          key.startsWith('__react') || 
          key === 'nativeEvent' ||
          (typeof value === 'object' && value && value.nodeType)) {
        continue;
      }

      // Skip functions unless they're needed
      if (typeof value === 'function') {
        continue;
      }

      sanitized[key] = sanitizeData(value);
    }
  }

  visited.delete(obj);
  return sanitized;
}

export function safeStringify(obj: any): string {
  try {
    const sanitized = sanitizeData(obj);
    return JSON.stringify(sanitized);
  } catch (error) {
    console.error('Failed to stringify object:', error);
    return JSON.stringify({ error: 'Failed to serialize object', message: error.message });
  }
}

export function createCleanResult(symbol: string, success: boolean, data?: any, error?: string) {
  return {
    symbol: String(symbol),
    success: Boolean(success),
    data: data ? sanitizeData(data) : undefined,
    error: error ? String(error) : undefined
  };
}
