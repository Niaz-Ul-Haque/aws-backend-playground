/**
 * Clients Handler - Client CRUD operations
 * 
 * GET /api/clients - List all clients with optional filters
 * GET /api/clients/{id} - Get a specific client
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ClientFilters } from '../types';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  parseQueryParams,
  getRequiredPathParam,
  logRequest,
} from '../lib/utils/response';
import {
  getClients,
  getClientById,
  getClientSummaries,
  getPolicySummariesForClient,
} from '../lib/db';

/**
 * Main clients handler
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || 'UNKNOWN';
  const path = event.requestContext?.http?.path || '/api/clients';

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
    // Check if we have a client ID in the path
    const clientId = getRequiredPathParam(event.pathParameters, 'id');

    if (clientId) {
      // Get single client
      return await handleGetClient(clientId, event.queryStringParameters);
    } else {
      // List clients
      return await handleListClients(event.queryStringParameters);
    }
  } catch (error) {
    console.error('Clients handler error:', error);
    return errorResponse(
      'Failed to process request',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Get a single client by ID
 */
async function handleGetClient(
  clientId: string,
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  const client = await getClientById(clientId);

  if (!client) {
    return notFoundResponse('Client');
  }

  // Check if policies should be included
  const includePolicies = queryParams?.include_policies === 'true';

  if (includePolicies) {
    const policies = await getPolicySummariesForClient(clientId);
    return successResponse({
      client,
      policies,
    });
  }

  return successResponse(client);
}

/**
 * List clients with optional filters
 */
async function handleListClients(
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  const params = parseQueryParams(queryParams);

  // Build filters from query params
  const filters: ClientFilters = {};

  if (params.name) {
    filters.name = params.name;
  }
  if (params.status) {
    filters.client_status = params.status as ClientFilters['client_status'];
  }
  if (params.segment) {
    filters.client_segment = params.segment as ClientFilters['client_segment'];
  }
  if (params.type) {
    filters.client_type = params.type as ClientFilters['client_type'];
  }
  if (params.risk_profile) {
    filters.risk_profile = params.risk_profile as ClientFilters['risk_profile'];
  }
  if (params.account_manager_id) {
    filters.account_manager_id = params.account_manager_id;
  }

  // Check if summary view is requested
  const summary = params.summary === 'true';

  if (summary) {
    const clients = await getClientSummaries(filters);
    return successResponse({
      clients,
      total: clients.length,
    });
  }

  const clients = await getClients(filters);
  return successResponse({
    clients,
    total: clients.length,
  });
}
