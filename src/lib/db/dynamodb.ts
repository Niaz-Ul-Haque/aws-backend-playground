/**
 * DynamoDB Client and Base Operations
 * Provides core database functionality for all entities
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { BaseRecord } from '../../types';

// Initialize DynamoDB client
const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Get table name from environment
export const getTableName = (): string => {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable not set');
  }
  return tableName;
};

/**
 * Get a single item by pk and sk
 */
export async function getItem<T extends BaseRecord>(
  pk: string,
  sk: string
): Promise<T | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk, sk },
    })
  );
  return (result.Item as T) || null;
}

/**
 * Put an item into the table
 */
export async function putItem<T extends BaseRecord>(item: T): Promise<T> {
  await docClient.send(
    new PutCommand({
      TableName: getTableName(),
      Item: item,
    })
  );
  return item;
}

/**
 * Update an item with partial data
 */
export async function updateItem<T extends BaseRecord>(
  pk: string,
  sk: string,
  updates: Partial<T>
): Promise<T | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    if (key !== 'pk' && key !== 'sk' && value !== undefined) {
      const attrName = `#attr${index}`;
      const attrValue = `:val${index}`;
      updateExpressions.push(`${attrName} = ${attrValue}`);
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value;
    }
  });

  if (updateExpressions.length === 0) {
    return getItem<T>(pk, sk);
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { pk, sk },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return (result.Attributes as T) || null;
}

/**
 * Delete an item
 */
export async function deleteItem(pk: string, sk: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { pk, sk },
    })
  );
}

/**
 * Query items by partition key
 */
export async function queryByPk<T extends BaseRecord>(
  pk: string,
  options?: {
    skPrefix?: string;
    limit?: number;
    scanIndexForward?: boolean;
  }
): Promise<T[]> {
  let keyConditionExpression = 'pk = :pk';
  const expressionAttributeValues: Record<string, unknown> = { ':pk': pk };

  if (options?.skPrefix) {
    keyConditionExpression += ' AND begins_with(sk, :skPrefix)';
    expressionAttributeValues[':skPrefix'] = options.skPrefix;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options?.limit,
      ScanIndexForward: options?.scanIndexForward ?? true,
    })
  );

  return (result.Items as T[]) || [];
}

/**
 * Query items using GSI1
 */
export async function queryByGSI1<T extends BaseRecord>(
  gsi1pk: string,
  options?: {
    gsi1skPrefix?: string;
    limit?: number;
    scanIndexForward?: boolean;
  }
): Promise<T[]> {
  let keyConditionExpression = 'GSI1PK = :gsi1pk';
  const expressionAttributeValues: Record<string, unknown> = { ':gsi1pk': gsi1pk };

  if (options?.gsi1skPrefix) {
    keyConditionExpression += ' AND begins_with(GSI1SK, :gsi1skPrefix)';
    expressionAttributeValues[':gsi1skPrefix'] = options.gsi1skPrefix;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: options?.limit,
      ScanIndexForward: options?.scanIndexForward ?? true,
    })
  );

  return (result.Items as T[]) || [];
}

/**
 * Scan all items of a specific entity type
 */
export async function scanByEntityType<T extends BaseRecord>(
  entityType: string,
  limit?: number
): Promise<T[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: getTableName(),
      FilterExpression: 'entity_type = :entityType',
      ExpressionAttributeValues: {
        ':entityType': entityType,
      },
      Limit: limit,
    })
  );

  return (result.Items as T[]) || [];
}

/**
 * Batch write items (for seeding)
 */
export async function batchWriteItems<T extends BaseRecord>(
  items: T[]
): Promise<void> {
  const tableName = getTableName();

  // DynamoDB batch write limit is 25 items
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      })
    );
  }
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}${randomPart}`;
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
