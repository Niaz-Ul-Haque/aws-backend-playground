import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tableName = process.argv[2];

if (!tableName) {
  console.error('Usage: node scripts/seed.js <TABLE_NAME>');
  process.exit(1);
}

interface SeedItem {
  pk: string;
  title: string;
  description: string;
  createdAt: string;
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function seed(): Promise<void> {
  try {
    // Read seed data
    const itemsPath = join(__dirname, '../seed/items.json');
    const itemsData = await readFile(itemsPath, 'utf-8');
    const items: SeedItem[] = JSON.parse(itemsData);

    console.log(`Seeding ${items.length} items into table: ${tableName}`);

    // Prepare batch write request
    const putRequests = items.map(item => ({
      PutRequest: {
        Item: item
      }
    }));

    // Execute batch write
    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: putRequests
      }
    });

    const response = await docClient.send(command);
    
    if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
      console.warn('Some items were not processed:', response.UnprocessedItems);
    } else {
      console.log('✓ Successfully seeded all items');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
