/**
 * Clients Handler - Client CRUD operations
 * 
 * GET /api/clients - List all clients with optional filters
 * GET /api/clients/{id} - Get a specific client
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ClientFilters } from '../types';
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
  getClients,
  getClientById,
  getClientSummaries,
  getPolicySummariesForClient,
} from '../lib/db';

/**
 * Main clients handler
 */
export async function handler(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const method = getHttpMethod(event);
  const path = getPath(event);

  console.log('=== Clients Handler Start ===');
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
    // Check if we have a client ID in the path
    const clientId = getRequiredPathParam(event.pathParameters, 'id');
    console.log('Client ID from path:', clientId);

    if (clientId) {
      console.log('Fetching single client:', clientId);
      const result = await handleGetClient(clientId, event.queryStringParameters);
      console.log('=== Clients Handler End ===');
      return result;
    } else {
      console.log('Listing all clients');
      const result = await handleListClients(event.queryStringParameters);
      console.log('=== Clients Handler End ===');
      return result;
    }
  } catch (error) {
    console.error('=== Clients Handler Error ===');
    console.error('Clients handler error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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
  console.log('handleGetClient - fetching client:', clientId);
  const client = await getClientById(clientId);

  if (!client) {
    console.log('Client not found:', clientId);
    return notFoundResponse('Client');
  }

  console.log('Client found:', clientId);
  // Check if policies should be included
  const includePolicies = queryParams?.include_policies === 'true';
  console.log('Include policies:', includePolicies);

  if (includePolicies) {
    console.log('Fetching policies for client:', clientId);
    const policies = await getPolicySummariesForClient(clientId);
    console.log('Policies fetched, count:', policies.length);
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
  console.log('handleListClients - query params:', queryParams);
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

  console.log('Filters:', JSON.stringify(filters));
  // Check if summary view is requested
  const summary = params.summary === 'true';
  console.log('Summary view:', summary);

  if (summary) {
    console.log('Fetching client summaries');
    const clients = await getClientSummaries(filters);
    console.log('Clients fetched, count:', clients.length);
    return successResponse({
      clients,
      total: clients.length,
    });
  }

  console.log('Fetching full clients');
  const clients = await getClients(filters);
  console.log('Clients fetched, count:', clients.length);
  return successResponse({
    clients,
    total: clients.length,
  });
}
