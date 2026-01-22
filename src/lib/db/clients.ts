/**
 * Client Database Operations
 */

import {
  getItem,
  putItem,
  updateItem,
  queryByGSI1,
  scanByEntityType,
  generateId,
  getCurrentTimestamp,
} from './dynamodb';
import type {
  Client,
  ClientSummary,
  ClientFilters,
  ClientRecord,
} from '../../types';

const ENTITY_TYPE = 'CLIENT';

/**
 * Build DynamoDB record from Client data
 */
function buildClientRecord(client: Client): ClientRecord {
  return {
    pk: `CLIENT#${client.client_id}`,
    sk: 'PROFILE',
    GSI1PK: 'TYPE#CLIENT',
    GSI1SK: `STATUS#${client.client_status || 'Unknown'}#${client.client_id}`,
    entity_type: ENTITY_TYPE,
    data: client,
  };
}

/**
 * Extract Client data from DynamoDB record
 */
function extractClient(record: ClientRecord): Client {
  return record.data;
}

/**
 * Convert Client to ClientSummary
 */
function toSummary(client: Client): ClientSummary {
  return {
    client_id: client.client_id,
    first_name: client.first_name,
    last_name: client.last_name,
    primary_email: client.primary_email,
    client_status: client.client_status,
    client_segment: client.client_segment,
    portfolio_value: client.portfolio_value,
    risk_profile: client.risk_profile,
    next_meeting: client.next_meeting,
    account_manager_id: client.account_manager_id,
  };
}

/**
 * Get a client by ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  const record = await getItem<ClientRecord>(`CLIENT#${clientId}`, 'PROFILE');
  return record ? extractClient(record) : null;
}

/**
 * Get all clients with optional filters
 */
export async function getClients(filters?: ClientFilters): Promise<Client[]> {
  // For now, scan all clients and filter in memory
  // In production, you'd use GSIs for efficient querying
  const records = await scanByEntityType<ClientRecord>(ENTITY_TYPE);
  let clients = records.map(extractClient);

  // Apply filters
  if (filters) {
    if (filters.name) {
      const searchName = filters.name.toLowerCase();
      clients = clients.filter(
        (c) =>
          c.first_name.toLowerCase().includes(searchName) ||
          c.last_name.toLowerCase().includes(searchName) ||
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchName)
      );
    }
    if (filters.client_status) {
      clients = clients.filter((c) => c.client_status === filters.client_status);
    }
    if (filters.client_segment) {
      clients = clients.filter((c) => c.client_segment === filters.client_segment);
    }
    if (filters.client_type) {
      clients = clients.filter((c) => c.client_type === filters.client_type);
    }
    if (filters.risk_profile) {
      clients = clients.filter((c) => c.risk_profile === filters.risk_profile);
    }
    if (filters.account_manager_id) {
      clients = clients.filter(
        (c) => c.account_manager_id === filters.account_manager_id
      );
    }
  }

  return clients;
}

/**
 * Get client summaries
 */
export async function getClientSummaries(
  filters?: ClientFilters
): Promise<ClientSummary[]> {
  const clients = await getClients(filters);
  return clients.map(toSummary);
}

/**
 * Search clients by name
 */
export async function searchClientsByName(name: string): Promise<Client[]> {
  return getClients({ name });
}

/**
 * Get client by name (first match)
 */
export async function getClientByName(name: string): Promise<Client | null> {
  const clients = await searchClientsByName(name);
  return clients.length > 0 ? clients[0] : null;
}

/**
 * Create a new client
 */
export async function createClient(
  clientData: Omit<Client, 'client_id' | 'created_at' | 'updated_at'>
): Promise<Client> {
  const now = getCurrentTimestamp();
  const client: Client = {
    ...clientData,
    client_id: generateId('C'),
    created_at: now,
    updated_at: now,
  };

  const record = buildClientRecord(client);
  await putItem(record);
  return client;
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  updates: Partial<Client>
): Promise<Client | null> {
  const existing = await getClientById(clientId);
  if (!existing) {
    return null;
  }

  const updatedClient: Client = {
    ...existing,
    ...updates,
    client_id: clientId, // Ensure ID doesn't change
    updated_at: getCurrentTimestamp(),
  };

  const record = buildClientRecord(updatedClient);
  await putItem(record);
  return updatedClient;
}

/**
 * Get clients with upcoming meetings
 */
export async function getClientsWithUpcomingMeetings(): Promise<Client[]> {
  const clients = await getClients();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return clients.filter((c) => {
    if (!c.next_meeting) return false;
    const meetingDate = new Date(c.next_meeting);
    return meetingDate >= now && meetingDate <= weekFromNow;
  });
}

/**
 * Get high net worth clients
 */
export async function getHighNetWorthClients(): Promise<Client[]> {
  return getClients({ client_segment: 'High Net Worth' });
}
