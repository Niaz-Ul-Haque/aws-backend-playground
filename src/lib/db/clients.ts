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

/**
 * Get recent clients sorted by created_at (most recent first)
 */
export async function getRecentClients(limit?: number): Promise<Client[]> {
  const clients = await getClients();
  clients.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return limit ? clients.slice(0, limit) : clients;
}

/**
 * Get clients by status
 */
export async function getClientsByStatus(
  status: 'Active' | 'Inactive' | 'Prospect' | 'Dormant'
): Promise<Client[]> {
  return getClients({ client_status: status });
}

/**
 * Get clients by segment
 */
export async function getClientsBySegment(
  segment: 'High Net Worth' | 'Mass Affluent' | 'Retail'
): Promise<Client[]> {
  return getClients({ client_segment: segment });
}

/**
 * Get clients by portfolio value range
 */
export async function getClientsByPortfolioValue(
  min?: number,
  max?: number
): Promise<Client[]> {
  const clients = await getClients();
  return clients.filter((c) => {
    const value = c.portfolio_value || 0;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  });
}

/**
 * Search clients by name, email, or phone
 */
export async function searchClients(query: string): Promise<Client[]> {
  const clients = await getClients();
  const searchTerm = query.toLowerCase();

  return clients.filter((c) =>
    c.first_name.toLowerCase().includes(searchTerm) ||
    c.last_name.toLowerCase().includes(searchTerm) ||
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm) ||
    (c.primary_email && c.primary_email.toLowerCase().includes(searchTerm)) ||
    (c.primary_phone && c.primary_phone.includes(query)) ||
    (c.secondary_email && c.secondary_email.toLowerCase().includes(searchTerm))
  );
}

/**
 * Get top clients by portfolio value
 */
export async function getTopClientsByPortfolio(limit?: number): Promise<Client[]> {
  const clients = await getClients();
  clients.sort((a, b) => (b.portfolio_value || 0) - (a.portfolio_value || 0));
  return limit ? clients.slice(0, limit) : clients;
}

/**
 * Get client counts grouped by status and segment
 */
export async function getClientCount(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySegment: Record<string, number>;
}> {
  const clients = await getClients();

  const byStatus: Record<string, number> = {
    Active: 0,
    Inactive: 0,
    Prospect: 0,
    Dormant: 0,
  };

  const bySegment: Record<string, number> = {
    'High Net Worth': 0,
    'Mass Affluent': 0,
    Retail: 0,
  };

  for (const client of clients) {
    if (client.client_status) {
      byStatus[client.client_status] = (byStatus[client.client_status] || 0) + 1;
    }
    if (client.client_segment) {
      bySegment[client.client_segment] = (bySegment[client.client_segment] || 0) + 1;
    }
  }

  return {
    total: clients.length,
    byStatus,
    bySegment,
  };
}
