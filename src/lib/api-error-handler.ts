/**
 * Centralized API Error Handler
 * Eliminates duplicate error handling patterns across API routes
 */

import { NextResponse } from "next/server";
import { logger } from "./logger";
import { isFeatureEnabled } from "./feature-flags";

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

export interface ApiErrorOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeStack?: boolean;
  context?: string;
}

/**
 * Standardized error response creator
 */
export function createErrorResponse(
  error: ApiError | Error | string,
  options: ApiErrorOptions = {}
): NextResponse {
  const {
    logLevel = 'error',
    includeStack = false,
    context = 'API'
  } = options;

  // Normalize error to ApiError format
  let apiError: ApiError;
  
  if (typeof error === 'string') {
    apiError = {
      message: error,
      status: 500
    };
  } else if (error instanceof Error) {
    apiError = {
      message: error.message,
      status: 500,
      details: includeStack ? error.stack : undefined
    };
  } else {
    apiError = error;
  }

  // Log error with context
  const logMessage = `[${context}] ${apiError.message}`;
  
  switch (logLevel) {
    case 'debug':
      logger.debug(logMessage, apiError.details);
      break;
    case 'info':
      logger.info(logMessage, apiError.details);
      break;
    case 'warn':
      logger.warn(logMessage, apiError.details);
      break;
    case 'error':
    default:
      logger.error(logMessage, apiError.details);
      break;
  }

  // Prepare response body
  const responseBody: any = {
    error: apiError.message,
    code: apiError.code,
    timestamp: new Date().toISOString()
  };

  // Include details in development or if feature flag enabled
  if (
    process.env.NODE_ENV === 'development' || 
    isFeatureEnabled('DEBUG_PERFORMANCE')
  ) {
    responseBody.details = apiError.details;
    responseBody.context = context;
  }

  return NextResponse.json(responseBody, {
    status: apiError.status,
    headers: {
      'X-Error-Context': context,
      'X-Error-Code': apiError.code || 'UNKNOWN'
    }
  });
}

/**
 * Common API error types
 */
export class ApiErrors {
  static unauthorized(message: string = "Unauthorized"): ApiError {
    return {
      message,
      code: 'UNAUTHORIZED',
      status: 401
    };
  }

  static forbidden(message: string = "Forbidden"): ApiError {
    return {
      message,
      code: 'FORBIDDEN', 
      status: 403
    };
  }

  static notFound(resource: string = "Resource"): ApiError {
    return {
      message: `${resource} not found`,
      code: 'NOT_FOUND',
      status: 404
    };
  }

  static badRequest(message: string = "Bad request"): ApiError {
    return {
      message,
      code: 'BAD_REQUEST',
      status: 400
    };
  }

  static validationError(message: string = "Validation failed"): ApiError {
    return {
      message,
      code: 'VALIDATION_ERROR',
      status: 400
    };
  }

  static tooManyRequests(message: string = "Too many requests"): ApiError {
    return {
      message,
      code: 'RATE_LIMIT',
      status: 429
    };
  }

  static internalError(message: string = "Internal server error"): ApiError {
    return {
      message,
      code: 'INTERNAL_ERROR',
      status: 500
    };
  }

  static databaseError(message: string = "Database operation failed"): ApiError {
    return {
      message,
      code: 'DATABASE_ERROR',
      status: 500
    };
  }

  static timeoutError(message: string = "Request timeout"): ApiError {
    return {
      message,
      code: 'TIMEOUT',
      status: 408
    };
  }
}

/**
 * Wrapper for async API handlers with automatic error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse>,
  context?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error as Error, {
        context: context || 'API Handler',
        includeStack: process.env.NODE_ENV === 'development'
      });
    }
  };
}

/**
 * Authentication check wrapper
 */
export function requireAuth(
  session: any,
  requiredRole?: string
): ApiError | null {
  if (!session?.user) {
    return ApiErrors.unauthorized("Authentication required");
  }

  if (requiredRole && session.user.role !== requiredRole) {
    return ApiErrors.forbidden(`${requiredRole} access required`);
  }

  return null;
}

/**
 * Input validation wrapper
 */
export function validateInput(
  data: any,
  requiredFields: string[]
): ApiError | null {
  const missing = requiredFields.filter(field => 
    !data[field] && data[field] !== 0 && data[field] !== false
  );

  if (missing.length > 0) {
    return ApiErrors.validationError(
      `Missing required fields: ${missing.join(', ')}`
    );
  }

  return null;
}