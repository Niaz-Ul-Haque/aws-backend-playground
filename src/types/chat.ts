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

// ============================================================
// Phase 1 Card Types
// ============================================================

/**
 * Email composer card data - for drafting/sending emails
 */
export interface EmailComposerCardData {
  email_id?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: Array<{
    name: string;
    url?: string;
    size?: number;
  }>;
  template_id?: string;
  template_name?: string;
  editable?: boolean;
  related_task_id?: string;
  related_client_id?: string;
  available_actions?: ('send' | 'save_draft' | 'copy' | 'discard')[];
}

/**
 * Data table card data - for tabular displays
 */
export interface DataTableCardData {
  title?: string;
  description?: string;
  columns: Array<{
    key: string;
    header: string;
    sortable?: boolean;
    width?: string;
    format?: 'text' | 'number' | 'currency' | 'date' | 'percent' | 'status';
  }>;
  rows: Record<string, unknown>[];
  sortable?: boolean;
  filterable?: boolean;
  pageSize?: number;
  exportable?: boolean;
  available_actions?: ('export' | 'filter' | 'sort')[];
}

/**
 * Chart card data - for data visualizations
 */
export interface ChartCardData {
  title?: string;
  description?: string;
  chart_type: 'line' | 'bar' | 'pie' | 'donut';
  data: Array<{
    name: string;
    value: number;
    [key: string]: string | number;
  }>;
  x_axis_key?: string;
  y_axis_key?: string;
  series?: Array<{
    key: string;
    name?: string;
    color?: string;
  }>;
  show_legend?: boolean;
  show_grid?: boolean;
  height?: number;
  time_periods?: string[];
  selected_period?: string;
  center_label?: string;
  center_value?: string | number;
}

/**
 * Compliance check card data - for KYC/compliance reviews
 */
export interface ComplianceCheckCardData {
  title: string;
  client_id?: string;
  client_name?: string;
  check_date: string;
  overall_score: number;
  items: Array<{
    id: string;
    label: string;
    status: 'pass' | 'fail' | 'warning' | 'pending';
    description?: string;
    details?: string;
    remediation?: string;
  }>;
  summary?: string;
  available_actions?: ('resolve' | 'schedule_review' | 'generate_report' | 'escalate')[];
}

// ============================================================
// Phase 2 Card Types
// ============================================================

/**
 * Proposal card data - for insurance/product proposals
 */
export interface ProposalCardData {
  proposal_id: string;
  title: string;
  client_id?: string;
  client_name?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_date: string;
  valid_until?: string;
  total_premium?: number;
  premium_frequency?: string;
  products: Array<{
    id: string;
    name: string;
    type: string;
    coverage_amount?: number;
    premium: number;
    premium_frequency: string;
    features?: string[];
    description?: string;
  }>;
  summary?: string;
  notes?: string;
  available_actions?: ('send' | 'edit' | 'copy' | 'delete')[];
}

/**
 * Comparison card data - for comparing products/policies
 */
export interface ComparisonCardData {
  title: string;
  description?: string;
  options: Array<{
    id: string;
    name: string;
    highlighted?: boolean;
    image_url?: string;
    price?: number;
    price_label?: string;
    attributes: Record<string, string | number | boolean>;
  }>;
  attributes_config?: Array<{
    key: string;
    label: string;
    format?: 'text' | 'currency' | 'number' | 'boolean' | 'percent';
    highlight_max?: boolean;
    highlight_min?: boolean;
  }>;
  recommendation?: {
    option_id: string;
    reason: string;
  };
  available_actions?: ('select' | 'get_quote' | 'compare_more')[];
}

/**
 * Dashboard card data - for business overview
 */
export interface DashboardCardData {
  title?: string;
  period?: string;
  metrics: Array<{
    id: string;
    label: string;
    value: string | number;
    change?: number;
    change_direction?: 'up' | 'down' | 'neutral';
    format?: 'number' | 'currency' | 'percent';
    icon?: string;
    sparkline?: number[];
  }>;
  sections?: Array<{
    title: string;
    type: 'list' | 'chart' | 'table';
    data: unknown;
  }>;
  alerts?: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    action_label?: string;
    action_type?: string;
  }>;
}

/**
 * Portfolio review card data - for investment portfolio analysis
 */
export interface PortfolioReviewCardData {
  client_id: string;
  client_name: string;
  as_of_date: string;
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  risk_score?: number;
  risk_level?: 'Conservative' | 'Moderate' | 'Aggressive';
  allocation: Array<{
    category: string;
    value: number;
    percentage: number;
    target_percentage?: number;
    color?: string;
  }>;
  holdings?: Array<{
    id: string;
    name: string;
    symbol?: string;
    category: string;
    quantity?: number;
    current_value: number;
    cost_basis?: number;
    gain_loss?: number;
    gain_loss_percent?: number;
  }>;
  performance?: {
    periods: Array<{
      label: string;
      return_percent: number;
      benchmark_percent?: number;
    }>;
  };
  recommendations?: string[];
  available_actions?: ('rebalance' | 'generate_report' | 'schedule_review')[];
}

// ============================================================
// Phase 3 Card Types - Workflow Cards
// ============================================================

/**
 * Calendar card data - for schedule and appointments
 */
export interface CalendarCardData {
  title?: string;
  view?: 'day' | 'week' | 'month';
  selected_date: string;
  events: Array<{
    id: string;
    title: string;
    start: string;
    end?: string;
    all_day?: boolean;
    type?: 'meeting' | 'task' | 'reminder' | 'birthday' | 'renewal';
    location?: string;
    description?: string;
    client_id?: string;
    client_name?: string;
    color?: string;
  }>;
  available_actions?: ('add_event' | 'reschedule' | 'cancel')[];
}

/**
 * Document preview card data - for document viewing
 */
export interface DocumentPreviewCardData {
  document_id: string;
  title: string;
  document_type: string;
  file_type: 'pdf' | 'docx' | 'image' | 'other';
  file_size?: number;
  created_date?: string;
  preview_url?: string;
  download_url?: string;
  thumbnail_url?: string;
  pages?: number;
  client_id?: string;
  client_name?: string;
  policy_id?: string;
  status?: 'pending' | 'signed' | 'expired';
  available_actions?: ('download' | 'share' | 'sign' | 'delete')[];
}

/**
 * Progress tracker card data - for workflow/application status
 */
export interface ProgressTrackerCardData {
  title: string;
  entity_type?: 'application' | 'claim' | 'case' | 'onboarding';
  entity_id?: string;
  current_step: number;
  steps: Array<{
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending' | 'error';
    completed_date?: string;
    description?: string;
    assignee?: string;
  }>;
  estimated_completion?: string;
  client_id?: string;
  client_name?: string;
  available_actions?: ('update_status' | 'add_note' | 'escalate')[];
}

/**
 * Meeting notes card data - for meeting documentation
 */
export interface MeetingNotesCardData {
  meeting_id?: string;
  title: string;
  date: string;
  duration_minutes?: number;
  attendees?: Array<{
    name: string;
    email?: string;
    role?: string;
  }>;
  client_id?: string;
  client_name?: string;
  notes?: string;
  action_items?: Array<{
    id: string;
    description: string;
    assignee?: string;
    due_date?: string;
    completed?: boolean;
  }>;
  summary?: string;
  next_steps?: string[];
  editable?: boolean;
  available_actions?: ('save' | 'share' | 'create_tasks' | 'schedule_followup')[];
}

/**
 * Reminder card data - for reminders and follow-ups
 */
export interface ReminderCardData {
  reminder_id?: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  priority?: 'low' | 'medium' | 'high';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    end_date?: string;
  };
  client_id?: string;
  client_name?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  status?: 'pending' | 'completed' | 'snoozed';
  available_actions?: ('complete' | 'snooze' | 'edit' | 'delete')[];
}

/**
 * Renewal notice card data - for policy renewals
 */
export interface RenewalNoticeCardData {
  title: string;
  renewals: Array<{
    id: string;
    policy_id: string;
    policy_number: string;
    policy_type: string;
    client_id: string;
    client_name: string;
    renewal_date: string;
    current_premium: number;
    proposed_premium?: number;
    premium_change?: number;
    status: 'pending' | 'contacted' | 'renewed' | 'lapsed';
  }>;
  summary?: {
    total_count: number;
    total_premium_at_risk: number;
    by_urgency: {
      overdue: number;
      this_week: number;
      this_month: number;
    };
  };
  available_actions?: ('send_reminder' | 'schedule_call' | 'bulk_renew')[];
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
  | { type: 'confirmation'; data: ConfirmationCardData }
  // Phase 1 card types
  | { type: 'email-composer'; data: EmailComposerCardData }
  | { type: 'data-table'; data: DataTableCardData }
  | { type: 'chart'; data: ChartCardData }
  | { type: 'compliance-check'; data: ComplianceCheckCardData }
  // Phase 2 card types
  | { type: 'proposal'; data: ProposalCardData }
  | { type: 'comparison'; data: ComparisonCardData }
  | { type: 'dashboard'; data: DashboardCardData }
  | { type: 'portfolio-review'; data: PortfolioReviewCardData }
  // Phase 3 card types
  | { type: 'calendar'; data: CalendarCardData }
  | { type: 'document-preview'; data: DocumentPreviewCardData }
  | { type: 'progress-tracker'; data: ProgressTrackerCardData }
  | { type: 'meeting-notes'; data: MeetingNotesCardData }
  | { type: 'reminder'; data: ReminderCardData }
  | { type: 'renewal-notice'; data: RenewalNoticeCardData };

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
  /** Collected entity IDs across conversation (from frontend) */
  collected_entities?: {
    client_ids: string[];
    policy_ids: string[];
    task_ids: string[];
  };
  /** Recent actions performed (from frontend) */
  recent_actions?: string[];
  /** Whether there are pending drafts (from frontend) */
  has_pending_drafts?: boolean;
  /** Session start time (from frontend) */
  session_started_at?: string;
}

/**
 * Chat request from frontend
 */
export interface ChatRequest {
  message: string;
  context?: ChatContext;
  session_id?: string;
  conversation_history?: Message[];
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

// ============================================================
// Streaming Types (SSE)
// ============================================================

/**
 * Status phases sent during streaming
 */
export type StreamingStatus =
  | 'connecting'
  | 'classifying_intent'
  | 'resolving_context'
  | 'gathering_data'
  | 'executing_action'
  | 'building_prompt'
  | 'calling_llm'
  | 'parsing_response'
  | 'complete'
  | 'error';

/**
 * SSE event types
 */
export type SSEEventType = 'status' | 'progress' | 'partial' | 'result' | 'error';

/**
 * SSE event data structure
 */
export interface SSEEventData {
  status?: StreamingStatus;
  message?: string;
  progress?: number; // 0-100
  partial_content?: string;
  result?: ChatResponse;
  error?: string;
}

/**
 * SSE event structure sent to frontend
 */
export interface SSEEvent {
  type: SSEEventType;
  data: SSEEventData;
}

/**
 * Human-readable status messages for each phase
 */
export const STREAMING_STATUS_MESSAGES: Record<StreamingStatus, string> = {
  connecting: 'Connected to Ciri',
  classifying_intent: 'Understanding your request...',
  resolving_context: 'Checking conversation context...',
  gathering_data: 'Retrieving relevant information...',
  executing_action: 'Executing action...',
  building_prompt: 'Preparing AI request...',
  calling_llm: 'Ciri is thinking...',
  parsing_response: 'Processing response...',
  complete: 'Done',
  error: 'An error occurred',
};

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
