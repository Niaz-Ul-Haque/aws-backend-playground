/**
 * Actions Handler - Action execution endpoints
 * Handles email sending, compliance resolution, report generation, and bulk operations
 * 
 * POST /api/actions/send-email
 * POST /api/actions/resolve-compliance
 * POST /api/actions/generate-report
 * POST /api/actions/execute
 * POST /api/actions/bulk-tasks
 * POST /api/actions/bulk-renewal
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getHttpMethod, getPath, type ApiGatewayEvent } from '../lib/utils/api-gateway';
import {
  successResponse,
  errorResponse,
  parseBody,
  logRequest,
} from '../lib/utils/response';
import { completeTask, getTaskById } from '../lib/db';

// ============================================================
// Request/Response Types
// ============================================================

interface SendEmailRequest {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: Array<{ name: string; url?: string; size?: number }>;
  related_task_id?: string;
  related_client_id?: string;
}

interface ResolveComplianceRequest {
  client_id: string;
  issue_id: string;
  resolution: string;
}

interface GenerateReportRequest {
  report_type: 'compliance' | 'portfolio' | 'client' | 'policy';
  client_id?: string;
  check_date?: string;
}

interface ExecuteActionRequest {
  action_type: string;
  entity_type: string;
  entity_id: string;
  payload?: Record<string, unknown>;
}

interface BulkTasksRequest {
  action: 'complete' | 'reassign';
  task_ids: string[];
  payload?: {
    assignee?: string;
  };
}

interface BulkRenewalRequest {
  policy_ids: string[];
}

// ============================================================
// Main Handler
// ============================================================

export async function handler(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const method = getHttpMethod(event);
  const path = getPath(event);

  console.log('=== Actions Handler Start ===');
  console.log('Method:', method);
  console.log('Path:', path);
  logRequest(method, path, event.body);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return successResponse({}, 200);
  }

  // Only allow POST
  if (method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Route to appropriate action handler
    if (path.endsWith('/send-email')) {
      return await handleSendEmail(event);
    } else if (path.endsWith('/resolve-compliance')) {
      return await handleResolveCompliance(event);
    } else if (path.endsWith('/generate-report')) {
      return await handleGenerateReport(event);
    } else if (path.endsWith('/execute')) {
      return await handleExecuteAction(event);
    } else if (path.endsWith('/bulk-tasks')) {
      return await handleBulkTasks(event);
    } else if (path.endsWith('/bulk-renewal')) {
      return await handleBulkRenewal(event);
    } else {
      return errorResponse('Unknown action endpoint', 404);
    }
  } catch (error) {
    console.error('Actions handler error:', error);
    return errorResponse(
      'Failed to execute action',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================
// Action Handlers
// ============================================================

/**
 * Handle send email action (POC - simulated)
 */
async function handleSendEmail(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<SendEmailRequest>(event.body ?? undefined);

  if (!body || !body.to || !body.subject || !body.body) {
    return errorResponse('Missing required fields: to, subject, body', 400);
  }

  console.log('Simulating email send:', {
    to: body.to,
    subject: body.subject,
    related_task_id: body.related_task_id,
  });

  // If there's a related task, mark it as completed
  if (body.related_task_id) {
    try {
      await completeTask(body.related_task_id);
      console.log('Related task completed:', body.related_task_id);
    } catch (error) {
      console.warn('Could not complete related task:', error);
    }
  }

  // POC: Simulate email sending with a generated ID
  const emailId = `email-${Date.now()}`;

  return successResponse({
    email_id: emailId,
    sent_at: new Date().toISOString(),
    message: 'Email sent successfully (simulated)',
  });
}

/**
 * Handle resolve compliance issue action
 */
async function handleResolveCompliance(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<ResolveComplianceRequest>(event.body ?? undefined);

  if (!body || !body.client_id || !body.issue_id || !body.resolution) {
    return errorResponse('Missing required fields: client_id, issue_id, resolution', 400);
  }

  console.log('Resolving compliance issue:', {
    client_id: body.client_id,
    issue_id: body.issue_id,
    resolution: body.resolution,
  });

  // POC: Simulate compliance resolution
  // In production, this would update the client's compliance record in DynamoDB

  return successResponse({
    resolved_at: new Date().toISOString(),
    new_score: 85, // Simulated improved score
    message: 'Compliance issue resolved successfully',
  });
}

/**
 * Handle generate report action
 */
async function handleGenerateReport(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<GenerateReportRequest>(event.body ?? undefined);

  if (!body || !body.report_type) {
    return errorResponse('Missing required field: report_type', 400);
  }

  console.log('Generating report:', {
    report_type: body.report_type,
    client_id: body.client_id,
  });

  // POC: Simulate report generation
  const reportId = `report-${Date.now()}`;

  return successResponse({
    report_id: reportId,
    download_url: `https://example.com/reports/${reportId}.pdf`,
    message: `${body.report_type} report generated successfully`,
  });
}

/**
 * Handle generic action execution
 */
async function handleExecuteAction(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<ExecuteActionRequest>(event.body ?? undefined);

  if (!body || !body.action_type || !body.entity_type || !body.entity_id) {
    return errorResponse('Missing required fields: action_type, entity_type, entity_id', 400);
  }

  console.log('Executing action:', {
    action_type: body.action_type,
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    payload: body.payload,
  });

  // Handle different action types
  switch (body.action_type) {
    case 'schedule_review':
      return successResponse({
        event_id: `event-${Date.now()}`,
        message: 'Review scheduled successfully',
        scheduled_date: body.payload?.scheduled_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    case 'escalate':
      return successResponse({
        escalation_id: `esc-${Date.now()}`,
        message: 'Issue escalated successfully',
      });

    case 'send_reminder':
      return successResponse({
        reminder_id: `rem-${Date.now()}`,
        message: 'Reminder sent successfully',
      });

    default:
      return successResponse({
        action_id: `action-${Date.now()}`,
        message: `Action '${body.action_type}' executed successfully`,
      });
  }
}

/**
 * Handle bulk task operations
 */
async function handleBulkTasks(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<BulkTasksRequest>(event.body ?? undefined);

  if (!body || !body.action || !body.task_ids || body.task_ids.length === 0) {
    return errorResponse('Missing required fields: action, task_ids', 400);
  }

  console.log('Bulk task operation:', {
    action: body.action,
    task_count: body.task_ids.length,
  });

  const results: Array<{ task_id: string; success: boolean; error?: string }> = [];

  for (const taskId of body.task_ids) {
    try {
      if (body.action === 'complete') {
        await completeTask(taskId);
        results.push({ task_id: taskId, success: true });
      } else if (body.action === 'reassign') {
        // POC: Reassign is simulated
        results.push({ task_id: taskId, success: true });
      }
    } catch (error) {
      results.push({
        task_id: taskId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return successResponse({
    processed: body.task_ids.length,
    successful: successCount,
    failed: body.task_ids.length - successCount,
    results,
    message: `Bulk ${body.action} completed: ${successCount}/${body.task_ids.length} tasks`,
  });
}

/**
 * Handle bulk policy renewal
 */
async function handleBulkRenewal(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const body = parseBody<BulkRenewalRequest>(event.body ?? undefined);

  if (!body || !body.policy_ids || body.policy_ids.length === 0) {
    return errorResponse('Missing required field: policy_ids', 400);
  }

  console.log('Bulk renewal operation:', {
    policy_count: body.policy_ids.length,
  });

  // POC: Simulate bulk renewal
  const results = body.policy_ids.map((policyId) => ({
    policy_id: policyId,
    success: true,
    new_renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));

  return successResponse({
    processed: body.policy_ids.length,
    successful: body.policy_ids.length,
    failed: 0,
    results,
    message: `Bulk renewal initiated for ${body.policy_ids.length} policies`,
  });
}
