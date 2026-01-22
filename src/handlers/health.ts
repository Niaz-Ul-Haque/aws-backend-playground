/**
 * Health Check Handler
 * Simple endpoint to verify the API is working
 * 
 * GET /api/health
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getHttpMethod, getPath, type ApiGatewayEvent } from '../lib/utils/api-gateway';
import { successResponse } from '../lib/utils/response';

/**
 * Health check handler
 */
export async function handler(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  console.log('=== Health Check Handler ===');
  console.log('Method:', getHttpMethod(event));
  console.log('Path:', getPath(event));
  
  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ciri-backend',
  };
  
  console.log('Health check response:', response);
  return successResponse(response);
}
