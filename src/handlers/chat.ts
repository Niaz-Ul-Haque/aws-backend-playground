/**
 * Chat Handler - Main chat endpoint
 * Handles conversation with the AI assistant (Ciri)
 * 
 * POST /api/chat
 * Request: { message: string, context?: ChatContext }
 * Response: ChatResponse
 */

import type { APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ChatRequest, ChatResponse, ChatContext, Card, ExtractedEntities } from '../types';
import { getHttpMethod, getPath, type ApiGatewayEvent } from '../lib/utils/api-gateway';
import {
  successResponse,
  errorResponse,
  parseBody,
  logRequest,
} from '../lib/utils/response';
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

/** Return an appropriate max_tokens budget for the given intent */
function maxTokensForIntent(intent: string): number {
  switch (intent) {
    // Simple / short responses
    case 'greeting':
    case 'help':
    case 'approve_task':
    case 'reject_task':
    case 'complete_task':
      return 800;

    // Listing / display intents
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

    // Document generation intents (need full output budget)
    case 'create_compliance_check':
    case 'create_portfolio_analysis':
    case 'create_client_summary':
    case 'create_meeting_prep':
    case 'create_report':
    case 'draft_email':
    case 'draft_meeting_notes':
    case 'draft_birthday_message':
    case 'draft_renewal_notice':
      return 4000;

    default:
      return 2000;
  }
}

/**
 * Main chat handler
 */
export async function handler(
  event: ApiGatewayEvent
): Promise<APIGatewayProxyResultV2> {
  const method = getHttpMethod(event);
  const path = getPath(event);

  console.log('=== Chat Handler Start ===');
  console.log('Method:', method);
  console.log('Path:', path);
  console.log('Body:', event.body);
  console.log('Query params:', event.queryStringParameters);
  console.log('Path params:', event.pathParameters);
  logRequest(method, path, event.body);

  // Only allow POST
  if (method !== 'POST') {
    console.log('Invalid method, returning 405');
    return errorResponse('Method not allowed', 405);
  }

  // Parse request body
  const body = parseBody<ChatRequest>(event.body);
  console.log('Parsed body:', JSON.stringify(body));
  if (!body || !body.message) {
    console.log('Invalid request body, message required');
    return errorResponse('Message is required', 400);
  }

  try {
    console.log('Processing chat message:', body.message);
    const response = await processChat(body.message, body.context);
    console.log('Chat response generated successfully');
    console.log('=== Chat Handler End ===');
    return successResponse(response);
  } catch (error) {
    console.error('=== Chat Handler Error ===');
    console.error('Chat error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return errorResponse(
      'Failed to process chat message',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Process a chat message and generate a response
 */
async function processChat(
  message: string,
  context?: ChatContext
): Promise<ChatResponse> {
  console.log('processChat - Starting chat processing');
  console.log('Message:', message);
  console.log('Context:', JSON.stringify(context));
  
  // Step 1: Classify intent
  console.log('Step 1: Classifying intent...');
  const intentResult = classifyIntent(message);
  console.log('Intent:', intentResult.intent, 'Confidence:', intentResult.confidence);
  console.log('Entities:', JSON.stringify(intentResult.entities));

  // Step 2: Resolve context references ("it", "that", etc.)
  console.log('Step 2: Resolving context references...');
  const resolvedContext = resolveContextReferences(message, context);
  console.log('Resolved context:', JSON.stringify(resolvedContext));

  // Step 3: Gather relevant data based on intent
  console.log('Step 3: Gathering data for intent...');
  const dataContext = await gatherDataForIntent(intentResult.intent, intentResult.entities, context, resolvedContext);
  console.log('Data context gathered, focused IDs:', {
    task: dataContext.focusedTaskId,
    client: dataContext.focusedClientId,
    policy: dataContext.focusedPolicyId
  });

  // Step 4: Handle action intents (approve, reject, complete)
  console.log('Step 4: Handling action intents...');
  let tasksUpdated = false;
  if (intentResult.intent === 'approve_task' && resolvedContext.task_id) {
    console.log('Approving task:', resolvedContext.task_id);
    try {
      await approveTask(resolvedContext.task_id);
      tasksUpdated = true;
      console.log('Task approved successfully');
    } catch (error) {
      console.error('Error approving task:', error);
    }
  } else if (intentResult.intent === 'reject_task' && resolvedContext.task_id) {
    console.log('Rejecting task:', resolvedContext.task_id);
    try {
      await rejectTask(resolvedContext.task_id);
      tasksUpdated = true;
      console.log('Task rejected successfully');
    } catch (error) {
      console.error('Error rejecting task:', error);
    }
  } else if (intentResult.intent === 'complete_task' && resolvedContext.task_id) {
    console.log('Completing task:', resolvedContext.task_id);
    try {
      await completeTask(resolvedContext.task_id);
      tasksUpdated = true;
      console.log('Task completed successfully');
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }

  // Step 5: Build the prompt
  console.log('Step 5: Building prompts...');
  const systemPrompt = buildSystemPrompt();
  const intentPrompt = buildPromptWithIntent(intentResult.intent, dataContext.formattedData);
  console.log('Prompts built, system prompt length:', systemPrompt.length);

  // Step 6: Call the LLM
  const maxTokens = maxTokensForIntent(intentResult.intent);
  console.log('Step 6: Calling LLM... (maxTokens:', maxTokens, ')');
  const llmResponse = await callLLM(
    systemPrompt + intentPrompt,
    message,
    undefined,
    { maxTokens }
  );
  console.log('LLM response received, length:', llmResponse.length);

  // Step 7: Parse the response for cards
  console.log('Step 7: Parsing response for cards...');
  const parsedResponse = parseContent(llmResponse);
  console.log('Cards found:', parsedResponse.cards.length);

  // Step 8: Build the updated context
  console.log('Step 8: Building updated context...');
  const updatedContext: ChatContext = {
    ...context,
    last_intent: intentResult.intent,
    focused_task_id: dataContext.focusedTaskId || context?.focused_task_id,
    focused_client_id: dataContext.focusedClientId || context?.focused_client_id,
    focused_policy_id: dataContext.focusedPolicyId || context?.focused_policy_id,
  };

  console.log('processChat - Completed successfully');
  console.log('Updated context:', JSON.stringify(updatedContext));
  return {
    content: llmResponse,
    cards: parsedResponse.cards.length > 0 ? parsedResponse.cards : undefined,
    context: updatedContext,
    tasks_updated: tasksUpdated || undefined,
  };
}

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
  console.log('gatherDataForIntent - Intent:', intent);
  console.log('Entities:', JSON.stringify(entities));
  console.log('Resolved context:', JSON.stringify(resolvedContext));
  
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
      console.log('Fetching today\'s tasks...');
      const tasks = await getTodaysTasks();
      console.log('Today\'s tasks count:', tasks.length);
      dataForPrompt.tasks = tasks;
      break;
    }

    case 'show_all_tasks': {
      console.log('Fetching all tasks...');
      const tasks = await getTasks();
      console.log('All tasks count:', tasks.length);
      dataForPrompt.tasks = tasks;
      break;
    }

    case 'show_pending_reviews': {
      console.log('Fetching pending review tasks...');
      const tasks = await getPendingReviewTasks();
      console.log('Pending review tasks count:', tasks.length);
      dataForPrompt.tasks = tasks;
      // Focus on the first pending review task
      if (tasks.length > 0) {
        focusedTaskId = tasks[0].task_id;
        dataForPrompt.focusedTask = tasks[0];
        console.log('Focused on task:', focusedTaskId);
      }
      break;
    }

    case 'show_task_status':
    case 'approve_task':
    case 'reject_task':
    case 'complete_task': {
      // Try to get task from context or entities
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
        // Parallelize: fetch client and policies at the same time
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

    // Document generation intents - use context from conversation
    case 'create_compliance_check':
    case 'create_portfolio_analysis':
    case 'create_client_summary':
    case 'create_meeting_prep':
    case 'create_report': {
      const docClientName = entities.client_name as string;
      const docClientId = resolvedContext?.client_id || context?.focused_client_id || (entities.client_id as string);
      const docTaskId = resolvedContext?.task_id || context?.focused_task_id;

      // Build an array of parallel fetches
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
        // Parallelize client + policies when we already have the ID
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

    case 'greeting':
    case 'help': {
      // For greetings, show a summary of what's pending
      const [todaysTasks, pendingReviews] = await Promise.all([
        getTodaysTasks(),
        getPendingReviewTasks(),
      ]);
      dataForPrompt.tasks = [...todaysTasks.slice(0, 3), ...pendingReviews.slice(0, 2)];
      break;
    }

    default: {
      // For general questions, provide some context
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
