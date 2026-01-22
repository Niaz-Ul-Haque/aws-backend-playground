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

  logRequest(method, path, event.body);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  try {
    // Check for task ID in path
    const taskId = getRequiredPathParam(event.pathParameters, 'id');
    const action = getRequiredPathParam(event.pathParameters, 'action');

    // Handle action endpoints
    if (taskId && action && method === 'POST') {
      switch (action) {
        case 'approve':
          return await handleApproveTask(taskId);
        case 'reject':
          return await handleRejectTask(taskId, event.body);
        case 'complete':
          return await handleCompleteTask(taskId);
        default:
          return errorResponse('Unknown action', 400);
      }
    }

    // Handle CRUD operations
    if (taskId) {
      if (method === 'GET') {
        return await handleGetTask(taskId);
      } else if (method === 'PATCH') {
        return await handleUpdateTask(taskId, event.body);
      }
    }

    // List tasks (GET /api/tasks)
    if (method === 'GET') {
      return await handleListTasks(event.queryStringParameters);
    }

    return errorResponse('Method not allowed', 405);
  } catch (error) {
    console.error('Tasks handler error:', error);
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
  const task = await getTaskById(taskId);

  if (!task) {
    return notFoundResponse('Task');
  }

  return successResponse(task);
}

/**
 * List tasks with optional filters
 */
async function handleListTasks(
  queryParams?: Record<string, string | undefined>
): Promise<APIGatewayProxyResultV2> {
  const params = parseQueryParams(queryParams);

  // Handle special filter cases
  if (params.filter === 'today') {
    const tasks = await getTodaysTasks();
    return successResponse({
      tasks,
      total: tasks.length,
      filter: 'today',
    });
  }

  if (params.filter === 'pending-review') {
    const tasks = await getPendingReviewTasks();
    return successResponse({
      tasks,
      total: tasks.length,
      filter: 'pending-review',
    });
  }

  if (params.filter === 'overdue') {
    const tasks = await getOverdueTasks();
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

  // Check if summary view is requested
  const summary = params.summary === 'true';

  if (summary) {
    const tasks = await getTaskSummaries(filters);
    return successResponse({
      tasks,
      total: tasks.length,
    });
  }

  const tasks = await getTasks(filters);
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
  const updates = parseBody<TaskUpdate>(body);

  if (!updates) {
    return errorResponse('Invalid request body', 400);
  }

  const task = await updateTask(taskId, updates);

  if (!task) {
    return notFoundResponse('Task');
  }

  return successResponse(task);
}

/**
 * Approve an AI-completed task
 */
async function handleApproveTask(taskId: string): Promise<APIGatewayProxyResultV2> {
  try {
    const task = await approveTask(taskId);

    if (!task) {
      return notFoundResponse('Task');
    }

    return successResponse({
      task,
      message: 'Task approved successfully',
    });
  } catch (error) {
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
  const data = parseBody<{ reason?: string }>(body);

  try {
    const task = await rejectTask(taskId, data?.reason);

    if (!task) {
      return notFoundResponse('Task');
    }

    return successResponse({
      task,
      message: 'Task rejected and reset to pending',
    });
  } catch (error) {
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
  const task = await completeTask(taskId);

  if (!task) {
    return notFoundResponse('Task');
  }

  return successResponse({
    task,
    message: 'Task completed successfully',
  });
}
