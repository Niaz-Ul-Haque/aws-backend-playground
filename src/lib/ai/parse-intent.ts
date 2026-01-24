/**
 * Intent Classification and Entity Extraction
 * Determines what the user wants and extracts relevant entities from their message
 */

import type {
  UserIntent,
  ExtractedEntities,
  IntentClassification,
  IntentPattern,
  ResolvedContext,
} from '../../types';
import type { ChatContext } from '../../types';

/**
 * Intent patterns with their regex matchers
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // Task-related intents
  {
    intent: 'show_todays_tasks',
    patterns: [
      /what.*(?:do i have|tasks?).*today/i,
      /today'?s?\s*tasks?/i,
      /tasks?\s*for\s*today/i,
      /what'?s?\s*on\s*(?:my|the)?\s*(?:agenda|schedule|plate)\s*(?:today)?/i,
      /show\s*(?:me\s*)?(?:my\s*)?today'?s?\s*tasks?/i,
      /what\s*(?:do\s*)?i\s*need\s*to\s*do\s*today/i,
    ],
  },
  {
    intent: 'show_all_tasks',
    patterns: [
      /show\s*(?:me\s*)?(?:all\s*)?(?:my\s*)?tasks?/i,
      /list\s*(?:all\s*)?(?:my\s*)?tasks?/i,
      /what\s*tasks?\s*(?:do\s*)?i\s*have/i,
      /all\s*(?:my\s*)?tasks?/i,
    ],
  },
  {
    intent: 'show_task_status',
    patterns: [
      /(?:what'?s?\s*the\s*)?status\s*(?:of|on)\s*/i,
      /update\s*(?:me\s*)?on\s*/i,
      /how'?s?\s*(?:the|that)\s*/i,
      /where\s*(?:are\s*we|do\s*we\s*stand)\s*(?:on|with)/i,
    ],
  },
  {
    intent: 'show_pending_reviews',
    patterns: [
      /what\s*(?:needs?|requires?)\s*(?:my\s*)?(?:approval|review)/i,
      /pending\s*(?:reviews?|approvals?)/i,
      /(?:show|list)\s*(?:me\s*)?(?:pending\s*)?reviews?/i,
      /anything\s*(?:to|for\s*me\s*to)\s*(?:review|approve)/i,
      /ai\s*(?:completed|generated)\s*(?:work|tasks?)/i,
    ],
  },
  {
    intent: 'approve_task',
    patterns: [
      /^approve(?:\s*(?:it|that|this))?$/i,
      /looks?\s*good/i,
      /(?:go\s*ahead|send\s*it|ship\s*it)/i,
      /approve\s*(?:the|this|that)?\s*(?:task|email|draft|work)?/i,
      /^(?:yes|yep|yeah|lgtm|ok|okay)$/i,
      /that'?s?\s*(?:good|great|perfect|fine)/i,
    ],
  },
  {
    intent: 'reject_task',
    patterns: [
      /(?:don'?t|do\s*not)\s*(?:send|approve|submit)/i,
      /reject(?:\s*(?:it|that|this))?/i,
      /needs?\s*(?:changes?|work|revision)/i,
      /not\s*(?:quite|ready|good)/i,
      /(?:revise|redo|change)\s*(?:it|this|that)?/i,
      /^no$/i,
    ],
  },
  {
    intent: 'complete_task',
    patterns: [
      /mark\s*(?:(?:it|that|this)\s*)?(?:as\s*)?(?:done|complete|finished)/i,
      /complete\s*(?:the|that|this)?\s*task/i,
      /(?:i'?ve?|i\s*have)\s*(?:done|finished|completed)/i,
      /task\s*(?:is\s*)?(?:done|complete)/i,
    ],
  },
  // Additional task intents
  {
    intent: 'show_overdue_tasks',
    patterns: [
      /overdue\s*tasks?/i,
      /past\s*due\s*tasks?/i,
      /late\s*tasks?/i,
      /what'?s?\s*(?:past\s*due|overdue|late)/i,
    ],
  },
  {
    intent: 'show_high_priority_tasks',
    patterns: [
      /(?:high|urgent)\s*priority\s*tasks?/i,
      /critical\s*tasks?/i,
      /important\s*tasks?/i,
      /urgent\s*(?:items?|things?|tasks?)/i,
    ],
  },
  {
    intent: 'show_tasks_this_week',
    patterns: [
      /tasks?\s*(?:for\s*)?this\s*week/i,
      /this\s*week'?s?\s*tasks?/i,
      /weekly\s*tasks?/i,
    ],
  },
  {
    intent: 'show_tasks_this_month',
    patterns: [
      /tasks?\s*(?:for\s*)?this\s*month/i,
      /this\s*month'?s?\s*tasks?/i,
      /monthly\s*tasks?/i,
    ],
  },
  {
    intent: 'show_in_progress_tasks',
    patterns: [
      /(?:tasks?\s*)?in\s*progress/i,
      /what\s*am\s*i\s*working\s*on/i,
      /current\s*tasks?/i,
    ],
  },
  {
    intent: 'show_completed_tasks',
    patterns: [
      /completed\s*tasks?/i,
      /finished\s*tasks?/i,
      /done\s*tasks?/i,
      /what\s*(?:did\s*i|have\s*i)\s*(?:finish|complete)/i,
    ],
  },
  // Client-related intents
  {
    intent: 'show_client_info',
    patterns: [
      /tell\s*me\s*about\s*/i,
      /(?:show|get)\s*(?:me\s*)?(?:info(?:rmation)?\s*(?:on|about|for))/i,
      /who\s*is\s*/i,
      /(?:client|customer)\s*(?:details?|info(?:rmation)?|profile)/i,
      /look\s*up\s*/i,
    ],
  },
  {
    intent: 'show_client_list',
    patterns: [
      /(?:show|list)\s*(?:me\s*)?(?:all\s*)?(?:my\s*)?clients?/i,
      /who\s*are\s*my\s*clients?/i,
      /client\s*list/i,
    ],
  },
  {
    intent: 'show_client_policies',
    patterns: [
      /(?:what|show)\s*(?:are\s*)?(?:.*?)?\s*policies?\s*(?:does|for)/i,
      /policies?\s*for\s*/i,
      /(?:his|her|their)\s*policies?/i,
    ],
  },
  // Additional client intents
  {
    intent: 'show_recent_clients',
    patterns: [
      /recent\s*(?:clients?|customers?)/i,
      /(?:new|latest)\s*(?:clients?|customers?)/i,
      /(?:clients?|customers?)\s*(?:added|created)\s*recently/i,
      /most\s*recent\s*(?:clients?|customers?)/i,
    ],
  },
  {
    intent: 'show_high_net_worth_clients',
    patterns: [
      /(?:high\s*net\s*worth|hnw|vip)\s*(?:clients?|customers?)/i,
      /wealthy\s*(?:clients?|customers?)/i,
      /top\s*(?:clients?|customers?)/i,
    ],
  },
  {
    intent: 'show_active_clients',
    patterns: [
      /active\s*(?:clients?|customers?)/i,
      /(?:clients?|customers?)\s*i'?m?\s*working\s*with/i,
    ],
  },
  {
    intent: 'show_inactive_clients',
    patterns: [
      /inactive\s*(?:clients?|customers?)/i,
      /dormant\s*(?:clients?|customers?)/i,
    ],
  },
  {
    intent: 'show_prospect_clients',
    patterns: [
      /prospect\s*(?:clients?|customers?)?/i,
      /potential\s*(?:clients?|customers?)/i,
      /leads?/i,
    ],
  },
  {
    intent: 'search_clients',
    patterns: [
      /(?:find|search|look\s*up)\s*(?:clients?|customers?)\s*(?:named|called)?\s*/i,
      /(?:clients?|customers?)\s*(?:named|called)\s*/i,
    ],
  },
  {
    intent: 'show_clients_by_portfolio',
    patterns: [
      /clients?\s*with\s*portfolio\s*(?:over|above|greater)/i,
      /largest\s*portfolios?/i,
      /top\s*portfolios?/i,
    ],
  },
  // Policy-related intents
  {
    intent: 'show_policy_info',
    patterns: [
      /(?:show|get)\s*(?:me\s*)?policy\s*(?:details?|info(?:rmation)?)/i,
      /policy\s*(?:number|#)?\s*\w+/i,
      /tell\s*me\s*about\s*(?:the\s*)?policy/i,
    ],
  },
  {
    intent: 'show_expiring_policies',
    patterns: [
      /(?:expiring|renewing)\s*(?:soon\s*)?policies?/i,
      /policies?\s*(?:that\s*)?(?:are\s*)?(?:expiring|due\s*for\s*renewal)/i,
      /upcoming\s*renewals?/i,
    ],
  },
  // Additional policy intents
  {
    intent: 'show_expiring_this_week',
    patterns: [
      /(?:policies?|coverage)\s*expiring\s*this\s*week/i,
      /urgent\s*renewals?/i,
      /this\s*week'?s?\s*(?:expir|renewal)/i,
    ],
  },
  {
    intent: 'show_expiring_this_month',
    patterns: [
      /(?:policies?|coverage)\s*expiring\s*this\s*month/i,
      /monthly\s*renewals?/i,
      /renewals?\s*(?:due\s*)?this\s*month/i,
    ],
  },
  {
    intent: 'show_policies_by_type',
    patterns: [
      /(?:life|auto|home|health|critical\s*illness|disability)\s*(?:insurance\s*)?policies?/i,
      /(?:rrsp|tfsa|segregated\s*fund)\s*(?:policies?|accounts?)?/i,
      /show\s*(?:all\s*)?(?:life|auto|home)\s*(?:insurance)?/i,
    ],
  },
  {
    intent: 'show_policies_by_status',
    patterns: [
      /(?:active|pending|expired|cancelled|lapsed)\s*policies?/i,
      /policies?\s*(?:that\s*are\s*)?(?:active|pending|expired)/i,
    ],
  },
  {
    intent: 'show_overdue_policies',
    patterns: [
      /overdue\s*(?:policies?|payments?)/i,
      /(?:policies?\s*with\s*)?(?:overdue|late)\s*payments?/i,
      /lapsed\s*policies?/i,
    ],
  },
  // Analytics/Dashboard intents
  {
    intent: 'show_dashboard',
    patterns: [
      /(?:give\s*me\s*)?(?:an?\s*)?(?:overview|summary|dashboard)/i,
      /what'?s?\s*(?:the\s*)?(?:status|situation)/i,
      /how\s*(?:am\s*i|are\s*things)\s*doing/i,
    ],
  },
  {
    intent: 'show_task_summary',
    patterns: [
      /how\s*many\s*tasks?/i,
      /task\s*(?:count|summary|breakdown)/i,
      /tasks?\s*(?:overview|statistics|stats)/i,
    ],
  },
  {
    intent: 'show_client_summary',
    patterns: [
      /how\s*many\s*(?:clients?|customers?)/i,
      /(?:client|customer)\s*(?:count|summary|breakdown)/i,
      /(?:client|customer)\s*(?:overview|statistics|stats)/i,
    ],
  },
  {
    intent: 'show_policy_summary',
    patterns: [
      /how\s*many\s*policies?/i,
      /policy\s*(?:count|summary|breakdown)/i,
      /(?:insurance|coverage)\s*(?:overview|summary)/i,
    ],
  },
  {
    intent: 'show_portfolio_summary',
    patterns: [
      /portfolio\s*(?:overview|summary)/i,
      /(?:aum|assets?\s*under\s*management)\s*(?:summary)?/i,
      /total\s*assets?/i,
      /what'?s?\s*my\s*(?:total\s*)?aum/i,
    ],
  },
  {
    intent: 'show_today_summary',
    patterns: [
      /what'?s?\s*(?:happening|going\s*on)\s*today/i,
      /today'?s?\s*(?:overview|summary)/i,
    ],
  },
  {
    intent: 'show_week_summary',
    patterns: [
      /weekly\s*(?:summary|overview)/i,
      /this\s*week'?s?\s*(?:overview|summary)/i,
    ],
  },
  // Communication intents
  {
    intent: 'draft_email',
    patterns: [
      /(?:draft|write|compose|create)\s*(?:an?\s*)?email/i,
      /email\s*(?:to|for)\s*/i,
      /send\s*(?:an?\s*)?(?:email|message)\s*to/i,
    ],
  },
  {
    intent: 'draft_meeting_notes',
    patterns: [
      /(?:draft|write|create)\s*meeting\s*notes?/i,
      /summarize\s*(?:the|our)\s*meeting/i,
      /meeting\s*summary/i,
    ],
  },
  {
    intent: 'draft_birthday_message',
    patterns: [
      /birthday\s*(?:message|wish|greeting)\s*(?:for|to)?/i,
      /(?:send|draft)\s*birthday\s*/i,
    ],
  },
  {
    intent: 'draft_renewal_notice',
    patterns: [
      /(?:draft|write|create)\s*renewal\s*(?:notice|reminder)/i,
      /policy\s*(?:expiry|expiration)\s*(?:reminder|notice)/i,
    ],
  },
  // Document generation intents
  {
    intent: 'create_compliance_check',
    patterns: [
      /(?:create|generate|run|do|make|prepare)\s*(?:a\s*)?compliance\s*(?:check|report|review|audit)/i,
      /compliance\s*(?:check|report|review|audit)/i,
      /check\s*(?:his|her|their|the)?\s*compliance/i,
      /kyc\s*(?:check|review|report)/i,
      /suitability\s*(?:check|review|assessment)/i,
    ],
  },
  {
    intent: 'create_portfolio_analysis',
    patterns: [
      /(?:create|generate|do|make|prepare|show|give)\s*(?:a\s*)?(?:portfolio|investment)\s*(?:analysis|review|breakdown|summary)/i,
      /(?:portfolio|investment)\s*(?:analysis|review|breakdown)/i,
      /analyze\s*(?:his|her|their|the)?\s*portfolio/i,
      /(?:detailed|full)\s*portfolio\s*/i,
    ],
  },
  {
    intent: 'create_client_summary',
    patterns: [
      /(?:create|generate|make|prepare)\s*(?:a\s*)?(?:client|customer)\s*(?:summary|overview|brief)/i,
      /summarize\s*(?:the\s*)?(?:client|customer)/i,
      /(?:client|customer)\s*(?:summary|overview|brief)/i,
    ],
  },
  {
    intent: 'create_meeting_prep',
    patterns: [
      /(?:prepare|create|generate|make)\s*(?:for\s*)?(?:the\s*)?meeting/i,
      /meeting\s*(?:prep|preparation|materials?)/i,
      /(?:get|make)\s*(?:me\s*)?ready\s*for\s*(?:the\s*)?meeting/i,
      /(?:prepare|create)\s*(?:a\s*)?(?:meeting\s*)?agenda/i,
    ],
  },
  {
    intent: 'create_report',
    patterns: [
      /(?:create|generate|make|write|prepare|draft)\s*(?:a\s*)?(?:report|document|draft)/i,
      /(?:prepare|create)\s*(?:a\s*)?draft\s*(?:based\s*on|from|using)/i,
      /(?:generate|create)\s*(?:it|this|that)\s*(?:for\s*me)?/i,
    ],
  },
  // Search intents
  {
    intent: 'global_search',
    patterns: [
      /^(?:search|find|look\s*(?:up|for))\s+(?!clients?|customers?|tasks?|policies?)/i,
    ],
  },
  {
    intent: 'search_tasks',
    patterns: [
      /(?:find|search)\s*tasks?\s*(?:about|for|with)/i,
      /search\s*(?:for\s*)?tasks?/i,
    ],
  },
  {
    intent: 'search_policies',
    patterns: [
      /(?:find|search)\s*(?:for\s*)?polic(?:y|ies)/i,
      /polic(?:y|ies)\s*(?:number|#)?\s*[A-Z0-9-]+/i,
    ],
  },
  // General intents
  {
    intent: 'greeting',
    patterns: [
      /^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|howdy)(?:\s|!|,|$)/i,
      /^what'?s?\s*up/i,
      /^how\s*(?:are\s*you|do\s*you\s*do)/i,
    ],
  },
  {
    intent: 'help',
    patterns: [
      /(?:what\s*can\s*you\s*do|help\s*me|how\s*does\s*this\s*work)/i,
      /^help$/i,
      /your\s*(?:capabilities|features)/i,
      /what\s*(?:are\s*you|can\s*you\s*help\s*(?:me\s*)?with)/i,
    ],
  },
];

/**
 * Extract client name from message
 */
function extractClientName(message: string): string | undefined {
  // Pattern: "tell me about [Name]", "client [Name]", "[Name]'s policies"
  const patterns = [
    /tell\s*me\s*about\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:client|customer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /who\s*is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /look\s*up\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'s\s*(?:policies?|portfolio|info)/i,
    /policies?\s*for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /info(?:rmation)?\s*(?:on|about|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract task title or reference from message
 */
function extractTaskReference(message: string): string | undefined {
  // Pattern: "task [title]", "the [title] task"
  const patterns = [
    /task\s*(?:called|named|titled)?\s*["']?([^"']+)["']?/i,
    /the\s+(.+?)\s+task/i,
    /status\s*(?:of|on)\s*(?:the\s*)?(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract policy number from message
 */
function extractPolicyNumber(message: string): string | undefined {
  const pattern = /policy\s*(?:number|#|num)?\s*([A-Z]{2,}-\d{4}-\d+|\d+)/i;
  const match = message.match(pattern);
  return match ? match[1] : undefined;
}

/**
 * Extract all entities from a message
 */
function extractEntities(message: string): ExtractedEntities {
  const entities: ExtractedEntities = {};

  const clientName = extractClientName(message);
  if (clientName) {
    entities.client_name = clientName;
  }

  const taskRef = extractTaskReference(message);
  if (taskRef) {
    entities.task_title = taskRef;
  }

  const policyNum = extractPolicyNumber(message);
  if (policyNum) {
    entities.policy_number = policyNum;
  }

  // Check for time references
  if (/today/i.test(message)) {
    entities.time_range = 'today';
  } else if (/this\s*week|week/i.test(message)) {
    entities.time_range = 'week';
  } else if (/overdue|past\s*due|late/i.test(message)) {
    entities.time_range = 'overdue';
  }

  return entities;
}

/**
 * Classify the intent of a user message
 */
export function classifyIntent(message: string): IntentClassification {
  const normalizedMessage = message.trim();
  const entities = extractEntities(normalizedMessage);

  // Check each pattern
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        return {
          intent,
          entities,
          confidence: 0.9,
          raw_message: message,
        };
      }
    }
  }

  // Default to general question
  return {
    intent: 'general_question',
    entities,
    confidence: 0.5,
    raw_message: message,
  };
}

/**
 * Resolve context references ("it", "that", "this") to actual IDs
 */
export function resolveContextReferences(
  message: string,
  context?: ChatContext
): ResolvedContext {
  const result: ResolvedContext = {
    resolved_from: 'none',
  };

  // Check for explicit references first (handled by entity extraction)
  // Then check for pronouns that need context resolution
  const hasContextReference = /\b(?:it|that|this|the\s*task|the\s*client|the\s*policy)\b/i.test(
    message
  );

  if (hasContextReference && context) {
    if (context.focused_task_id) {
      result.task_id = context.focused_task_id;
      result.resolved_from = 'context';
    }
    if (context.focused_client_id) {
      result.client_id = context.focused_client_id;
      result.resolved_from = 'context';
    }
    if (context.focused_policy_id) {
      result.policy_id = context.focused_policy_id;
      result.resolved_from = 'context';
    }
  }

  return result;
}

/**
 * Determine if the intent requires a specific entity
 */
export function intentRequiresEntity(
  intent: UserIntent
): { entity: string; required: boolean }[] {
  const requirements: Record<string, { entity: string; required: boolean }[]> = {
    show_client_info: [{ entity: 'client', required: true }],
    show_client_policies: [{ entity: 'client', required: true }],
    show_policy_info: [{ entity: 'policy', required: true }],
    show_task_status: [{ entity: 'task', required: true }],
    approve_task: [{ entity: 'task', required: true }],
    reject_task: [{ entity: 'task', required: true }],
    complete_task: [{ entity: 'task', required: true }],
  };

  return requirements[intent] || [];
}
