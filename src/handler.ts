import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  const method = event.requestContext?.http?.method || 'UNKNOWN';
  const path = event.requestContext?.http?.path || '/';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'hello world',
      method,
      path,
    }),
  };
};
