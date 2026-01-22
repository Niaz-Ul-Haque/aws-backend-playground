/**
 * Central type exports
 */

// Client types
export * from './client';

// Policy types
export * from './policy';

// Task types
export * from './task';

// Chat types
export * from './chat';

// Intent types
export * from './intent';

/**
 * Common API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  next_cursor?: string;
  has_more: boolean;
  total?: number;
}

/**
 * DynamoDB base record
 */
export interface BaseRecord {
  pk: string;
  sk: string;
  GSI1PK?: string;
  GSI1SK?: string;
  entity_type: string;
  created_at?: string;
  updated_at?: string;
}
