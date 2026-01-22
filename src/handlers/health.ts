/**
 * Health Check Handler
 * Simple endpoint to verify the API is working
 * 
 * GET /api/health
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { successResponse } from '../lib/utils/response';

/**
 * Health check handler
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  return successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ciri-backend',
  });
}
