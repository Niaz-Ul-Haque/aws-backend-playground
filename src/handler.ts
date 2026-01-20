import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';

interface ZaiChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface ZaiChatResponse {
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

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  console.log('========== HANDLER START ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  const method = event.requestContext?.http?.method || 'UNKNOWN';
  const path = event.requestContext?.http?.path || '/';
  console.log('HTTP Method:', method);
  console.log('Path:', path);

  // Parse user message from request body
  let userMessage = 'Hello! How can you help me today?';
  if (event.body) {
    console.log('Raw body received:', event.body);
    try {
      const body = JSON.parse(event.body);
      console.log('Parsed body:', body);
      userMessage = body.message || userMessage;
      console.log('User message extracted:', userMessage);
    } catch (error) {
      console.error('Error parsing body:', error);
    }
  } else {
    console.log('No body in request, using default message');
  }

  // Z.ai API configuration
  console.log('========== ENVIRONMENT CHECK ==========');
  const LLM_API_KEY = process.env.LLM_API_KEY;
  const Z_AI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
  console.log('API URL:', Z_AI_API_URL);
  console.log('API Key present:', !!LLM_API_KEY);
  console.log('API Key length:', LLM_API_KEY?.length || 0);
  console.log('API Key first 10 chars:', LLM_API_KEY?.substring(0, 10) + '...');
  console.log('All env vars:', Object.keys(process.env));

  if (!LLM_API_KEY) {
    console.error('FATAL: API key is missing!');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Z.ai API key not configured',
      }),
    };
  }

  try {
    // Prepare the request to Z.ai
    const requestBody: ZaiChatRequest = {
      model: 'glm-4.7-flashx',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly and helpful personal assistant. Be warm, supportive, and conversational in your responses. Keep your answers clear and concise while maintaining a pleasant, approachable tone.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      temperature: 1.0,
      max_tokens: 1024,
    };

    console.log('========== API REQUEST PREPARATION ==========');
    console.log('Target API:', Z_AI_API_URL);
    console.log('Model:', requestBody.model);
    console.log('Temperature:', requestBody.temperature);
    console.log('Max tokens:', requestBody.max_tokens);
    console.log('Messages count:', requestBody.messages.length);
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));

    // Test DNS resolution first
    console.log('========== DNS/CONNECTIVITY TEST ==========');
    console.log('Testing connectivity to api.z.ai...');
    try {
      const dnsStartTime = Date.now();
      const dnsTest = await fetch('https://api.z.ai', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      }).catch(e => {
        console.error('DNS/connectivity test failed:', e.message);
        console.error('Error name:', e.name);
        console.error('Error stack:', e.stack);
        return null;
      });
      const dnsDuration = Date.now() - dnsStartTime;
      console.log('DNS test completed in', dnsDuration, 'ms');
      console.log('DNS test result:', dnsTest ? 'SUCCESS' : 'FAILED');
      if (dnsTest) {
        console.log('DNS test status:', dnsTest.status);
        console.log('DNS test headers:', dnsTest.headers);
      }
    } catch (e) {
      console.error('DNS test outer error:', e);
    }

    // Create abort controller for timeout (reduced to 55 seconds to leave room for Lambda processing)
    console.log('========== FETCH REQUEST ==========');
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error('❌ TIMEOUT: Aborting request after 55 seconds');
      console.error('Time elapsed without response from API');
      controller.abort();
    }, 55000); // 55 second timeout

    try {
      const fetchStartTime = Date.now();
      console.log('Starting fetch request at:', new Date().toISOString());
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LLM_API_KEY?.substring(0, 10) + '...'
      });
      
      // Call Z.ai API
      console.log('Initiating POST request to:', Z_AI_API_URL);
      const response = await fetch(Z_AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      const fetchDuration = Date.now() - fetchStartTime;
      console.log('✅ Fetch completed in', fetchDuration, 'ms');
      clearTimeout(timeout);
      
      console.log('========== RESPONSE RECEIVED ==========');
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('========== API ERROR RESPONSE ==========');
        console.error('Error status:', response.status);
        console.error('Error status text:', response.statusText);
        const errorText = await response.text();
        console.error('Error body:', errorText);
        console.error('Full response headers:', Object.fromEntries(response.headers.entries()));
        return {
          statusCode: response.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Failed to get response from Z.ai',
            details: errorText,
          }),
        };
      }

      console.log('========== SUCCESS RESPONSE ==========');
      const responseStartTime = Date.now();
      const aiResponse = await response.json() as ZaiChatResponse;
      const responseParseDuration = Date.now() - responseStartTime;
      console.log('Response parsed in', responseParseDuration, 'ms');
      console.log('AI Response:', JSON.stringify(aiResponse, null, 2));
      const assistantMessage = aiResponse.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: assistantMessage,
          userMessage,
          model: 'glm-4.7-flash',
          usage: aiResponse.usage,
        }),
      };
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error('========== FETCH ERROR ==========');
      console.error('Error type:', fetchError instanceof Error ? fetchError.name : typeof fetchError);
      console.error('Error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
      console.error('Error stack:', fetchError instanceof Error ? fetchError.stack : 'N/A');
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ TIMEOUT ERROR: Request was aborted after timeout');
        return {
          statusCode: 504,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Request timeout',
            message: 'The API request took too long to respond',
          }),
        };
      }
      console.error('Rethrowing error for outer catch block');
      throw fetchError;
    }
  } catch (error) {
    console.error('========== OUTER ERROR HANDLER ==========');
    console.error('Error calling Z.ai:', error);
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
