/**
 * Task Database Operations
 */

import {
  getItem,
  putItem,
  scanByEntityType,
  generateId,
  getCurrentTimestamp,
} from './dynamodb';
import type {
  Task,
  TaskSummary,
  TaskFilters,
  TaskUpdate,
  TaskRecord,
  TaskStatus,
} from '../../types';

const ENTITY_TYPE = 'TASK';

/**
 * Build DynamoDB record from Task data
 */
function buildTaskRecord(task: Task): TaskRecord {
  return {
    pk: `TASK#${task.task_id}`,
    sk: 'DETAIL',
    GSI1PK: task.client_id ? `CLIENT#${task.client_id}` : `STATUS#${task.status}`,
    GSI1SK: `DUE#${task.due_date}#${task.task_id}`,
    entity_type: ENTITY_TYPE,
    data: task,
  };
}

/**
 * Extract Task data from DynamoDB record
 */
function extractTask(record: TaskRecord): Task {
  return record.data;
}

/**
 * Convert Task to TaskSummary
 */
function toSummary(task: Task): TaskSummary {
  return {
    task_id: task.task_id,
    title: task.title,
    status: task.status,
    due_date: task.due_date,
    priority: task.priority,
    client_name: task.client_name,
    ai_completed: task.ai_completed,
    ai_action_type: task.ai_action_type,
  };
}

/**
 * Check if a date is today
 */
function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a date is within this week
 */
function isThisWeek(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

/**
 * Check if a date is within this month
 */
function isThisMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

/**
 * Check if a date is overdue
 */
function isOverdue(dateString: string, status: TaskStatus): boolean {
  if (status === 'completed') return false;
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
}

/**
 * Get a task by ID
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const record = await getItem<TaskRecord>(`TASK#${taskId}`, 'DETAIL');
  return record ? extractTask(record) : null;
}

/**
 * Get all tasks with optional filters
 */
export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const records = await scanByEntityType<TaskRecord>(ENTITY_TYPE);
  let tasks = records.map(extractTask);

  // Apply filters
  if (filters) {
    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }
    if (filters.client_id) {
      tasks = tasks.filter((t) => t.client_id === filters.client_id);
    }
    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }
    if (filters.ai_completed !== undefined) {
      tasks = tasks.filter((t) => t.ai_completed === filters.ai_completed);
    }
    if (filters.assigned_to) {
      tasks = tasks.filter((t) => t.assigned_to === filters.assigned_to);
    }
    if (filters.due_date) {
      switch (filters.due_date) {
        case 'today':
          tasks = tasks.filter((t) => isToday(t.due_date));
          break;
        case 'week':
          tasks = tasks.filter((t) => isThisWeek(t.due_date));
          break;
        case 'overdue':
          tasks = tasks.filter((t) => isOverdue(t.due_date, t.status));
          break;
        case 'upcoming':
          tasks = tasks.filter((t) => {
            const date = new Date(t.due_date);
            const now = new Date();
            return date > now && t.status !== 'completed';
          });
          break;
      }
    }
  }

  // Sort by due date
  tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return tasks;
}

/**
 * Get task summaries
 */
export async function getTaskSummaries(filters?: TaskFilters): Promise<TaskSummary[]> {
  const tasks = await getTasks(filters);
  return tasks.map(toSummary);
}

/**
 * Get tasks for today
 */
export async function getTodaysTasks(): Promise<Task[]> {
  return getTasks({ due_date: 'today' });
}

/**
 * Get tasks needing review (AI-completed, status = needs-review)
 */
export async function getPendingReviewTasks(): Promise<Task[]> {
  return getTasks({ status: 'needs-review', ai_completed: true });
}

/**
 * Get tasks for a specific client
 */
export async function getTasksForClient(clientId: string): Promise<Task[]> {
  return getTasks({ client_id: clientId });
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<Task[]> {
  return getTasks({ due_date: 'overdue' });
}

/**
 * Create a new task
 */
export async function createTask(
  taskData: Omit<Task, 'task_id' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const now = getCurrentTimestamp();
  const task: Task = {
    ...taskData,
    task_id: generateId('T'),
    created_at: now,
    updated_at: now,
  };

  const record = buildTaskRecord(task);
  await putItem(record);
  return task;
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: TaskUpdate
): Promise<Task | null> {
  const existing = await getTaskById(taskId);
  if (!existing) {
    return null;
  }

  const updatedTask: Task = {
    ...existing,
    ...updates,
    task_id: taskId, // Ensure ID doesn't change
    updated_at: getCurrentTimestamp(),
  };

  // If marking as completed, set completed_at
  if (updates.status === 'completed' && !updatedTask.completed_at) {
    updatedTask.completed_at = getCurrentTimestamp();
  }

  const record = buildTaskRecord(updatedTask);
  await putItem(record);
  return updatedTask;
}

/**
 * Approve an AI-completed task
 */
export async function approveTask(taskId: string): Promise<Task | null> {
  const task = await getTaskById(taskId);
  if (!task) {
    return null;
  }

  if (!task.ai_completed || task.status !== 'needs-review') {
    throw new Error('Task is not pending AI review');
  }

  return updateTask(taskId, {
    status: 'completed',
    completed_at: getCurrentTimestamp(),
  });
}

/**
 * Reject an AI-completed task
 */
export async function rejectTask(
  taskId: string,
  reason?: string
): Promise<Task | null> {
  const task = await getTaskById(taskId);
  if (!task) {
    return null;
  }

  if (!task.ai_completed || task.status !== 'needs-review') {
    throw new Error('Task is not pending AI review');
  }

  // Reset the task to pending status
  const updates: TaskUpdate = {
    status: 'pending',
  };

  // Clear AI completion data if rejecting
  const updatedTask = await getTaskById(taskId);
  if (updatedTask) {
    updatedTask.ai_completion_data = undefined;
    updatedTask.ai_completed = false;
    updatedTask.status = 'pending';
    updatedTask.updated_at = getCurrentTimestamp();
    
    const record = buildTaskRecord(updatedTask);
    await putItem(record);
    return updatedTask;
  }

  return null;
}

/**
 * Mark a task as complete
 */
export async function completeTask(taskId: string): Promise<Task | null> {
  return updateTask(taskId, {
    status: 'completed',
    completed_at: getCurrentTimestamp(),
  });
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: TaskStatus,
  to: TaskStatus
): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    pending: ['in-progress', 'completed'],
    'in-progress': ['pending', 'completed', 'needs-review'],
    'needs-review': ['completed', 'pending'],
    completed: ['pending'], // Allow reopening
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get tasks due this week
 */
export async function getTasksThisWeek(): Promise<Task[]> {
  return getTasks({ due_date: 'week' });
}

/**
 * Get tasks due this month
 */
export async function getTasksThisMonth(): Promise<Task[]> {
  const records = await scanByEntityType<TaskRecord>(ENTITY_TYPE);
  let tasks = records.map(extractTask);
  tasks = tasks.filter((t) => isThisMonth(t.due_date));
  tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return tasks;
}

/**
 * Get tasks by priority level
 */
export async function getTasksByPriority(priority: 'high' | 'medium' | 'low'): Promise<Task[]> {
  return getTasks({ priority });
}

/**
 * Get tasks by status
 */
export async function getTasksByStatus(status: TaskStatus): Promise<Task[]> {
  return getTasks({ status });
}

/**
 * Get tasks that are in progress
 */
export async function getInProgressTasks(): Promise<Task[]> {
  return getTasks({ status: 'in-progress' });
}

/**
 * Get completed tasks with optional limit
 */
export async function getCompletedTasks(limit?: number): Promise<Task[]> {
  const tasks = await getTasks({ status: 'completed' });
  // Sort by completed_at descending (most recent first)
  tasks.sort((a, b) => {
    const aDate = a.completed_at ? new Date(a.completed_at).getTime() : 0;
    const bDate = b.completed_at ? new Date(b.completed_at).getTime() : 0;
    return bDate - aDate;
  });
  return limit ? tasks.slice(0, limit) : tasks;
}

/**
 * Search tasks by keyword in title or description
 */
export async function searchTasks(query: string): Promise<Task[]> {
  const records = await scanByEntityType<TaskRecord>(ENTITY_TYPE);
  const tasks = records.map(extractTask);
  const searchTerm = query.toLowerCase();

  return tasks.filter((t) =>
    t.title.toLowerCase().includes(searchTerm) ||
    t.description.toLowerCase().includes(searchTerm) ||
    t.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
    (t.client_name && t.client_name.toLowerCase().includes(searchTerm))
  );
}

/**
 * Get task counts grouped by status and priority
 */
export async function getTaskCount(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const records = await scanByEntityType<TaskRecord>(ENTITY_TYPE);
  const tasks = records.map(extractTask);

  const byStatus: Record<string, number> = {
    pending: 0,
    'in-progress': 0,
    completed: 0,
    'needs-review': 0,
  };

  const byPriority: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const task of tasks) {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
  }

  return {
    total: tasks.length,
    byStatus,
    byPriority,
  };
}
