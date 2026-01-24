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

// Zhipu AI API configuration (using BigModel endpoint which is more reliable from AWS)
const Z_AI_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
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

  const apiUrl = getApiUrl();
  const model = getModel();
  const timeoutMs = getTimeoutMs();
  const apiKeyPreview = getApiKey().substring(0, 8) + '...';

  const requestBody: LLMRequest = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4000,
    thinking: {
      type: 'disabled',
    },
  };

  // Detailed pre-request logging
  console.log('=== LLM Request Config ===');
  console.log('API URL:', apiUrl);
  console.log('Model:', model);
  console.log('Timeout (ms):', timeoutMs);
  console.log('API Key (preview):', apiKeyPreview);
  console.log('Message count:', messages.length);
  console.log('Request body size (bytes):', JSON.stringify(requestBody).length);
  console.log('System prompt length:', systemPrompt.length);
  console.log('User message length:', userMessage.length);
  console.log('==========================');

  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting LLM API request...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] LLM API response received`);
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    console.log('Response elapsed time (ms):', elapsed);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== LLM API Error Response ===');
      console.error('Status:', response.status);
      console.error('Status text:', response.statusText);
      console.error('Error body:', errorText);
      console.error('==============================');
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as LLMResponse;
    console.log('Response parsed successfully');
    console.log('Choices count:', data.choices?.length ?? 0);
    if (data.usage) {
      console.log('Token usage:', JSON.stringify(data.usage));
    }

    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in LLM response:', JSON.stringify(data));
      throw new Error('No response from LLM');
    }

    const content = data.choices[0].message.content;
    console.log('LLM response content length:', content.length);
    console.log('Finish reason:', data.choices[0].finish_reason);
    console.log('Total request duration (ms):', Date.now() - startTime);

    return content;
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    console.error('=== LLM Request Failed ===');
    console.error('Elapsed time before failure (ms):', elapsed);
    console.error('Error type:', error?.constructor?.name);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Check for network-specific error details
      const errorWithCause = error as Error & { cause?: Error & { code?: string } };
      if (errorWithCause.cause) {
        console.error('=== Error Cause Details ===');
        console.error('Cause type:', errorWithCause.cause.constructor?.name);
        console.error('Cause message:', errorWithCause.cause.message);
        console.error('Cause code:', errorWithCause.cause.code);
        if (errorWithCause.cause.stack) {
          console.error('Cause stack:', errorWithCause.cause.stack);
        }
        console.error('===========================');
      }

      // Check for abort/timeout
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.error('Request was aborted/timed out');
        console.error('Configured timeout was:', timeoutMs, 'ms');
      }
    }

    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('==========================');

    throw error;
  }
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
  const apiUrl = getApiUrl();
  const model = getModel();
  const timeoutMs = getTimeoutMs();
  const apiKeyPreview = getApiKey().substring(0, 8) + '...';

  const requestBody: LLMRequest = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4000,
    thinking: {
      type: 'disabled',
    },
  };

  // Detailed pre-request logging
  console.log('=== LLM Request Config (callLLMWithMessages) ===');
  console.log('API URL:', apiUrl);
  console.log('Model:', model);
  console.log('Timeout (ms):', timeoutMs);
  console.log('API Key (preview):', apiKeyPreview);
  console.log('Message count:', messages.length);
  console.log('Request body size (bytes):', JSON.stringify(requestBody).length);
  console.log('================================================');

  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting LLM API request (callLLMWithMessages)...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] LLM API response received (callLLMWithMessages)`);
    console.log('Response status:', response.status);
    console.log('Response elapsed time (ms):', elapsed);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== LLM API Error Response ===');
      console.error('Status:', response.status);
      console.error('Error body:', errorText);
      console.error('==============================');
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as LLMResponse;

    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in LLM response:', JSON.stringify(data));
      throw new Error('No response from LLM');
    }

    console.log('LLM response content length:', data.choices[0].message.content.length);
    console.log('Total request duration (ms):', Date.now() - startTime);

    return data.choices[0].message.content;
  } catch (error: unknown) {
    const elapsed = Date.now() - startTime;
    console.error('=== LLM Request Failed (callLLMWithMessages) ===');
    console.error('Elapsed time before failure (ms):', elapsed);
    console.error('Error type:', error?.constructor?.name);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      const errorWithCause = error as Error & { cause?: Error & { code?: string } };
      if (errorWithCause.cause) {
        console.error('=== Error Cause Details ===');
        console.error('Cause type:', errorWithCause.cause.constructor?.name);
        console.error('Cause message:', errorWithCause.cause.message);
        console.error('Cause code:', errorWithCause.cause.code);
        console.error('===========================');
      }
    }

    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('===============================================');

    throw error;
  }
}

/**
 * Diagnostic function to test LLM API connectivity
 * Returns detailed information about the connection attempt
 */
export async function testLLMConnectivity(): Promise<{
  success: boolean;
  config: {
    apiUrl: string;
    model: string;
    timeoutMs: number;
    hasApiKey: boolean;
  };
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
  result?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  error?: {
    type: string;
    message: string;
    code?: string;
    cause?: {
      type: string;
      message: string;
      code?: string;
    };
  };
}> {
  const apiUrl = getApiUrl();
  const model = getModel();
  const timeoutMs = getTimeoutMs();
  let hasApiKey = false;

  try {
    getApiKey();
    hasApiKey = true;
  } catch {
    hasApiKey = false;
  }

  const config = { apiUrl, model, timeoutMs, hasApiKey };
  const startTime = new Date().toISOString();
  const startMs = Date.now();

  console.log('=== LLM Connectivity Test ===');
  console.log('Config:', JSON.stringify(config));
  console.log('Start time:', startTime);

  try {
    // Simple test request with minimal payload
    const testBody = {
      model,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hasApiKey ? getApiKey() : 'test-key'}`,
      },
      body: JSON.stringify(testBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const endTime = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    console.log('Connection successful!');
    console.log('Status:', response.status);
    console.log('Duration (ms):', durationMs);

    return {
      success: true,
      config,
      timing: { startTime, endTime, durationMs },
      result: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
    };
  } catch (error: unknown) {
    const endTime = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    console.error('Connection failed!');
    console.error('Duration before failure (ms):', durationMs);

    const errorInfo: {
      type: string;
      message: string;
      code?: string;
      cause?: { type: string; message: string; code?: string };
    } = {
      type: error?.constructor?.name || 'Unknown',
      message: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error) {
      const errorWithCause = error as Error & { cause?: Error & { code?: string } };
      if (errorWithCause.cause) {
        errorInfo.cause = {
          type: errorWithCause.cause.constructor?.name || 'Unknown',
          message: errorWithCause.cause.message,
          code: errorWithCause.cause.code,
        };
      }
    }

    console.error('Error info:', JSON.stringify(errorInfo));

    return {
      success: false,
      config,
      timing: { startTime, endTime, durationMs },
      error: errorInfo,
    };
  }
}
