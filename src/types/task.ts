/**
 * Task Types - For advisor task management
 * These types represent tasks that can be AI-completed or manually managed
 */

// Task status
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'needs-review';

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high';

// AI action types - what kind of AI-generated work this is
export type AIActionType =
  | 'email_draft'
  | 'portfolio_review'
  | 'meeting_notes'
  | 'report'
  | 'reminder'
  | 'analysis'
  | 'policy_review'
  | 'compliance_check';

/**
 * AI completion data - details about AI-generated work
 */
export interface AICompletionData {
  completed_at: string;
  summary: string;
  details: string;
  confidence: number; // 0-100
  action_type: AIActionType;
  generated_content?: string; // The actual AI-generated content (email body, notes, etc.)
  metadata?: Record<string, unknown>;
}

/**
 * Full Task record
 */
export interface Task {
  // Core identification
  task_id: string;
  title: string;
  description: string;
  status: TaskStatus;

  // Scheduling
  due_date: string; // ISO datetime
  created_at: string;
  updated_at: string;
  completed_at?: string;

  // Relationships
  client_id?: string;
  client_name?: string;
  policy_id?: string;
  assigned_to?: string;

  // Classification
  priority: TaskPriority;
  tags: string[];
  task_type?: string;

  // AI completion fields
  ai_completed: boolean;
  ai_action_type?: AIActionType;
  ai_completion_data?: AICompletionData;

  // Audit
  created_by?: string;
  updated_by?: string;
}

/**
 * Task summary for list views
 */
export interface TaskSummary {
  task_id: string;
  title: string;
  status: TaskStatus;
  due_date: string;
  priority: TaskPriority;
  client_name?: string;
  ai_completed: boolean;
  ai_action_type?: AIActionType;
}

/**
 * Task filter parameters
 */
export interface TaskFilters {
  status?: TaskStatus;
  client_id?: string;
  due_date?: 'today' | 'week' | 'overdue' | 'upcoming';
  ai_completed?: boolean;
  priority?: TaskPriority;
  assigned_to?: string;
}

/**
 * Task update payload
 */
export interface TaskUpdate {
  status?: TaskStatus;
  title?: string;
  description?: string;
  due_date?: string;
  priority?: TaskPriority;
  tags?: string[];
  completed_at?: string;
}

/**
 * DynamoDB record for Task
 */
export interface TaskRecord {
  pk: string; // TASK#<task_id>
  sk: string; // DETAIL
  GSI1PK: string; // STATUS#<status> or CLIENT#<client_id>
  GSI1SK: string; // DUE#<due_date> or TASK#<task_id>
  entity_type: 'TASK';
  data: Task;
}
