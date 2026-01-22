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
  console.log('=== Health Check Handler ===');
  console.log('Method:', event.requestContext?.http?.method);
  console.log('Path:', event.requestContext?.http?.path);
  
  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'ciri-backend',
  };
  
  console.log('Health check response:', response);
  return successResponse(response);
}
