/**
 * Tasks Handler - Task CRUD and actions
 * 
 * GET /api/tasks - List all tasks with optional filters
 * GET /api/tasks/{id} - Get a specific task
 * PATCH /api/tasks/{id} - Update a task
 * POST /api/tasks/{id}/approve - Approve an AI-completed task
 * POST /api/tasks/{id}/reject - Reject an AI-completed task
 * POST /api/tasks/{id}/complete - Mark a task as complete
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { TaskFilters, TaskUpdate } from '../types';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  parseQueryParams,
  getRequiredPathParam,
  parseBody,
  logRequest,
} from '../lib/utils/response';
import {
  getTasks,
  getTaskById,
  getTaskSummaries,
  getTodaysTasks,
  getPendingReviewTasks,
  getOverdueTasks,
  updateTask,
  approveTask,
  rejectTask,
  completeTask,
} from '../lib/db';

/**
 * Main tasks handler
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext?.http?.method || 'UNKNOWN';
  const path = event.requestContext?.http?.path || '/api/tasks';

  console.log('=== Tasks Handler Start ===');
  console.log('Method:', method);
  console.log('Path:', path);
  console.log('Body:', event.body);
  console.log('Query params:', event.queryStringParameters);
  console.log('Path params:', event.pathParameters);
  logRequest(method, path, event.body);

  try {
    // Check for task ID in path
    const taskId = getRequiredPathParam(event.pathParameters, 'id');
    const action = getRequiredPathParam(event.pathParameters, 'action');
    console.log('Task ID:', taskId, 'Action:', action);

    // Handle action endpoints
    if (taskId && action && method === 'POST') {
      console.log('Handling task action:', action, 'for task:', taskId);
      let result;
      switch (action) {
        case 'approve':
          result = await handleApproveTask(taskId);
          break;
        case 'reject':
          result = await handleRejectTask(taskId, event.body);
          break;
        case 'complete':
          result = await handleCompleteTask(taskId);
          break;
        default:
          console.log('Unknown action:', action);
          return errorResponse('Unknown action', 400);
      }
      console.log('=== Tasks Handler End ===');
      return result;
    }

    // Handle CRUD operations
    if (taskId) {
      if (method === 'GET') {
        console.log('Fetching single task:', taskId);
        const result = await handleGetTask(taskId);
        console.log('=== Tasks Handler End ===');
        return result;
      } else if (method === 'PATCH') {
        console.log('Updating task:', taskId);
        const result = await handleUpdateTask(taskId, event.body);
        console.log('=== Tasks Handler End ===');
        return result;
      }
    }

    // List tasks (GET /api/tasks)
    if (method === 'GET') {
      console.log('Listing all tasks');
      const result = await handleListTasks(event.queryStringParameters);
      console.log('=== Tasks Handler End ===');
      return result;
    }

    console.log('Method not allowed:', method);
    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('=== Tasks Handler Error ===');
    console.error('Tasks handler error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return errorResponse(
      'Failed to process request',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Get a single task by ID
 */
async function handleGetTask(taskId: string): Promise<APIGatewayProxyResultV2> {
  console.log('handleGetTask - fetching task:', taskId);
  const task = await getTaskById(taskId);

  if (!task) {
    console.log('Task not found:', taskId);
    return notFoundResponse('Task');
  }

  console.log('Task found:', taskId);
  return successResponse(task);
}

/**
 * List tasks with optional filters
 */
async function handleListTasks(
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  console.log('handleListTasks - query params:', queryParams);
  const params = parseQueryParams(queryParams);

  // Handle special filter cases
  if (params.filter === 'today') {
    console.log('Fetching today\'s tasks');
    const tasks = await getTodaysTasks();
    console.log('Today\'s tasks count:', tasks.length);
    return successResponse({
      tasks,
      total: tasks.length,
      filter: 'today',
    });
  }

  if (params.filter === 'pending-review') {
    console.log('Fetching pending review tasks');
    const tasks = await getPendingReviewTasks();
    console.log('Pending review tasks count:', tasks.length);
    return successResponse({
      tasks,
      total: tasks.length,
      filter: 'pending-review',
    });
  }

  if (params.filter === 'overdue') {
    console.log('Fetching overdue tasks');
    const tasks = await getOverdueTasks();
    console.log('Overdue tasks count:', tasks.length);
    return successResponse({
      tasks,
      total: tasks.length,
      filter: 'overdue',
    });
  }

  // Build filters from query params
  const filters: TaskFilters = {};

  if (params.status) {
    filters.status = params.status as TaskFilters['status'];
  }
  if (params.client_id) {
    filters.client_id = params.client_id;
  }
  if (params.priority) {
    filters.priority = params.priority as TaskFilters['priority'];
  }
  if (params.ai_completed !== undefined) {
    filters.ai_completed = params.ai_completed === 'true';
  }
  if (params.due_date) {
    filters.due_date = params.due_date as TaskFilters['due_date'];
  }

  console.log('Filters:', JSON.stringify(filters));
  // Check if summary view is requested
  const summary = params.summary === 'true';
  console.log('Summary view:', summary);

  if (summary) {
    console.log('Fetching task summaries');
    const tasks = await getTaskSummaries(filters);
    console.log('Tasks fetched, count:', tasks.length);
    return successResponse({
      tasks,
      total: tasks.length,
    });
  }

  console.log('Fetching full tasks');
  const tasks = await getTasks(filters);
  console.log('Tasks fetched, count:', tasks.length);
  return successResponse({
    tasks,
    total: tasks.length,
  });
}

/**
 * Update a task
 */
async function handleUpdateTask(
  taskId: string,
  body?: string
): Promise<APIGatewayProxyResultV2> {
  console.log('handleUpdateTask - task:', taskId, 'body:', body);
  const updates = parseBody<TaskUpdate>(body);

  if (!updates) {
    console.log('Invalid request body for task update');
    return errorResponse('Invalid request body', 400);
  }

  console.log('Updating task with:', JSON.stringify(updates));
  const task = await updateTask(taskId, updates);

  if (!task) {
    console.log('Task not found for update:', taskId);
    return notFoundResponse('Task');
  }

  console.log('Task updated successfully:', taskId);
  return successResponse(task);
}

/**
 * Approve an AI-completed task
 */
async function handleApproveTask(taskId: string): Promise<APIGatewayProxyResultV2> {
  console.log('handleApproveTask - task:', taskId);
  try {
    const task = await approveTask(taskId);

    if (!task) {
      console.log('Task not found for approval:', taskId);
      return notFoundResponse('Task');
    }

    console.log('Task approved successfully:', taskId);
    return successResponse({
      task,
      message: 'Task approved successfully',
    });
  } catch (error) {
    console.error('Error approving task:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to approve task',
      400
    );
  }
}

/**
 * Reject an AI-completed task
 */
async function handleRejectTask(
  taskId: string,
  body?: string
): Promise<APIGatewayProxyResultV2> {
  console.log('handleRejectTask - task:', taskId, 'body:', body);
  const data = parseBody<{ reason?: string }>(body);
  console.log('Reject reason:', data?.reason);

  try {
    const task = await rejectTask(taskId, data?.reason);

    if (!task) {
      console.log('Task not found for rejection:', taskId);
      return notFoundResponse('Task');
    }

    console.log('Task rejected successfully:', taskId);
    return successResponse({
      task,
      message: 'Task rejected and reset to pending',
    });
  } catch (error) {
    console.error('Error rejecting task:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to reject task',
      400
    );
  }
}

/**
 * Mark a task as complete
 */
async function handleCompleteTask(taskId: string): Promise<APIGatewayProxyResultV2> {
  console.log('handleCompleteTask - task:', taskId);
  const task = await completeTask(taskId);

  if (!task) {
    console.log('Task not found for completion:', taskId);
    return notFoundResponse('Task');
  }

  console.log('Task completed successfully:', taskId);
  return successResponse({
    task,
    message: 'Task completed successfully',
  });
}
