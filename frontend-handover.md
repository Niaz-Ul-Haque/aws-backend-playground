# Frontend Handover: Ciri AI Backend Updates

## Summary of Changes

The backend AI assistant (Ciri) has been updated to be more action-oriented and less repetitive. The main issues fixed:

1. **AI was going in circles** - asking for clarification even when context was available
2. **AI was denying permissions** - claiming it couldn't create documents when it actually can
3. **AI wasn't taking action** - offering options instead of doing what was asked

---

## Backend Changes Made

### 1. System Prompt Updates (`src/lib/ai/prompts.ts`)

The AI now has explicit instructions to:
- **Take action immediately** when it has the necessary data
- **Use conversation context** - no more "which client?" when Dylan Jackson was just discussed
- **Generate documents** using review cards - compliance checks, portfolio analyses, etc.
- **Stop asking unnecessary questions**

### 2. New Intents Added

The following new intents have been added for document generation:

| Intent | Triggers | Description |
|--------|----------|-------------|
| `create_compliance_check` | "create compliance check", "run compliance report", "KYC check" | Generates compliance/KYC reports |
| `create_portfolio_analysis` | "portfolio analysis", "analyze portfolio", "investment review" | Generates portfolio analysis |
| `create_client_summary` | "client summary", "summarize client" | Generates client overview |
| `create_meeting_prep` | "prepare for meeting", "meeting prep", "create agenda" | Generates meeting preparation materials |
| `create_report` | "create report", "generate draft", "prepare document" | Generic document generation |

### 3. Context Resolution Improvements

The backend now properly uses `focused_client_id` from the conversation context when generating documents. If the user asks for a compliance check right after viewing Dylan Jackson's info, the system automatically uses Dylan's data.

---

## Frontend Considerations

### Review Card Support

The AI will now more frequently use the `review` card type with various `action_type` values. Make sure the frontend supports displaying these:

```typescript
interface ReviewCard {
  task_id?: string;
  task?: Task;
  title: string;
  message: string;  // The generated content (report, analysis, etc.)
  action_type:
    | 'email_draft'
    | 'meeting_notes'
    | 'portfolio_review'
    | 'policy_summary'
    | 'client_summary'
    | 'compliance_check'   // NEW - expect more of these
    | 'report'
    | 'reminder'
    | 'analysis'
    | 'proposal'
    | 'birthday_greeting'
    | 'renewal_notice';
  summary: string;
  confidence?: number;
}
```

### Expected Behavior Changes

1. **Faster responses**: The AI will generate content immediately instead of asking follow-up questions
2. **More review cards**: Expect more generated documents presented as review cards for approval
3. **Better context awareness**: The AI will reference previously mentioned clients/tasks without asking "which one?"

### Card Rendering for New Content Types

Consider adding styled rendering for these new document types:

#### Compliance Check (`action_type: 'compliance_check'`)
Typically contains:
- KYC status verification
- Suitability assessment
- Policy coverage review
- Documentation completeness
- Regulatory recommendations

#### Portfolio Analysis (`action_type: 'portfolio_review'`)
Typically contains:
- Asset allocation breakdown
- Risk assessment
- Performance commentary
- Rebalancing recommendations
- Coverage gaps

### No API Changes Required

The request/response format remains the same:

```typescript
// Request - unchanged
POST /api/chat
{
  "message": "create compliance check for Dylan Jackson",
  "context": {
    "focused_client_id": "C001",  // may already be set from conversation
    "last_intent": "show_client_info"
  }
}

// Response - unchanged, but now contains generated content
{
  "content": "Here's the compliance check for Dylan Jackson...",
  "cards": [
    {
      "type": "review",
      "data": {
        "title": "Compliance Check - Dylan Jackson",
        "message": "## KYC Status\n...",
        "action_type": "compliance_check",
        "summary": "Compliance review completed with 2 items requiring attention",
        "confidence": 85
      }
    }
  ],
  "context": {
    "focused_client_id": "C001",
    "last_intent": "create_compliance_check"
  }
}
```

---

## Testing Recommendations

Test these conversation flows to verify the improvements:

### Test 1: Context Retention
```
User: "Show me Dylan Jackson's info"
AI: [Shows client card]
User: "Create a compliance check"
AI: [Should immediately create compliance check for Dylan - NOT ask "which client?"]
```

### Test 2: Document Generation
```
User: "Run a portfolio analysis for Dylan Jackson"
AI: [Should immediately generate and display portfolio analysis in review card]
```

### Test 3: Action Without Options
```
User: "Prepare me for my meeting with Dylan Jackson"
AI: [Should create meeting prep document - NOT ask "what would you like me to prepare?"]
```

---

## Questions?

Reach out if you need any clarification on these changes or need additional card types supported.
