/**
 * Policies Handler - Policy operations
 * 
 * GET /api/policies - List all policies with optional filters
 * GET /api/policies/{id} - Get a specific policy
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { PolicyFilters } from '../types';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  parseQueryParams,
  getRequiredPathParam,
  logRequest,
} from '../lib/utils/response';
import {
  getPolicies,
  getPolicyById,
  getPolicySummaries,
  getExpiringPolicies,
  getOverduePolicies,
} from '../lib/db';

/**
 * Main policies handler
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || 'UNKNOWN';
  const path = event.requestContext?.http?.path || '/api/policies';

  logRequest(method, path);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  // Only allow GET
  if (method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Check if we have a policy ID in the path
    const policyId = getRequiredPathParam(event.pathParameters, 'id');

    if (policyId) {
      // Get single policy
      return await handleGetPolicy(policyId);
    } else {
      // List policies
      return await handleListPolicies(event.queryStringParameters);
    }
  } catch (error) {
    console.error('Policies handler error:', error);
    return errorResponse(
      'Failed to process request',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Get a single policy by ID
 */
async function handleGetPolicy(
  policyId: string
): Promise<APIGatewayProxyResultV2> {
  const policy = await getPolicyById(policyId);

  if (!policy) {
    return notFoundResponse('Policy');
  }

  return successResponse(policy);
}

/**
 * List policies with optional filters
 */
async function handleListPolicies(
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  const params = parseQueryParams(queryParams);

  // Handle special filter cases
  if (params.filter === 'expiring') {
    const policies = await getExpiringPolicies();
    return successResponse({
      policies,
      total: policies.length,
      filter: 'expiring',
    });
  }

  if (params.filter === 'overdue') {
    const policies = await getOverduePolicies();
    return successResponse({
      policies,
      total: policies.length,
      filter: 'overdue',
    });
  }

  // Build filters from query params
  const filters: PolicyFilters = {};

  if (params.client_id) {
    filters.client_id = params.client_id;
  }
  if (params.type) {
    filters.policy_type = params.type as PolicyFilters['policy_type'];
  }
  if (params.status) {
    filters.policy_status = params.status as PolicyFilters['policy_status'];
  }
  if (params.payment_status) {
    filters.payment_status = params.payment_status as PolicyFilters['payment_status'];
  }

  // Check if summary view is requested
  const summary = params.summary === 'true';

  if (summary) {
    const policies = await getPolicySummaries(filters);
    return successResponse({
      policies,
      total: policies.length,
    });
  }

  const policies = await getPolicies(filters);
  return successResponse({
    policies,
    total: policies.length,
  });
}
