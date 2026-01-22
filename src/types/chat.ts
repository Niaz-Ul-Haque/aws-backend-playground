/**
 * Chat Types - For the AI chat interface
 * These types handle messages, cards, and chat context
 */

import type { Client, ClientSummary } from './client';
import type { Policy, PolicySummary } from './policy';
import type { Task, TaskSummary } from './task';

// Message roles
export type MessageRole = 'user' | 'assistant' | 'system';

// Card types that can be embedded in responses
export type CardType =
  | 'task-list'
  | 'task'
  | 'client'
  | 'client-list'
  | 'policy'
  | 'policy-list'
  | 'review'
  | 'confirmation';

/**
 * Task list card data
 */
export interface TaskListCardData {
  title: string;
  tasks: TaskSummary[];
  show_actions?: boolean;
}

/**
 * Single task card data
 */
export interface TaskCardData {
  task: Task;
  show_actions?: boolean;
}

/**
 * Client card data
 */
export interface ClientCardData {
  client: Client | ClientSummary;
  show_policies?: boolean;
  policies?: PolicySummary[];
}

/**
 * Client list card data
 */
export interface ClientListCardData {
  title: string;
  clients: ClientSummary[];
}

/**
 * Policy card data
 */
export interface PolicyCardData {
  policy: Policy | PolicySummary;
  show_claims?: boolean;
}

/**
 * Policy list card data
 */
export interface PolicyListCardData {
  title: string;
  policies: PolicySummary[];
  client_name?: string;
}

/**
 * Review card data - for AI-completed work needing approval
 */
export interface ReviewCardData {
  task: Task;
  title: string;
  message: string;
  generated_content: string;
}

/**
 * Confirmation card data
 */
export interface ConfirmationCardData {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  details?: string;
  undoable?: boolean;
  undo_action?: string;
}

/**
 * Union type for all card data
 */
export type Card =
  | { type: 'task-list'; data: TaskListCardData }
  | { type: 'task'; data: TaskCardData }
  | { type: 'client'; data: ClientCardData }
  | { type: 'client-list'; data: ClientListCardData }
  | { type: 'policy'; data: PolicyCardData }
  | { type: 'policy-list'; data: PolicyListCardData }
  | { type: 'review'; data: ReviewCardData }
  | { type: 'confirmation'; data: ConfirmationCardData };

/**
 * Chat message
 */
export interface Message {
  message_id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  cards?: Card[];
}

/**
 * Chat context - tracks conversation state
 */
export interface ChatContext {
  session_id?: string;
  focused_task_id?: string;
  focused_client_id?: string;
  focused_policy_id?: string;
  last_intent?: string;
  conversation_history?: Message[];
}

/**
 * Chat request from frontend
 */
export interface ChatRequest {
  message: string;
  context?: ChatContext;
  session_id?: string;
}

/**
 * Chat response to frontend
 */
export interface ChatResponse {
  content: string;
  cards?: Card[];
  context?: ChatContext;
  tasks_updated?: boolean;
  error?: string;
}

/**
 * DynamoDB record for chat session
 */
export interface SessionRecord {
  pk: string; // SESSION#<session_id>
  sk: string; // MSG#<timestamp>#<message_id>
  GSI1PK?: string;
  GSI1SK?: string;
  entity_type: 'MESSAGE';
  data: Message;
  ttl?: number; // Auto-expire sessions after X days
}
