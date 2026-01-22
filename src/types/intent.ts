/**
 * Intent Types - For classifying user messages
 * Used by the AI to understand what the user wants
 */

// All possible user intents
export type UserIntent =
  // Task-related intents
  | 'show_todays_tasks'
  | 'show_all_tasks'
  | 'show_task_status'
  | 'show_pending_reviews'
  | 'approve_task'
  | 'reject_task'
  | 'complete_task'
  | 'create_task'
  // Client-related intents
  | 'show_client_info'
  | 'show_client_list'
  | 'search_clients'
  | 'show_client_policies'
  // Policy-related intents
  | 'show_policy_info'
  | 'show_policies_for_client'
  | 'show_expiring_policies'
  // General intents
  | 'general_question'
  | 'greeting'
  | 'help'
  | 'unknown';

/**
 * Extracted entities from user message
 */
export interface ExtractedEntities {
  // Task entities
  task_id?: string;
  task_title?: string;
  task_status?: string;

  // Client entities
  client_id?: string;
  client_name?: string;

  // Policy entities
  policy_id?: string;
  policy_number?: string;
  policy_type?: string;

  // Time entities
  date?: string;
  time_range?: 'today' | 'week' | 'month' | 'overdue';

  // Action entities
  action?: string;

  // Generic entities
  search_query?: string;
}

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: UserIntent;
  entities: ExtractedEntities;
  confidence: number; // 0-1
  raw_message: string;
}

/**
 * Intent pattern definition
 */
export interface IntentPattern {
  intent: UserIntent;
  patterns: RegExp[];
  entity_extractors?: EntityExtractor[];
}

/**
 * Entity extractor function type
 */
export type EntityExtractor = (message: string) => Partial<ExtractedEntities>;

/**
 * Context resolution result - resolves "it", "that", "this" references
 */
export interface ResolvedContext {
  task_id?: string;
  client_id?: string;
  policy_id?: string;
  resolved_from: 'explicit' | 'context' | 'none';
}
