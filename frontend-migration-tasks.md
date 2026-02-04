# Frontend Migration Guide: Streaming Chat with Real-Time Status Updates

IMP: This document describes the backend changes for streaming chat responses and provides detailed implementation steps for the frontend team.

---

## Table of Contents

1. [Overview](#overview)
2. [What Changed in the Backend](#what-changed-in-the-backend)
3. [New Endpoints](#new-endpoints)
4. [SSE Event Format](#sse-event-format)
5. [Status Phases](#status-phases)
6. [Frontend Implementation Guide](#frontend-implementation-guide)
7. [TypeScript Types](#typescript-types)
8. [Error Handling](#error-handling)
9. [Example Implementation](#example-implementation)
10. [Testing](#testing)
11. [Migration Checklist](#migration-checklist)

---

## Overview

The backend has been upgraded to support **Server-Sent Events (SSE)** for the chat endpoint. This enables:

- **Real-time status updates** during message processing (no more stuck "Gathering context...")
- **Progressive feedback** showing exactly what Ciri is doing at each step
- **Improved user experience** with visual progress indicators

### Before vs After

| Before | After |
|--------|-------|
| Single request, wait for full response | Streaming request with live status updates |
| "Gathering context..." stuck for 10+ seconds | Status changes every 1-2 seconds |
| No visibility into processing stages | Clear phases: "Understanding request", "Thinking...", etc. |
| Timeout errors with no context | Graceful error handling with partial context |

---

## What Changed in the Backend

### API Gateway Migration

- **Old:** REST API Gateway (AWS::Serverless::Api)
- **New:** HTTP API Gateway (AWS::Serverless::HttpApi)

This change was necessary because REST API doesn't support Lambda Response Streaming.

### New Streaming Function

A new Lambda function `ChatStreamFunction` has been added that uses **Lambda Function URL** with `InvokeMode: RESPONSE_STREAM`. This bypasses API Gateway's buffering and allows true streaming responses.

---

## New Endpoints

### 1. Streaming Chat Endpoint (Recommended)

Use this endpoint for the chat interface to get real-time status updates.

```
POST {ChatStreamFunctionUrl}
```

**Important:** The streaming endpoint URL is a **Lambda Function URL**, not an API Gateway URL. Get it from the CloudFormation stack output `ChatStreamEndpoint`.

**Example URL format:**
```
https://{random-id}.lambda-url.{region}.on.aws/
```

### 2. Non-Streaming Chat Endpoint (Fallback)

The original endpoint still works for backward compatibility:

```
POST https://{api-id}.execute-api.{region}.amazonaws.com/{stage}/api/chat
```

This returns the complete response in a single JSON payload (no streaming).

---

## SSE Event Format

The streaming endpoint returns Server-Sent Events with this format:

```
event: {event_type}
data: {json_payload}

```

### Event Types

| Event Type | Description | When Sent |
|------------|-------------|-----------|
| `status` | Processing status update | At each processing phase |
| `progress` | Progress percentage update | Optionally, for granular progress |
| `partial` | Partial content chunk | When LLM streams content (future) |
| `result` | Final complete response | When processing completes |
| `error` | Error occurred | When an error occurs |

### Event Payload Structure

```typescript
interface SSEEventData {
  status?: StreamingStatus;    // Current phase
  message?: string;            // Human-readable message
  progress?: number;           // 0-100 percentage
  partial_content?: string;    // Partial LLM response (future)
  result?: ChatResponse;       // Final response object
  error?: string;              // Error message
}
```

---

## Status Phases

The backend sends these status phases in order:

| Status | Message | Progress | Description |
|--------|---------|----------|-------------|
| `connecting` | "Connected to Ciri" | 5% | Initial connection established |
| `classifying_intent` | "Understanding your request..." | 15% | AI is parsing the user's intent |
| `resolving_context` | "Checking conversation context..." | 25% | Looking up referenced entities |
| `gathering_data` | "Retrieving relevant information..." | 35% | Fetching tasks/clients/policies from DB |
| `executing_action` | "Executing action..." | 45% | Running approve/reject/complete (if applicable) |
| `building_prompt` | "Preparing AI request..." | 55% | Constructing the LLM prompt |
| `calling_llm` | "Ciri is thinking..." | 65% | Waiting for LLM response |
| `parsing_response` | "Processing response..." | 85% | Parsing cards from LLM output |
| `complete` | "Done" | 100% | Final result attached |
| `error` | "An error occurred" | 0% | Error details attached |

### Recommended UI Mapping

```typescript
const statusDisplayText: Record<StreamingStatus, string> = {
  connecting: 'Connecting...',
  classifying_intent: 'Understanding your request...',
  resolving_context: 'Checking context...',
  gathering_data: 'Gathering information...',
  executing_action: 'Executing action...',
  building_prompt: 'Preparing response...',
  calling_llm: 'Ciri is thinking...',
  parsing_response: 'Processing...',
  complete: '',  // Hide when complete
  error: 'Something went wrong',
};
```

---

## Frontend Implementation Guide

### Step 1: Create SSE Client Hook

Create a custom React hook to handle the streaming connection:

```typescript
// hooks/useStreamingChat.ts

import { useState, useCallback, useRef } from 'react';

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

interface ChatContext {
  focused_task_id?: string;
  focused_client_id?: string;
  focused_policy_id?: string;
  last_intent?: string;
  collected_entities?: {
    client_ids: string[];
    policy_ids: string[];
    task_ids: string[];
  };
  recent_actions?: string[];
  has_pending_drafts?: boolean;
  session_started_at?: string;
}

interface ChatResponse {
  content: string;
  cards?: unknown[];
  context?: ChatContext;
  tasks_updated?: boolean;
  error?: string;
}

interface SSEEventData {
  status?: StreamingStatus;
  message?: string;
  progress?: number;
  result?: ChatResponse;
  error?: string;
}

interface UseStreamingChatOptions {
  streamingEndpoint: string;
  onStatusChange?: (status: StreamingStatus, message: string, progress: number) => void;
  onResult?: (result: ChatResponse) => void;
  onError?: (error: string) => void;
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const { streamingEndpoint, onStatusChange, onResult, onError } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<StreamingStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    context?: ChatContext
  ): Promise<ChatResponse | null> => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setStatus('connecting');
    setStatusMessage('Connecting...');
    setProgress(0);

    try {
      const response = await fetch(streamingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          context,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: ChatResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEventType = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEventType && currentData) {
            // End of event, process it
            try {
              const eventData: SSEEventData = JSON.parse(currentData);
              
              if (eventData.status) {
                setStatus(eventData.status);
                setStatusMessage(eventData.message || '');
                setProgress(eventData.progress || 0);
                onStatusChange?.(
                  eventData.status,
                  eventData.message || '',
                  eventData.progress || 0
                );
              }

              if (currentEventType === 'result' && eventData.result) {
                finalResult = eventData.result;
                onResult?.(eventData.result);
              }

              if (currentEventType === 'error' && eventData.error) {
                onError?.(eventData.error);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }

            // Reset for next event
            currentEventType = '';
            currentData = '';
          }
        }
      }

      return finalResult;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Request was aborted');
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus('error');
      setStatusMessage(errorMessage);
      onError?.(errorMessage);
      return null;
      
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [streamingEndpoint, onStatusChange, onResult, onError]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    sendMessage,
    cancel,
    isLoading,
    status,
    statusMessage,
    progress,
  };
}
```

### Step 2: Create Status Display Component

```tsx
// components/ChatStatusIndicator.tsx

import React from 'react';
import type { StreamingStatus } from '@/hooks/useStreamingChat';

interface ChatStatusIndicatorProps {
  status: StreamingStatus | null;
  message: string;
  progress: number;
  isVisible: boolean;
}

export function ChatStatusIndicator({ 
  status, 
  message, 
  progress, 
  isVisible 
}: ChatStatusIndicatorProps) {
  if (!isVisible || status === 'complete') {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      {/* Animated thinking indicator */}
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
              style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
              style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" 
              style={{ animationDelay: '300ms' }} />
      </div>
      
      {/* Status message */}
      <div className="flex-1">
        <p className="text-sm text-gray-600">{message}</p>
        
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 3: Integrate into Chat Component

```tsx
// components/Chat.tsx

import React, { useState } from 'react';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { ChatStatusIndicator } from '@/components/ChatStatusIndicator';

const STREAMING_ENDPOINT = process.env.NEXT_PUBLIC_CHAT_STREAM_ENDPOINT!;

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState<ChatContext>({
    collected_entities: { client_ids: [], policy_ids: [], task_ids: [] },
    recent_actions: [],
    has_pending_drafts: false,
    session_started_at: new Date().toISOString(),
  });

  const {
    sendMessage,
    cancel,
    isLoading,
    status,
    statusMessage,
    progress,
  } = useStreamingChat({
    streamingEndpoint: STREAMING_ENDPOINT,
    onResult: (result) => {
      // Add assistant message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.content,
        cards: result.cards,
      }]);
      
      // Update context for next message
      if (result.context) {
        setContext(prev => ({
          ...prev,
          ...result.context,
        }));
      }
      
      // Handle tasks_updated flag
      if (result.tasks_updated) {
        // Trigger tasks refresh in UI
        refreshTasks();
      }
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error}`,
        isError: true,
      }]);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
    }]);

    // Send to streaming endpoint
    await sendMessage(userMessage, context);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        
        {/* Show status indicator while loading */}
        <ChatStatusIndicator
          status={status}
          message={statusMessage}
          progress={progress}
          isVisible={isLoading}
        />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Ciri anything..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          {isLoading ? (
            <button 
              type="button" 
              onClick={cancel}
              className="px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Cancel
            </button>
          ) : (
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

---

## TypeScript Types

Copy these types to your frontend codebase:

```typescript
// types/chat.ts

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

export type SSEEventType = 'status' | 'progress' | 'partial' | 'result' | 'error';

export interface SSEEventData {
  status?: StreamingStatus;
  message?: string;
  progress?: number;
  partial_content?: string;
  result?: ChatResponse;
  error?: string;
}

export interface ChatContext {
  session_id?: string;
  focused_task_id?: string;
  focused_client_id?: string;
  focused_policy_id?: string;
  last_intent?: string;
  collected_entities?: {
    client_ids: string[];
    policy_ids: string[];
    task_ids: string[];
  };
  recent_actions?: string[];
  has_pending_drafts?: boolean;
  session_started_at?: string;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
  conversation_history?: Message[];
}

export interface ChatResponse {
  content: string;
  cards?: Card[];
  context?: ChatContext;
  tasks_updated?: boolean;
  error?: string;
}
```

---

## Error Handling

### Network Errors

```typescript
try {
  await sendMessage(input, context);
} catch (error) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    // Network error - show offline message
    showToast('Unable to connect. Please check your connection.');
  }
}
```

### Timeout Handling

The backend has a 120-second timeout. For very long requests:

```typescript
const TIMEOUT_MS = 115000; // Slightly less than backend timeout

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS);
});

const result = await Promise.race([
  sendMessage(input, context),
  timeoutPromise,
]);
```

### Graceful Degradation

If streaming fails, fall back to the non-streaming endpoint:

```typescript
async function sendWithFallback(message: string, context: ChatContext) {
  try {
    return await sendStreamingMessage(message, context);
  } catch (streamError) {
    console.warn('Streaming failed, falling back to non-streaming:', streamError);
    return await sendNonStreamingMessage(message, context);
  }
}
```

---

## Testing

### Local Testing

1. Deploy the backend:
   ```bash
   sam build && sam deploy
   ```

2. Get the streaming endpoint from outputs:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name your-stack-name \
     --query 'Stacks[0].Outputs[?OutputKey==`ChatStreamEndpoint`].OutputValue' \
     --output text
   ```

3. Test with curl:
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"message": "Show my tasks for today"}' \
     https://xxxxx.lambda-url.us-east-1.on.aws/
   ```

### Expected Output

```
event: status
data: {"status":"connecting","message":"Connected to Ciri","progress":5}

event: status
data: {"status":"classifying_intent","message":"Understanding your request...","progress":15}

event: status
data: {"status":"resolving_context","message":"Checking conversation context...","progress":25}

event: status
data: {"status":"gathering_data","message":"Retrieving relevant information...","progress":35}

event: status
data: {"status":"building_prompt","message":"Preparing AI request...","progress":55}

event: status
data: {"status":"calling_llm","message":"Ciri is thinking...","progress":65}

event: status
data: {"status":"parsing_response","message":"Processing response...","progress":85}

event: result
data: {"status":"complete","result":{"content":"...","cards":[...],"context":{...}},"progress":100}
```

---

## Migration Checklist

### Backend Team (Completed)
- [x] Migrate from REST API to HTTP API Gateway
- [x] Create streaming Lambda function with Function URL
- [x] Implement SSE response format
- [x] Add status phases with progress percentages
- [x] Update CORS configuration for Function URL
- [x] Add new CloudFormation outputs

### Frontend Team (TODO)
- [ ] Get streaming endpoint URL from CloudFormation outputs
- [ ] Add `NEXT_PUBLIC_CHAT_STREAM_ENDPOINT` to environment variables
- [ ] Create `useStreamingChat` hook (see code above)
- [ ] Create `ChatStatusIndicator` component
- [ ] Update chat component to use streaming
- [ ] Add progress bar or status indicator UI
- [ ] Implement cancel button for long requests
- [ ] Add fallback to non-streaming endpoint
- [ ] Test with slow connections
- [ ] Test error scenarios
- [ ] Update any other components that call `/api/chat`

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_CHAT_STREAM_ENDPOINT=https://xxxxx.lambda-url.us-east-1.on.aws/
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/your-stage
```

---

## Questions?

If you have questions about this migration, check the backend code at:

- Streaming handler: `src/handlers/chat-stream.ts`
- Types: `src/types/chat.ts` (look for `StreamingStatus`, `SSEEvent`, etc.)
- Template: `template.yaml` (look for `ChatStreamFunction`)

The non-streaming endpoint (`/api/chat`) still works exactly as before for backward compatibility.
