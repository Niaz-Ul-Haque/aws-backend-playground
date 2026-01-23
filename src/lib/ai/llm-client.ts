/**
 * LLM Client
 * Handles communication with the Z.ai API
 */

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  thinking?: {
    type: 'enabled' | 'disabled';
  };
}

interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Z.ai API configuration
const Z_AI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const DEFAULT_MODEL = 'glm-4.7-flashx';
const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Get the API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable not set');
  }
  return apiKey;
}

function getApiUrl(): string {
  return process.env.LLM_API_URL || Z_AI_API_URL;
}

function getModel(): string {
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

function getTimeoutMs(): number {
  const raw = process.env.LLM_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * Call the LLM with a system prompt and user message
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: LLMMessage[]
): Promise<string> {
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history if provided
  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory);
  }

  // Add the current user message
  messages.push({ role: 'user', content: userMessage });

  const requestBody: LLMRequest = {
    model: getModel(),
    messages,
    temperature: 0.7,
    max_tokens: 4000,
    thinking: {
      type: 'disabled',
    },
  };

  console.log('Calling LLM with messages:', messages.length);

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(getTimeoutMs()),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM API error:', response.status, errorText);
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

   const data = await response.json() as LLMResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from LLM');
  }

  const content = data.choices[0].message.content;
  console.log('LLM response length:', content.length);

  return content;
}

/**
 * Call LLM with full message array
 */
export async function callLLMWithMessages(
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const requestBody: LLMRequest = {
    model: getModel(),
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4000,
    thinking: {
      type: 'disabled',
    },
  };

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(getTimeoutMs()),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as LLMResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from LLM');
  }

  return data.choices[0].message.content;
}
