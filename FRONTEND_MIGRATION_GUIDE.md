# Frontend Migration Guide - Ciri AI Backend Integration

This document provides a comprehensive guide for updating your frontend application to integrate with the new Ciri AI backend. The backend has been redesigned with proper REST APIs, structured data models, and enhanced AI capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [API Base URL Configuration](#api-base-url-configuration)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [Data Types & Interfaces](#data-types--interfaces)
5. [Chat API Integration](#chat-api-integration)
6. [Card Parsing System](#card-parsing-system)
7. [Clients API](#clients-api)
8. [Policies API](#policies-api)
9. [Tasks API](#tasks-api)
10. [Error Handling](#error-handling)
11. [Migration Checklist](#migration-checklist)

---

## Overview

### What Changed

| Feature | Before | After |
|---------|--------|-------|
| API Structure | Single `/api/chat` Lambda | Multiple REST endpoints |
| Data Storage | None (stateless) | DynamoDB with Clients, Policies, Tasks |
| AI Context | No context | Full client/policy/task awareness |
| Response Format | Plain text | Structured JSON with embedded cards |
| Task Management | Not supported | Full CRUD + AI completion workflow |

### New Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                  │
│                    (Regional REST API)                              │
├──────────┬──────────┬──────────┬──────────┬─────────────────────────┤
│  /chat   │ /clients │ /policies│  /tasks  │       /health           │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────────┬─────────────┘
     │          │          │          │                 │
     ▼          ▼          ▼          ▼                 ▼
┌─────────┐┌─────────┐┌─────────┐┌─────────┐     ┌─────────┐
│ Chat    ││ Clients ││Policies ││ Tasks   │     │ Health  │
│ Lambda  ││ Lambda  ││ Lambda  ││ Lambda  │     │ Lambda  │
└────┬────┘└────┬────┘└────┬────┘└────┬────┘     └─────────┘
     │          │          │          │
     └──────────┴──────────┴──────────┘
                     │
                     ▼
            ┌───────────────┐
            │   DynamoDB    │
            │ (Single Table)│
            └───────────────┘
```

---

## API Base URL Configuration

After deploying the backend with `sam deploy`, you'll get an API URL in the CloudFormation outputs.

### Environment Configuration

Create or update your `.env` file:

```env
# Development
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Prod

# Production (example)
VITE_API_BASE_URL=https://api.yourdomain.com
```

### API Client Setup

Create a centralized API client:

```typescript
// src/lib/api-client.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        message: data.message,
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: (error as Error).message,
    };
  }
}
```

---

## API Endpoints Reference

### Summary Table

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message to Ciri AI |
| `GET` | `/api/clients` | List all clients |
| `GET` | `/api/clients/{id}` | Get single client |
| `GET` | `/api/policies` | List all policies |
| `GET` | `/api/policies/{id}` | Get single policy |
| `GET` | `/api/tasks` | List tasks (with filters) |
| `GET` | `/api/tasks/{id}` | Get single task |
| `PATCH` | `/api/tasks/{id}` | Update task |
| `POST` | `/api/tasks/{id}/approve` | Approve AI-completed task |
| `POST` | `/api/tasks/{id}/reject` | Reject AI-completed task |
| `POST` | `/api/tasks/{id}/complete` | Mark task as completed |
| `GET` | `/api/health` | Health check |

---

## Data Types & Interfaces

### Client Interface

```typescript
// src/types/client.ts

export interface Client {
  // Identification
  client_id: string;
  advisor_id: string;
  legacy_client_number?: string;

  // Personal Information
  salutation?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth?: string; // ISO date
  gender?: string;
  marital_status?: string;
  sin_last_four?: string;

  // Contact Information
  email_primary: string;
  email_secondary?: string;
  phone_mobile?: string;
  phone_home?: string;
  phone_work?: string;
  preferred_contact_method?: string;
  preferred_contact_time?: string;

  // Address
  address_street?: string;
  address_unit?: string;
  address_city?: string;
  address_province?: string;
  address_postal_code?: string;
  address_country?: string;

  // Financial Profile
  annual_income?: number;
  net_worth?: number;
  total_assets?: number;
  total_liabilities?: number;
  investment_knowledge?: string;
  risk_tolerance?: string;
  investment_objective?: string;

  // Employment
  employment_status?: string;
  occupation?: string;
  employer_name?: string;
  industry?: string;

  // Relationship Metadata
  client_status: 'active' | 'inactive' | 'prospect' | 'archived';
  client_segment?: string;
  acquisition_source?: string;
  referral_source?: string;
  relationship_start_date?: string;
  last_contact_date?: string;
  next_review_date?: string;
  next_meeting_date?: string;

  // Compliance
  kyc_status?: string;
  kyc_last_updated?: string;
  aml_status?: string;
  fatca_status?: string;
  is_pep?: boolean; // Politically Exposed Person

  // Notes & Preferences
  notes?: string;
  communication_preferences?: Record<string, unknown>;
  interests?: string[];
  family_members?: FamilyMember[];
  important_dates?: ImportantDate[];

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FamilyMember {
  name: string;
  relationship: string;
  date_of_birth?: string;
  is_beneficiary?: boolean;
}

export interface ImportantDate {
  date: string;
  description: string;
  type: string;
}

export interface ClientSummary {
  client_id: string;
  first_name: string;
  last_name: string;
  email_primary: string;
  phone_mobile?: string;
  client_status: string;
  risk_tolerance?: string;
  total_assets?: number;
}
```

### Policy Interface

```typescript
// src/types/policy.ts

export interface Policy {
  // Identification
  policy_id: string;
  policy_number: string;
  client_id: string;
  advisor_id: string;

  // Product Details
  product_type: string;
  product_name: string;
  product_code?: string;
  carrier_name: string;
  carrier_code?: string;

  // Coverage
  coverage_amount?: number;
  coverage_type?: string;
  death_benefit?: number;
  cash_value?: number;
  face_amount?: number;

  // Premium
  premium_amount?: number;
  premium_frequency?: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  premium_mode?: string;
  next_premium_date?: string;

  // Policy Lifecycle
  policy_status: 'active' | 'pending' | 'lapsed' | 'cancelled' | 'matured' | 'claim';
  application_date?: string;
  effective_date?: string;
  issue_date?: string;
  maturity_date?: string;
  expiry_date?: string;
  renewal_date?: string;
  cancellation_date?: string;

  // Investment (for investment products)
  fund_allocations?: FundAllocation[];
  account_value?: number;
  book_value?: number;
  market_value?: number;

  // Claims
  claims_history?: Claim[];
  last_claim_date?: string;

  // Beneficiaries
  beneficiaries?: Beneficiary[];

  // Documents
  documents?: Document[];

  // Notes
  notes?: string;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FundAllocation {
  fund_code: string;
  fund_name: string;
  allocation_percentage: number;
  units?: number;
  unit_value?: number;
}

export interface Claim {
  claim_id: string;
  claim_date: string;
  claim_type: string;
  claim_amount: number;
  status: string;
  resolution_date?: string;
}

export interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
  designation: 'primary' | 'contingent';
  is_irrevocable?: boolean;
}

export interface Document {
  document_id: string;
  document_type: string;
  document_name: string;
  upload_date: string;
  url?: string;
}

export interface PolicySummary {
  policy_id: string;
  policy_number: string;
  product_type: string;
  product_name: string;
  carrier_name: string;
  policy_status: string;
  coverage_amount?: number;
  premium_amount?: number;
  client_id: string;
}
```

### Task Interface

```typescript
// src/types/task.ts

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'needs-review';

export type AIActionType = 
  | 'email_draft' 
  | 'meeting_notes' 
  | 'portfolio_review' 
  | 'policy_summary'
  | 'client_summary'
  | 'compliance_check';

export interface Task {
  task_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  
  // Relationships
  client_id?: string;
  client_name?: string;
  policy_id?: string;
  assigned_to?: string;

  // Task metadata
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  task_type?: string;

  // AI completion data
  ai_completed?: boolean;
  ai_action_type?: AIActionType;
  ai_completion_data?: AICompletionData;

  // Audit
  created_by?: string;
  updated_by?: string;
}

export interface AICompletionData {
  completed_at: string;
  summary: string;
  details?: string;
  confidence?: number;
  action_type: AIActionType;
  generated_content?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskSummary {
  task_id: string;
  title: string;
  status: TaskStatus;
  due_date?: string;
  priority?: string;
  client_name?: string;
  ai_completed?: boolean;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  due_date?: string;
  priority?: string;
  tags?: string[];
}
```

### Chat Types

```typescript
// src/types/chat.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  cards?: Card[];
}

export type CardType = 
  | 'task-list' 
  | 'task' 
  | 'client' 
  | 'policy' 
  | 'review' 
  | 'confirmation';

export interface Card {
  type: CardType;
  data: TaskListCardData | TaskCardData | ClientCardData | PolicyCardData | ReviewCardData | ConfirmationCardData;
}

// Task List Card - Shows multiple tasks
export interface TaskListCardData {
  tasks: TaskSummary[];
  title?: string;
  description?: string;
}

// Single Task Card
export interface TaskCardData {
  task: Task;
}

// Client Card
export interface ClientCardData {
  client: Client | ClientSummary;
}

// Policy Card
export interface PolicyCardData {
  policy: Policy | PolicySummary;
}

// Review Card - For AI-completed work requiring approval
export interface ReviewCardData {
  task_id: string;
  title: string;
  action_type: AIActionType;
  content: string;
  summary: string;
  confidence?: number;
}

// Confirmation Card - For action confirmations
export interface ConfirmationCardData {
  action: string;
  message: string;
  success: boolean;
  details?: Record<string, unknown>;
}

// Chat Request/Response
export interface ChatRequest {
  message: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: ChatContext;
}

export interface ChatContext {
  current_client_id?: string;
  current_policy_id?: string;
  current_task_id?: string;
  current_view?: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: string;
    cards?: Card[];
    intent?: string;
    context?: {
      client_id?: string;
      policy_id?: string;
      task_id?: string;
    };
  };
  error?: string;
}
```

---

## Chat API Integration

### Sending Messages

```typescript
// src/services/chat-service.ts

import { apiRequest } from '@/lib/api-client';
import type { ChatRequest, ChatResponse, Message, Card } from '@/types/chat';

export async function sendMessage(
  message: string,
  conversationHistory: Message[],
  context?: ChatContext
): Promise<{ message: string; cards: Card[] } | null> {
  const request: ChatRequest = {
    message,
    conversation_history: conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    context,
  };

  const response = await apiRequest<ChatResponse['data']>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.success || !response.data) {
    console.error('Chat error:', response.error);
    return null;
  }

  return {
    message: response.data.message,
    cards: response.data.cards || [],
  };
}
```

### Using the Chat Hook

```typescript
// src/hooks/use-chat.ts

import { useState, useCallback } from 'react';
import { sendMessage } from '@/services/chat-service';
import type { Message, Card, ChatContext } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ChatContext>({});

  const send = useCallback(async (userMessage: string) => {
    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
      cards: [],
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendMessage(userMessage, messages, context);
      
      if (response) {
        const assistantMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
          cards: response.cards,
        };
        
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messages, context]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setContext({});
  }, []);

  const updateContext = useCallback((newContext: Partial<ChatContext>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  return {
    messages,
    isLoading,
    send,
    clearChat,
    context,
    updateContext,
  };
}
```

---

## Card Parsing System

The backend embeds structured data cards within the AI response text. Cards are marked with special delimiters that you need to parse.

### Card Format

The backend sends cards in this format within the message text:

```
<<<CARD:card-type:{"json":"data"}>>>
```

### Parsing Cards

```typescript
// src/lib/card-parser.ts

import type { Card, CardType } from '@/types/chat';

const CARD_PATTERN = /<<<CARD:([a-z-]+):(.+?)>>>/g;

export function parseCardsFromMessage(content: string): {
  text: string;
  cards: Card[];
} {
  const cards: Card[] = [];
  
  // Extract all cards from the message
  let match;
  while ((match = CARD_PATTERN.exec(content)) !== null) {
    const [, cardType, jsonData] = match;
    
    try {
      const data = JSON.parse(jsonData);
      cards.push({
        type: cardType as CardType,
        data,
      });
    } catch (error) {
      console.error('Failed to parse card JSON:', error);
    }
  }
  
  // Remove card markers from the text
  const text = content.replace(CARD_PATTERN, '').trim();
  
  // Clean up extra whitespace
  const cleanText = text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return { text: cleanText, cards };
}
```

### Card Rendering Components

```tsx
// src/components/cards/card-renderer.tsx

import type { Card } from '@/types/chat';
import { TaskListCard } from './task-list-card';
import { TaskCard } from './task-card';
import { ClientCard } from './client-card';
import { PolicyCard } from './policy-card';
import { ReviewCard } from './review-card';
import { ConfirmationCard } from './confirmation-card';

interface CardRendererProps {
  card: Card;
  onAction?: (action: string, data: unknown) => void;
}

export function CardRenderer({ card, onAction }: CardRendererProps) {
  switch (card.type) {
    case 'task-list':
      return <TaskListCard data={card.data} onAction={onAction} />;
    case 'task':
      return <TaskCard data={card.data} onAction={onAction} />;
    case 'client':
      return <ClientCard data={card.data} />;
    case 'policy':
      return <PolicyCard data={card.data} />;
    case 'review':
      return <ReviewCard data={card.data} onAction={onAction} />;
    case 'confirmation':
      return <ConfirmationCard data={card.data} />;
    default:
      console.warn('Unknown card type:', card.type);
      return null;
  }
}
```

### Example: Review Card Component

```tsx
// src/components/cards/review-card.tsx

import type { ReviewCardData } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface ReviewCardProps {
  data: ReviewCardData;
  onAction?: (action: string, data: unknown) => void;
}

export function ReviewCard({ data, onAction }: ReviewCardProps) {
  const handleApprove = async () => {
    // Call the approve endpoint
    const response = await fetch(`/api/tasks/${data.task_id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: 'Approved via chat' }),
    });
    
    if (response.ok) {
      onAction?.('approved', { task_id: data.task_id });
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    const response = await fetch(`/api/tasks/${data.task_id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    
    if (response.ok) {
      onAction?.('rejected', { task_id: data.task_id, reason });
    }
  };

  return (
    <Card className="mt-4 border-2 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{data.title}</CardTitle>
          {data.confidence && (
            <Badge variant="outline">
              {data.confidence}% confidence
            </Badge>
          )}
        </div>
        <Badge variant="secondary">{data.action_type}</Badge>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{data.summary}</p>
        <div className="bg-white rounded-md p-4 border prose prose-sm max-w-none">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button onClick={handleApprove} variant="default">
          ✓ Approve
        </Button>
        <Button onClick={handleReject} variant="outline">
          ✗ Request Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## Clients API

### List Clients

```typescript
// GET /api/clients

interface ListClientsParams {
  status?: 'active' | 'inactive' | 'prospect' | 'archived';
  search?: string;
}

async function listClients(params?: ListClientsParams): Promise<ClientSummary[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  
  const query = searchParams.toString();
  const endpoint = `/api/clients${query ? `?${query}` : ''}`;
  
  const response = await apiRequest<{ clients: ClientSummary[] }>(endpoint);
  return response.data?.clients || [];
}
```

### Get Client Details

```typescript
// GET /api/clients/{id}

async function getClient(clientId: string): Promise<Client | null> {
  const response = await apiRequest<{ client: Client }>(`/api/clients/${clientId}`);
  return response.data?.client || null;
}
```

---

## Policies API

### List Policies

```typescript
// GET /api/policies

interface ListPoliciesParams {
  client_id?: string;
  status?: 'active' | 'pending' | 'lapsed' | 'cancelled' | 'matured' | 'claim';
  product_type?: string;
}

async function listPolicies(params?: ListPoliciesParams): Promise<PolicySummary[]> {
  const searchParams = new URLSearchParams();
  if (params?.client_id) searchParams.set('client_id', params.client_id);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.product_type) searchParams.set('product_type', params.product_type);
  
  const query = searchParams.toString();
  const endpoint = `/api/policies${query ? `?${query}` : ''}`;
  
  const response = await apiRequest<{ policies: PolicySummary[] }>(endpoint);
  return response.data?.policies || [];
}
```

### Get Policy Details

```typescript
// GET /api/policies/{id}

async function getPolicy(policyId: string): Promise<Policy | null> {
  const response = await apiRequest<{ policy: Policy }>(`/api/policies/${policyId}`);
  return response.data?.policy || null;
}
```

---

## Tasks API

### List Tasks

```typescript
// GET /api/tasks

interface ListTasksParams {
  status?: TaskStatus;
  client_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  ai_completed?: boolean;
  today?: boolean;
  overdue?: boolean;
}

async function listTasks(params?: ListTasksParams): Promise<TaskSummary[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.client_id) searchParams.set('client_id', params.client_id);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.ai_completed !== undefined) searchParams.set('ai_completed', String(params.ai_completed));
  if (params?.today) searchParams.set('today', 'true');
  if (params?.overdue) searchParams.set('overdue', 'true');
  
  const query = searchParams.toString();
  const endpoint = `/api/tasks${query ? `?${query}` : ''}`;
  
  const response = await apiRequest<{ tasks: TaskSummary[] }>(endpoint);
  return response.data?.tasks || [];
}
```

### Get Task Details

```typescript
// GET /api/tasks/{id}

async function getTask(taskId: string): Promise<Task | null> {
  const response = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}`);
  return response.data?.task || null;
}
```

### Update Task

```typescript
// PATCH /api/tasks/{id}

async function updateTask(taskId: string, updates: TaskUpdate): Promise<Task | null> {
  const response = await apiRequest<{ task: Task }>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response.data?.task || null;
}
```

### Task Actions

```typescript
// POST /api/tasks/{id}/approve
async function approveTask(taskId: string, feedback?: string): Promise<boolean> {
  const response = await apiRequest(`/api/tasks/${taskId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  });
  return response.success;
}

// POST /api/tasks/{id}/reject
async function rejectTask(taskId: string, reason: string): Promise<boolean> {
  const response = await apiRequest(`/api/tasks/${taskId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return response.success;
}

// POST /api/tasks/{id}/complete
async function completeTask(taskId: string, notes?: string): Promise<boolean> {
  const response = await apiRequest(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
  return response.success;
}
```

---

## Error Handling

### Error Response Format

All API errors follow this format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;       // Error code or type
  message: string;     // Human-readable message
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Missing or invalid request body |
| 400 | `VALIDATION_ERROR` | Field validation failed |
| 404 | `NOT_FOUND` | Resource not found |
| 500 | `INTERNAL_ERROR` | Server error |
| 500 | `LLM_ERROR` | AI service error |

### Error Handling Example

```typescript
import { toast } from '@/components/ui/use-toast';

async function handleApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>
): Promise<T | null> {
  try {
    const response = await apiCall();
    
    if (!response.success) {
      toast({
        title: 'Error',
        description: response.message || response.error,
        variant: 'destructive',
      });
      return null;
    }
    
    return response.data || null;
  } catch (error) {
    toast({
      title: 'Network Error',
      description: 'Unable to connect to the server. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
}
```

---

## Migration Checklist

### Phase 1: Environment Setup

- [ ] Update environment variables with new API base URL
- [ ] Create centralized API client utility
- [ ] Add new TypeScript interfaces

### Phase 2: Type Updates

- [ ] Update `Client` interface with new fields
- [ ] Update `Policy` interface with new fields
- [ ] Add `Task` interface (new)
- [ ] Add chat-related types (Message, Card, etc.)

### Phase 3: Chat Integration

- [ ] Update chat service to use new request/response format
- [ ] Implement card parsing from message content
- [ ] Create card renderer components
- [ ] Add review card with approve/reject actions
- [ ] Update conversation history format

### Phase 4: API Integration

- [ ] Update clients service to use new endpoints
- [ ] Update policies service to use new endpoints
- [ ] Add tasks service (new)
- [ ] Implement task actions (approve, reject, complete)

### Phase 5: UI Components

- [ ] Create/update TaskListCard component
- [ ] Create/update TaskCard component
- [ ] Create/update ReviewCard component
- [ ] Create/update ClientCard component
- [ ] Create/update PolicyCard component
- [ ] Create ConfirmationCard component

### Phase 6: Context Management

- [ ] Add chat context state management
- [ ] Pass context with chat requests
- [ ] Update context when viewing client/policy/task details

### Phase 7: Testing

- [ ] Test chat flow with various queries
- [ ] Test task approval/rejection workflow
- [ ] Test client/policy lookups
- [ ] Test error handling scenarios

---

## Sample Queries for Testing

After migration, test these queries with Ciri:

1. **Task Management**
   - "What are my tasks for today?"
   - "Show me tasks needing review"
   - "What's overdue?"

2. **Client Lookup**
   - "Tell me about Carol Ramirez"
   - "Show me Douglas Mooney's information"
   - "Who are my high net worth clients?"

3. **Policy Information**
   - "What policies does Carol Ramirez have?"
   - "Show me policy POL000001"
   - "What policies are expiring soon?"

4. **AI Actions**
   - "Draft a follow-up email for Douglas Mooney"
   - "Summarize my meeting notes for Carol Ramirez"
   - "Review Dylan Jackson's portfolio"

---

## Support

If you encounter any issues during migration:

1. Check the API health endpoint: `GET /api/health`
2. Verify CloudWatch logs for Lambda errors
3. Ensure the DynamoDB table has been seeded with data
4. Confirm the LLM API key is set in SSM Parameter Store

---

*Last updated: January 2026*
*Backend version: 2.0.0*
