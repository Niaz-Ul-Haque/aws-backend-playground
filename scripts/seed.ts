import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand, BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tableName = process.argv[2];

if (!tableName) {
  console.error('Usage: npx tsx scripts/seed.ts <TABLE_NAME>');
  console.error('');
  console.error('Example:');
  console.error('  npx tsx scripts/seed.ts ciri-DataTable-XXXXXX');
  console.error('');
  console.error('You can find your table name in the CloudFormation outputs after deployment.');
  process.exit(1);
}

// DynamoDB record interface matching our single-table design
interface DynamoDBRecord {
  pk: string;
  sk: string;
  GSI1PK: string;
  GSI1SK: string;
  entity_type: string;
  data: Record<string, unknown>;
}

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// DynamoDB BatchWrite supports max 25 items per request
const BATCH_SIZE = 25;

/**
 * Read and parse a JSON seed file
 */
async function loadSeedFile<T>(filename: string): Promise<T[]> {
  const filePath = join(__dirname, '../seed', filename);
  try {
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`⚠ Could not load ${filename}: ${(error as Error).message}`);
    return [];
  }
}

/**
 * Split array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Execute batch write with retry logic for unprocessed items
 */
async function batchWriteWithRetry(
  items: DynamoDBRecord[],
  maxRetries = 3
): Promise<{ success: number; failed: number }> {
  let remainingItems = items;
  let retryCount = 0;
  let successCount = 0;

  while (remainingItems.length > 0 && retryCount < maxRetries) {
    const putRequests = remainingItems.map(item => ({
      PutRequest: { Item: item },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: putRequests,
      },
    });

    const response: BatchWriteCommandOutput = await docClient.send(command);

    // Check for unprocessed items
    const unprocessed = response.UnprocessedItems?.[tableName];
    
    if (!unprocessed || unprocessed.length === 0) {
      successCount += remainingItems.length;
      remainingItems = [];
    } else {
      // Some items were processed
      successCount += remainingItems.length - unprocessed.length;
      remainingItems = unprocessed.map(req => req.PutRequest?.Item as DynamoDBRecord);
      
      // Exponential backoff
      if (remainingItems.length > 0) {
        const delay = Math.pow(2, retryCount) * 100;
        console.log(`  ⏳ Retrying ${remainingItems.length} unprocessed items in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
  }

  return {
    success: successCount,
    failed: remainingItems.length,
  };
}

/**
 * Seed a specific entity type
 */
async function seedEntity(
  filename: string,
  entityType: string
): Promise<{ total: number; success: number; failed: number }> {
  const items = await loadSeedFile<DynamoDBRecord>(filename);
  
  if (items.length === 0) {
    console.log(`⏭ Skipping ${entityType} (no data found)`);
    return { total: 0, success: 0, failed: 0 };
  }

  console.log(`\n📦 Seeding ${items.length} ${entityType}...`);

  const batches = chunk(items, BATCH_SIZE);
  let totalSuccess = 0;
  let totalFailed = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length}: ${batch.length} items... `);
    
    try {
      const result = await batchWriteWithRetry(batch);
      totalSuccess += result.success;
      totalFailed += result.failed;
      
      if (result.failed > 0) {
        console.log(`⚠ ${result.success} succeeded, ${result.failed} failed`);
      } else {
        console.log(`✓`);
      }
    } catch (error) {
      console.log(`✗ Error: ${(error as Error).message}`);
      totalFailed += batch.length;
    }
  }

  return { total: items.length, success: totalSuccess, failed: totalFailed };
}

async function seed(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Ciri AI Assistant - Database Seeder                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget table: ${tableName}`);

  try {
    // Seed all entity types
    const results = await Promise.all([
      seedEntity('clients.json', 'Clients'),
      seedEntity('policies.json', 'Policies'),
      seedEntity('tasks.json', 'Tasks'),
    ]);

    // Print summary
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('                         Summary                              ');
    console.log('══════════════════════════════════════════════════════════════');
    
    const entityNames = ['Clients', 'Policies', 'Tasks'];
    let grandTotal = 0;
    let grandSuccess = 0;
    let grandFailed = 0;

    results.forEach((result, index) => {
      grandTotal += result.total;
      grandSuccess += result.success;
      grandFailed += result.failed;
      
      const status = result.failed === 0 ? '✓' : '⚠';
      console.log(`  ${status} ${entityNames[index].padEnd(12)} ${result.success}/${result.total} items`);
    });

    console.log('──────────────────────────────────────────────────────────────');
    console.log(`  Total: ${grandSuccess}/${grandTotal} items seeded`);

    if (grandFailed > 0) {
      console.log(`\n⚠ Warning: ${grandFailed} items failed to seed.`);
      process.exit(1);
    } else {
      console.log('\n✅ Database seeding completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Set your LLM API key in SSM Parameter Store');
      console.log('  2. Test the /api/health endpoint');
      console.log('  3. Start chatting with Ciri!');
    }
  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

seed();
