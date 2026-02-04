/**
 * Streaming Chat Handler - SSE streaming endpoint with status updates
 * 
 * This handler uses Lambda Response Streaming to provide real-time
 * status updates during chat processing. The frontend receives
 * Server-Sent Events (SSE) with progress updates.
 * 
 * Streaming Endpoint: Function URL (not API Gateway)
 * Format: Server-Sent Events (SSE)
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { ChatRequest, ChatContext, ChatResponse } from '../types';
import {
  buildSystemPrompt,
  buildPromptWithIntent,
  formatDataContext,
  classifyIntent,
  resolveContextReferences,
  callLLM,
  parseContent,
} from '../lib/ai';
import {
  getTodaysTasks,
  getTasks,
  getPendingReviewTasks,
  getTaskById,
  approveTask,
  rejectTask,
  completeTask,
  getClientByName,
  getClientById,
  getClients,
  getPoliciesForClient,
  getExpiringPolicies,
  getPolicyById,
} from '../lib/db';
import type { ExtractedEntities } from '../types';

// ============================================================
// SSE Status Types
// ============================================================

/**
 * Status update phases sent to the frontend
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
 * SSE event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: {
    status?: StreamingStatus;
    message?: string;
    progress?: number; // 0-100
    partial_content?: string;
    result?: ChatResponse;
    error?: string;
  };
}

// ============================================================
// Response Stream Helpers
// ============================================================

/**
 * Format an SSE event for streaming
 */
function formatSSEEvent(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

/**
 * Send a status update
 */
function createStatusEvent(
  status: StreamingStatus,
  message: string,
  progress: number
): string {
  return formatSSEEvent({
    type: 'status',
    data: { status, message, progress },
  });
}

/**
 * Send the final result
 */
function createResultEvent(result: ChatResponse): string {
  return formatSSEEvent({
    type: 'result',
    data: { status: 'complete', result, progress: 100 },
  });
}

/**
 * Send an error
 */
function createErrorEvent(error: string): string {
  return formatSSEEvent({
    type: 'error',
    data: { status: 'error', error, progress: 0 },
  });
}

// ============================================================
// Streaming Handler
// ============================================================

/**
 * Node.js streaming handler using awslambda.streamifyResponse
 * This wraps the handler to enable response streaming
 */
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: APIGatewayProxyEventV2,
      responseStream: NodeJS.WritableStream,
      context: unknown
    ) => Promise<void>
  ) => (event: APIGatewayProxyEventV2, context: unknown) => Promise<void>;
  HttpResponseStream: {
    from: (
      stream: NodeJS.WritableStream,
      metadata: { statusCode: number; headers: Record<string, string> }
    ) => NodeJS.WritableStream;
  };
};

/**
 * Parse request body from event
 */
function parseBody(event: APIGatewayProxyEventV2): ChatRequest | null {
  try {
    const body = event.body;
    if (!body) return null;
    
    // Handle base64 encoded bodies
    const decoded = event.isBase64Encoded
      ? Buffer.from(body, 'base64').toString('utf-8')
      : body;
    
    return JSON.parse(decoded) as ChatRequest;
  } catch (error) {
    console.error('Error parsing request body:', error);
    return null;
  }
}

/** Return an appropriate max_tokens budget for the given intent */
function maxTokensForIntent(intent: string): number {
  switch (intent) {
    case 'greeting':
    case 'help':
    case 'approve_task':
    case 'reject_task':
    case 'complete_task':
    case 'send_email':
      return 800;

    case 'show_todays_tasks':
    case 'show_all_tasks':
    case 'show_pending_reviews':
    case 'show_task_status':
    case 'show_overdue_tasks':
    case 'show_high_priority_tasks':
    case 'show_tasks_this_week':
    case 'show_tasks_this_month':
    case 'show_in_progress_tasks':
    case 'show_completed_tasks':
    case 'show_client_info':
    case 'show_client_list':
    case 'show_client_policies':
    case 'show_recent_clients':
    case 'show_high_net_worth_clients':
    case 'show_active_clients':
    case 'show_inactive_clients':
    case 'show_prospect_clients':
    case 'search_clients':
    case 'show_clients_by_portfolio':
    case 'show_policy_info':
    case 'show_expiring_policies':
    case 'show_expiring_this_week':
    case 'show_expiring_this_month':
    case 'show_policies_by_type':
    case 'show_policies_by_status':
    case 'show_overdue_policies':
    case 'show_dashboard':
    case 'show_task_summary':
    case 'show_client_summary':
    case 'show_policy_summary':
    case 'show_portfolio_summary':
    case 'show_today_summary':
    case 'show_week_summary':
    case 'global_search':
    case 'search_tasks':
    case 'search_policies':
      return 2000;

    case 'show_analytics':
    case 'show_portfolio':
    case 'run_compliance_check':
    case 'compare_options':
    case 'generate_report':
    case 'show_calendar':
    case 'preview_document':
    case 'track_progress':
    case 'show_renewals':
    case 'bulk_action':
      return 3000;

    case 'create_compliance_check':
    case 'create_portfolio_analysis':
    case 'create_client_summary':
    case 'create_meeting_prep':
    case 'create_report':
    case 'create_proposal':
    case 'draft_email':
    case 'draft_meeting_notes':
    case 'draft_birthday_message':
    case 'draft_renewal_notice':
    case 'create_meeting_notes':
    case 'schedule_meeting':
    case 'set_reminder':
      return 4000;

    default:
      return 2000;
  }
}

/**
 * Main streaming handler implementation
 */
async function streamingHandler(
  event: APIGatewayProxyEventV2,
  responseStream: NodeJS.WritableStream,
  context: unknown
): Promise<void> {
  // Create SSE response stream with proper headers
  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Accept,Cache-Control',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });

  const write = (data: string): void => {
    httpStream.write(data);
  };

  try {
    // Handle preflight - safely access method from either Function URL or API Gateway event
    const method = event.requestContext?.http?.method || 
                   (event as any).requestContext?.httpMethod || 
                   'POST';
    
    if (method === 'OPTIONS') {
      write(createStatusEvent('complete', 'CORS preflight', 100));
      httpStream.end();
      return;
    }

    // Parse request
    const body = parseBody(event);
    if (!body || !body.message) {
      write(createErrorEvent('Message is required'));
      httpStream.end();
      return;
    }

    console.log('=== Streaming Chat Handler Start ===');
    console.log('Message:', body.message);

    // Send initial status
    write(createStatusEvent('connecting', 'Connected to Ciri', 5));

    // Step 1: Classify intent
    write(createStatusEvent('classifying_intent', 'Understanding your request...', 15));
    const intentResult = classifyIntent(body.message);
    console.log('Intent:', intentResult.intent, 'Confidence:', intentResult.confidence);

    // Step 2: Resolve context
    write(createStatusEvent('resolving_context', 'Checking conversation context...', 25));
    const resolvedContext = resolveContextReferences(body.message, body.context);

    // Step 3: Gather data
    write(createStatusEvent('gathering_data', 'Retrieving relevant information...', 35));
    const dataContext = await gatherDataForIntent(
      intentResult.intent,
      intentResult.entities,
      body.context,
      resolvedContext
    );

    // Step 4: Handle actions
    let tasksUpdated = false;
    if (['approve_task', 'reject_task', 'complete_task'].includes(intentResult.intent)) {
      write(createStatusEvent('executing_action', 'Executing action...', 45));
      if (intentResult.intent === 'approve_task' && resolvedContext.task_id) {
        try {
          await approveTask(resolvedContext.task_id);
          tasksUpdated = true;
        } catch (error) {
          console.error('Error approving task:', error);
        }
      } else if (intentResult.intent === 'reject_task' && resolvedContext.task_id) {
        try {
          await rejectTask(resolvedContext.task_id);
          tasksUpdated = true;
        } catch (error) {
          console.error('Error rejecting task:', error);
        }
      } else if (intentResult.intent === 'complete_task' && resolvedContext.task_id) {
        try {
          await completeTask(resolvedContext.task_id);
          tasksUpdated = true;
        } catch (error) {
          console.error('Error completing task:', error);
        }
      }
    }

    // Step 5: Build prompts
    write(createStatusEvent('building_prompt', 'Preparing AI request...', 55));
    const systemPrompt = buildSystemPrompt();
    const intentPrompt = buildPromptWithIntent(intentResult.intent, dataContext.formattedData);

    // Step 6: Call LLM
    write(createStatusEvent('calling_llm', 'Ciri is thinking...', 65));
    const maxTokens = maxTokensForIntent(intentResult.intent);
    const llmResponse = await callLLM(
      systemPrompt + intentPrompt,
      body.message,
      undefined,
      { maxTokens }
    );

    // Step 7: Parse response
    write(createStatusEvent('parsing_response', 'Processing response...', 85));
    const parsedResponse = parseContent(llmResponse);

    // Step 8: Build final response
    const updatedContext: ChatContext = {
      ...body.context,
      last_intent: intentResult.intent,
      focused_task_id: dataContext.focusedTaskId || body.context?.focused_task_id,
      focused_client_id: dataContext.focusedClientId || body.context?.focused_client_id,
      focused_policy_id: dataContext.focusedPolicyId || body.context?.focused_policy_id,
    };

    const result: ChatResponse = {
      content: llmResponse,
      cards: parsedResponse.cards.length > 0 ? parsedResponse.cards : undefined,
      context: updatedContext,
      tasks_updated: tasksUpdated || undefined,
    };

    // Send final result
    write(createResultEvent(result));
    console.log('=== Streaming Chat Handler Complete ===');

  } catch (error) {
    console.error('=== Streaming Chat Handler Error ===');
    console.error('Error:', error);
    write(createErrorEvent(
      error instanceof Error ? error.message : 'Unknown error occurred'
    ));
  } finally {
    httpStream.end();
  }
}

/**
 * Export the streaming handler wrapped with streamifyResponse
 */
export const handler = awslambda.streamifyResponse(streamingHandler);

// ============================================================
// Data Gathering (copied from chat.ts for isolation)
// ============================================================

/**
 * Gather relevant data based on the classified intent
 */
async function gatherDataForIntent(
  intent: string,
  entities: ExtractedEntities,
  context?: ChatContext,
  resolvedContext?: { task_id?: string; client_id?: string; policy_id?: string }
): Promise<{
  formattedData: string;
  focusedTaskId?: string;
  focusedClientId?: string;
  focusedPolicyId?: string;
}> {
  const dataForPrompt: {
    tasks?: unknown[];
    clients?: unknown[];
    policies?: unknown[];
    focusedTask?: unknown;
    focusedClient?: unknown;
    focusedPolicy?: unknown;
  } = {};

  let focusedTaskId: string | undefined;
  let focusedClientId: string | undefined;
  let focusedPolicyId: string | undefined;

  switch (intent) {
    case 'show_todays_tasks': {
      const tasks = await getTodaysTasks();
      dataForPrompt.tasks = tasks;
      break;
    }

    case 'show_all_tasks': {
      const tasks = await getTasks();
      dataForPrompt.tasks = tasks;
      break;
    }

    case 'show_pending_reviews': {
      const tasks = await getPendingReviewTasks();
      dataForPrompt.tasks = tasks;
      if (tasks.length > 0) {
        focusedTaskId = tasks[0].task_id;
        dataForPrompt.focusedTask = tasks[0];
      }
      break;
    }

    case 'show_task_status':
    case 'approve_task':
    case 'reject_task':
    case 'complete_task': {
      const taskId = resolvedContext?.task_id || (entities.task_id as string);
      if (taskId) {
        const task = await getTaskById(taskId);
        if (task) {
          dataForPrompt.focusedTask = task;
          focusedTaskId = taskId;
        }
      }
      break;
    }

    case 'show_client_info': {
      const clientName = entities.client_name as string;
      const clientId = resolvedContext?.client_id || (entities.client_id as string);

      if (clientName) {
        const client = await getClientByName(clientName);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
          const policies = await getPoliciesForClient(client.client_id);
          if (policies.length > 0) {
            dataForPrompt.policies = policies;
          }
        }
      } else if (clientId) {
        const [client, policies] = await Promise.all([
          getClientById(clientId),
          getPoliciesForClient(clientId),
        ]);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
          if (policies.length > 0) {
            dataForPrompt.policies = policies;
          }
        }
      }
      break;
    }

    case 'show_client_list': {
      const clients = await getClients();
      dataForPrompt.clients = clients;
      break;
    }

    case 'show_client_policies': {
      const clientName = entities.client_name as string;
      const clientId = resolvedContext?.client_id || (entities.client_id as string);

      let targetClientId = clientId;
      if (clientName && !targetClientId) {
        const client = await getClientByName(clientName);
        if (client) {
          targetClientId = client.client_id;
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
        }
      }

      if (targetClientId) {
        const policies = await getPoliciesForClient(targetClientId);
        dataForPrompt.policies = policies;
      }
      break;
    }

    case 'show_policy_info': {
      const policyId = resolvedContext?.policy_id || (entities.policy_id as string);
      if (policyId) {
        const policy = await getPolicyById(policyId);
        if (policy) {
          dataForPrompt.focusedPolicy = policy;
          focusedPolicyId = policyId;
        }
      }
      break;
    }

    case 'show_expiring_policies': {
      const policies = await getExpiringPolicies();
      dataForPrompt.policies = policies;
      break;
    }

    case 'create_compliance_check':
    case 'create_portfolio_analysis':
    case 'create_client_summary':
    case 'create_meeting_prep':
    case 'create_report':
    case 'run_compliance_check':
    case 'show_portfolio':
    case 'create_proposal':
    case 'compare_options':
    case 'generate_report': {
      const docClientName = entities.client_name as string;
      const docClientId = resolvedContext?.client_id || context?.focused_client_id || (entities.client_id as string);
      const docTaskId = resolvedContext?.task_id || context?.focused_task_id;

      const docPromises: Promise<void>[] = [];

      if (docClientName) {
        docPromises.push(
          getClientByName(docClientName).then(async (client) => {
            if (client) {
              dataForPrompt.focusedClient = client;
              focusedClientId = client.client_id;
              const policies = await getPoliciesForClient(client.client_id);
              if (policies.length > 0) {
                dataForPrompt.policies = policies;
              }
            }
          })
        );
      } else if (docClientId) {
        docPromises.push(
          Promise.all([
            getClientById(docClientId),
            getPoliciesForClient(docClientId),
          ]).then(([client, policies]) => {
            if (client) {
              dataForPrompt.focusedClient = client;
              focusedClientId = client.client_id;
              if (policies.length > 0) {
                dataForPrompt.policies = policies;
              }
            }
          })
        );
      }

      if (docTaskId) {
        docPromises.push(
          getTaskById(docTaskId).then((task) => {
            if (task) {
              dataForPrompt.focusedTask = task;
              focusedTaskId = docTaskId;
            }
          })
        );
      }

      await Promise.all(docPromises);
      break;
    }

    case 'show_analytics':
    case 'show_dashboard': {
      const [allTasks, allClients, expiringPolicies] = await Promise.all([
        getTasks(),
        getClients(),
        getExpiringPolicies(),
      ]);
      dataForPrompt.tasks = allTasks;
      dataForPrompt.clients = allClients;
      dataForPrompt.policies = expiringPolicies;
      break;
    }

    case 'draft_email':
    case 'draft_birthday_message':
    case 'draft_renewal_notice': {
      const emailClientName = entities.client_name as string;
      const emailClientId = resolvedContext?.client_id || context?.focused_client_id;

      if (emailClientName) {
        const client = await getClientByName(emailClientName);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
          const policies = await getPoliciesForClient(client.client_id);
          if (policies.length > 0) {
            dataForPrompt.policies = policies;
          }
        }
      } else if (emailClientId) {
        const [client, policies] = await Promise.all([
          getClientById(emailClientId),
          getPoliciesForClient(emailClientId),
        ]);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
          if (policies.length > 0) {
            dataForPrompt.policies = policies;
          }
        }
      }
      break;
    }

    case 'show_calendar':
    case 'schedule_meeting':
    case 'set_reminder': {
      const calClientId = resolvedContext?.client_id || context?.focused_client_id;
      const calPromises: Promise<void>[] = [];

      calPromises.push(
        getTodaysTasks().then((tasks) => {
          dataForPrompt.tasks = tasks;
        })
      );

      if (calClientId) {
        calPromises.push(
          getClientById(calClientId).then((client) => {
            if (client) {
              dataForPrompt.focusedClient = client;
              focusedClientId = client.client_id;
            }
          })
        );
      }

      await Promise.all(calPromises);
      break;
    }

    case 'preview_document': {
      const docClientId = resolvedContext?.client_id || context?.focused_client_id;
      if (docClientId) {
        const [client, policies] = await Promise.all([
          getClientById(docClientId),
          getPoliciesForClient(docClientId),
        ]);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
        }
        if (policies.length > 0) {
          dataForPrompt.policies = policies;
        }
      }
      break;
    }

    case 'track_progress': {
      const progressClientId = resolvedContext?.client_id || context?.focused_client_id;
      if (progressClientId) {
        const client = await getClientById(progressClientId);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
        }
      }
      break;
    }

    case 'create_meeting_notes': {
      const mtgClientId = resolvedContext?.client_id || context?.focused_client_id;
      if (mtgClientId) {
        const [client, policies] = await Promise.all([
          getClientById(mtgClientId),
          getPoliciesForClient(mtgClientId),
        ]);
        if (client) {
          dataForPrompt.focusedClient = client;
          focusedClientId = client.client_id;
        }
        if (policies.length > 0) {
          dataForPrompt.policies = policies;
        }
      }
      break;
    }

    case 'show_renewals': {
      const renewalPolicies = await getExpiringPolicies();
      dataForPrompt.policies = renewalPolicies;
      break;
    }

    case 'bulk_action': {
      const [allTasks, expiringPolicies] = await Promise.all([
        getTasks(),
        getExpiringPolicies(),
      ]);
      dataForPrompt.tasks = allTasks;
      dataForPrompt.policies = expiringPolicies;
      break;
    }

    case 'greeting':
    case 'help': {
      const [todaysTasks, pendingReviews] = await Promise.all([
        getTodaysTasks(),
        getPendingReviewTasks(),
      ]);
      dataForPrompt.tasks = [...todaysTasks.slice(0, 3), ...pendingReviews.slice(0, 2)];
      break;
    }

    default: {
      const tasks = await getTodaysTasks();
      dataForPrompt.tasks = tasks.slice(0, 5);
      break;
    }
  }

  return {
    formattedData: formatDataContext(dataForPrompt),
    focusedTaskId,
    focusedClientId,
    focusedPolicyId,
  };
}
