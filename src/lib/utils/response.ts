/**
 * Utility functions for API responses and common operations
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ApiResponse } from '../../types';

/**
 * Response headers with CORS support
 */
const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
};

/**
 * Create a successful JSON response
 */
export function successResponse<T>(
  data: T,
  statusCode = 200
): APIGatewayProxyResultV2 {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };

  return {
    statusCode,
    headers: {
      ...RESPONSE_HEADERS,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  message: string,
  statusCode = 400,
  details?: string
): APIGatewayProxyResultV2 {
  const body: ApiResponse = {
    success: false,
    error: message,
    message: details,
  };

  return {
    statusCode,
    headers: {
      ...RESPONSE_HEADERS,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Create a not found response
 */
export function notFoundResponse(
  resource = 'Resource'
): APIGatewayProxyResultV2 {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Parse JSON body from request
 */
export function parseBody<T>(body: string | undefined): T | null {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}

/**
 * Parse query string parameters
 */
export function parseQueryParams(
  queryStringParameters?: Record<string, string | undefined>
): Record<string, string> {
  const params: Record<string, string> = {};

  if (queryStringParameters) {
    for (const [key, value] of Object.entries(queryStringParameters)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }
  }

  return params;
}

/**
 * Parse path parameters
 */
export function parsePathParams(
  pathParameters?: Record<string, string | undefined>
): Record<string, string> {
  const params: Record<string, string> = {};

  if (pathParameters) {
    for (const [key, value] of Object.entries(pathParameters)) {
      if (value !== undefined) {
        params[key] = value;
      }
    }
  }

  return params;
}

/**
 * Get a required path parameter
 */
export function getRequiredPathParam(
  pathParameters: Record<string, string | undefined> | undefined,
  paramName: string
): string | null {
  const value = pathParameters?.[paramName];
  return value || null;
}

/**
 * Validate required fields in a request body
 */
export function validateRequired<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missing.push(field as string);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Log request details (for debugging)
 */
export function logRequest(
  method: string,
  path: string,
  body?: unknown
): void {
  console.log('='.repeat(50));
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);
  if (body) {
    console.log('Body:', JSON.stringify(body, null, 2));
  }
  console.log('='.repeat(50));
}
