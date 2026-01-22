/**
 * Helpers for API Gateway REST (v1) and HTTP (v2) events.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

export type ApiGatewayEvent = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export function getHttpMethod(event: ApiGatewayEvent): string {
  const v2Method = (event as APIGatewayProxyEventV2).requestContext?.http?.method;
  if (v2Method) {
    return v2Method;
  }

  const v1Method = (event as APIGatewayProxyEvent).httpMethod;
  if (v1Method) {
    return v1Method;
  }

  return 'UNKNOWN';
}

export function getPath(event: ApiGatewayEvent): string {
  const v2Path = (event as APIGatewayProxyEventV2).requestContext?.http?.path;
  if (v2Path) {
    return v2Path;
  }

  const v1Path = (event as APIGatewayProxyEvent).path;
  if (v1Path) {
    return v1Path;
  }

  return '/';
}
