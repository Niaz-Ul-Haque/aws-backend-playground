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
