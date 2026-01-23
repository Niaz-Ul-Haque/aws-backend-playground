/**
 * Search Module
 * Provides unified search capabilities across tasks, clients, and policies
 */

import { searchTasks } from './tasks';
import { searchClients } from './clients';
import { searchPolicies } from './policies';
import type { Task, Client, Policy } from '../../types';

/**
 * Combined search results interface
 */
export interface SearchResults {
  tasks: Task[];
  clients: Client[];
  policies: Policy[];
}

/**
 * Global search across all entities
 * Searches tasks, clients, and policies and returns combined results
 */
export async function globalSearch(query: string): Promise<SearchResults> {
  const [tasks, clients, policies] = await Promise.all([
    searchTasks(query),
    searchClients(query),
    searchPolicies(query),
  ]);

  return {
    tasks,
    clients,
    policies,
  };
}
