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
  | 'show_overdue_tasks'
  | 'show_high_priority_tasks'
  | 'show_tasks_this_week'
  | 'show_tasks_this_month'
  | 'show_in_progress_tasks'
  | 'show_completed_tasks'
  | 'approve_task'
  | 'reject_task'
  | 'complete_task'
  | 'create_task'
  // Client-related intents
  | 'show_client_info'
  | 'show_client_list'
  | 'search_clients'
  | 'show_client_policies'
  | 'show_recent_clients'
  | 'show_high_net_worth_clients'
  | 'show_active_clients'
  | 'show_inactive_clients'
  | 'show_prospect_clients'
  | 'show_clients_by_portfolio'
  // Policy-related intents
  | 'show_policy_info'
  | 'show_policies_for_client'
  | 'show_expiring_policies'
  | 'show_expiring_this_week'
  | 'show_expiring_this_month'
  | 'show_policies_by_type'
  | 'show_policies_by_status'
  | 'show_overdue_policies'
  // Analytics/Dashboard intents
  | 'show_dashboard'
  | 'show_task_summary'
  | 'show_client_summary'
  | 'show_policy_summary'
  | 'show_portfolio_summary'
  | 'show_today_summary'
  | 'show_week_summary'
  // Communication intents
  | 'draft_email'
  | 'draft_meeting_notes'
  | 'draft_birthday_message'
  | 'draft_renewal_notice'
  // Document generation intents
  | 'create_compliance_check'
  | 'create_portfolio_analysis'
  | 'create_client_summary'
  | 'create_meeting_prep'
  | 'create_report'
  // Search intents
  | 'global_search'
  | 'search_tasks'
  | 'search_policies'
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
