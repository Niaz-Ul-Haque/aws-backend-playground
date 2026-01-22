/**
 * Policies Handler - Policy operations
 * 
 * GET /api/policies - List all policies with optional filters
 * GET /api/policies/{id} - Get a specific policy
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { PolicyFilters } from '../types';
import { getHttpMethod, getPath, type ApiGatewayEvent } from '../lib/utils/api-gateway';
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
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const method = getHttpMethod(event);
  const path = getPath(event);

  console.log('=== Policies Handler Start ===');
  console.log('Method:', method);
  console.log('Path:', path);
  console.log('Query params:', event.queryStringParameters);
  console.log('Path params:', event.pathParameters);
  logRequest(method, path);

  // Only allow GET
  if (method !== 'GET') {
    console.log('Invalid method, returning 405');
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Check if we have a policy ID in the path
    const policyId = getRequiredPathParam(event.pathParameters, 'id');
    console.log('Policy ID from path:', policyId);

    if (policyId) {
      console.log('Fetching single policy:', policyId);
      const result = await handleGetPolicy(policyId);
      console.log('=== Policies Handler End ===');
      return result;
    } else {
      console.log('Listing policies with filters');
      const result = await handleListPolicies(event.queryStringParameters);
      console.log('=== Policies Handler End ===');
      return result;
    }
  } catch (error) {
    console.error('=== Policies Handler Error ===');
    console.error('Policies handler error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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
  console.log('handleGetPolicy - fetching policy:', policyId);
  const policy = await getPolicyById(policyId);

  if (!policy) {
    console.log('Policy not found:', policyId);
    return notFoundResponse('Policy');
  }

  console.log('Policy found:', policyId);
  return successResponse(policy);
}

/**
 * List policies with optional filters
 */
async function handleListPolicies(
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  console.log('handleListPolicies - query params:', queryParams);
  const params = parseQueryParams(queryParams);

  // Handle special filter cases
  if (params.filter === 'expiring') {
    console.log('Fetching expiring policies');
    const policies = await getExpiringPolicies();
    console.log('Expiring policies count:', policies.length);
    return successResponse({
      policies,
      total: policies.length,
      filter: 'expiring',
    });
  }

  if (params.filter === 'overdue') {
    console.log('Fetching overdue policies');
    const policies = await getOverduePolicies();
    console.log('Overdue policies count:', policies.length);
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

  console.log('Filters:', JSON.stringify(filters));
  // Check if summary view is requested
  const summary = params.summary === 'true';
  console.log('Summary view:', summary);

  if (summary) {
    console.log('Fetching policy summaries');
    const policies = await getPolicySummaries(filters);
    console.log('Policies fetched, count:', policies.length);
    return successResponse({
      policies,
      total: policies.length,
    });
  }

  console.log('Fetching full policies');
  const policies = await getPolicies(filters);
  console.log('Policies fetched, count:', policies.length);
  return successResponse({
    policies,
    total: policies.length,
  });
}
