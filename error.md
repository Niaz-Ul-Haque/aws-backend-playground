Timestamp
	
Message

Timestamp
	
Message

No older events at this moment. 
Retry
2026-02-03T17:36:55.248Z
INIT_START Runtime Version: nodejs:20.v93 Runtime Version ARN: arn:aws:lambda:ca-central-1::runtime:1506f1af44674a3eb825d743a9d707d8f2b0a0a71348b6a1a5db38fd6411a055
2026-02-03T17:36:55.682Z
START RequestId: 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 Version: $LATEST
2026-02-03T17:36:55.684Z
2026-02-03T17:36:55.684Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO === Chat Handler Start ===
2026-02-03T17:36:55.686Z
2026-02-03T17:36:55.686Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Method: POST
2026-02-03T17:36:55.686Z
2026-02-03T17:36:55.686Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Path: /api/chat
2026-02-03T17:36:55.686Z
2026-02-03T17:36:55.686Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Body: {"message":"What tasks do I have today?","conversation_history":[],"context":{}}
2026-02-03T17:36:55.686Z
2026-02-03T17:36:55.686Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Query params: null
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Path params: null
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO ==================================================
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO [2026-02-03T17:36:55.687Z] POST /api/chat
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Body: "{\"message\":\"What tasks do I have today?\",\"conversation_history\":[],\"context\":{}}"
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO ==================================================
2026-02-03T17:36:55.687Z
2026-02-03T17:36:55.687Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Parsed body: {"message":"What tasks do I have today?","conversation_history":[],"context":{}}
2026-02-03T17:36:55.688Z
2026-02-03T17:36:55.688Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Processing chat message: What tasks do I have today?
2026-02-03T17:36:55.688Z
2026-02-03T17:36:55.688Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO processChat - Starting chat processing
2026-02-03T17:36:55.688Z
2026-02-03T17:36:55.688Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Message: What tasks do I have today?
2026-02-03T17:36:55.688Z
2026-02-03T17:36:55.688Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Context: {}
2026-02-03T17:36:55.688Z
2026-02-03T17:36:55.688Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 1: Classifying intent...
2026-02-03T17:36:55.689Z
2026-02-03T17:36:55.689Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Intent: show_todays_tasks Confidence: 0.9
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Entities: {"task_title":"s do I have today?","time_range":"today"}
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 2: Resolving context references...
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Resolved context: {"resolved_from":"none"}
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 3: Gathering data for intent...
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO gatherDataForIntent - Intent: show_todays_tasks
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Entities: {"task_title":"s do I have today?","time_range":"today"}
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Resolved context: {"resolved_from":"none"}
2026-02-03T17:36:55.690Z
2026-02-03T17:36:55.690Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Fetching today's tasks...
2026-02-03T17:36:55.942Z
2026-02-03T17:36:55.942Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Today's tasks count: 0
2026-02-03T17:36:55.942Z
2026-02-03T17:36:55.942Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Data context gathered, focused IDs: { task: undefined, client: undefined, policy: undefined }
2026-02-03T17:36:55.943Z
2026-02-03T17:36:55.943Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 4: Handling action intents...
2026-02-03T17:36:55.943Z
2026-02-03T17:36:55.943Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 5: Building prompts...
2026-02-03T17:36:55.943Z
2026-02-03T17:36:55.943Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Prompts built, system prompt length: 6176
2026-02-03T17:36:55.943Z
2026-02-03T17:36:55.943Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Step 6: Calling LLM...
2026-02-03T17:36:55.943Z
2026-02-03T17:36:55.943Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO === LLM Request Config ===
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO API URL: https://api.z.ai/api/paas/v4/chat/completions
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Model: glm-4.7-flashx
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Timeout (ms): 20000
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO API Key (preview): b8bb22b1...
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Message count: 2
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO Request body size (bytes): 6962
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO System prompt length: 6377
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO User message length: 27
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO ==========================
2026-02-03T17:36:55.944Z
2026-02-03T17:36:55.944Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 INFO [2026-02-03T17:36:55.944Z] Starting LLM API request...
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR === LLM Request Failed ===
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Elapsed time before failure (ms): 20018
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Error type: DOMException
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Error message: The operation was aborted due to timeout
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Error stack: TimeoutError: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Request was aborted/timed out
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Configured timeout was: 20000 ms
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Full error object: {"stack":"TimeoutError: The operation was aborted due to timeout\n at node:internal/deps/undici/undici:13510:13\n at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n at async callLLM (file:///var/task/dist/handlers/chat.js:998:22)\n at async processChat (file:///var/task/dist/handlers/chat.js:1487:23)\n at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)"}
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR ==========================
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR === Chat Handler Error ===
2026-02-03T17:37:15.962Z
2026-02-03T17:37:15.962Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Chat error: DOMException [TimeoutError]: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:15.963Z
2026-02-03T17:37:15.963Z 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 ERROR Error stack: TimeoutError: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:15.980Z
END RequestId: 7e653c9d-d78a-4c86-bbc4-3f2cb1872328
2026-02-03T17:37:15.980Z
REPORT RequestId: 7e653c9d-d78a-4c86-bbc4-3f2cb1872328 Duration: 20297.42 ms Billed Duration: 20729 ms Memory Size: 512 MB Max Memory Used: 108 MB Init Duration: 431.40 ms
2026-02-03T17:37:29.628Z
START RequestId: 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 Version: $LATEST
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO === Chat Handler Start ===
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Method: POST
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Path: /api/chat
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Body: {"message":"Show me pending reviews","conversation_history":[],"context":{}}
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Query params: null
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Path params: null
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO ==================================================
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO [2026-02-03T17:37:29.630Z] POST /api/chat
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Body: "{\"message\":\"Show me pending reviews\",\"conversation_history\":[],\"context\":{}}"
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO ==================================================
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Parsed body: {"message":"Show me pending reviews","conversation_history":[],"context":{}}
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Processing chat message: Show me pending reviews
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO processChat - Starting chat processing
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Message: Show me pending reviews
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Context: {}
2026-02-03T17:37:29.630Z
2026-02-03T17:37:29.630Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 1: Classifying intent...
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Intent: show_pending_reviews Confidence: 0.9
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Entities: {}
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 2: Resolving context references...
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Resolved context: {"resolved_from":"none"}
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 3: Gathering data for intent...
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO gatherDataForIntent - Intent: show_pending_reviews
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Entities: {}
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Resolved context: {"resolved_from":"none"}
2026-02-03T17:37:29.632Z
2026-02-03T17:37:29.632Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Fetching pending review tasks...
2026-02-03T17:37:29.658Z
2026-02-03T17:37:29.658Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Pending review tasks count: 1
2026-02-03T17:37:29.658Z
2026-02-03T17:37:29.658Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Focused on task: T000003
2026-02-03T17:37:29.658Z
2026-02-03T17:37:29.658Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Data context gathered, focused IDs: { task: 'T000003', client: undefined, policy: undefined }
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 4: Handling action intents...
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 5: Building prompts...
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Prompts built, system prompt length: 6176
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Step 6: Calling LLM...
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO === LLM Request Config ===
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO API URL: https://api.z.ai/api/paas/v4/chat/completions
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Model: glm-4.7-flashx
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Timeout (ms): 20000
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO API Key (preview): b8bb22b1...
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Message count: 2
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO Request body size (bytes): 12492
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO System prompt length: 11542
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO User message length: 23
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO ==========================
2026-02-03T17:37:29.659Z
2026-02-03T17:37:29.659Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 INFO [2026-02-03T17:37:29.659Z] Starting LLM API request...
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR === LLM Request Failed ===
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Elapsed time before failure (ms): 20001
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Error type: DOMException
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Error message: The operation was aborted due to timeout
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z	2a00bfc5-ccd2-4a0a-b704-76eda8b49b59	ERROR	Error stack: TimeoutError: The operation was aborted due to timeout
    at node:internal/deps/undici/undici:13510:13
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async callLLM (file:///var/task/dist/handlers/chat.js:998:22)
    at async processChat (file:///var/task/dist/handlers/chat.js:1487:23)
    at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)

2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Error stack: TimeoutError: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Request was aborted/timed out
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Configured timeout was: 20000 ms
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Full error object: {"stack":"TimeoutError: The operation was aborted due to timeout\n at node:internal/deps/undici/undici:13510:13\n at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n at async callLLM (file:///var/task/dist/handlers/chat.js:998:22)\n at async processChat (file:///var/task/dist/handlers/chat.js:1487:23)\n at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)"}
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR ==========================
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR === Chat Handler Error ===
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Chat error: DOMException [TimeoutError]: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:49.660Z
2026-02-03T17:37:49.660Z 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 ERROR Error stack: TimeoutError: The operation was aborted due to timeout at node:internal/deps/undici/undici:13510:13 at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async callLLM (file:///var/task/dist/handlers/chat.js:998:22) at async processChat (file:///var/task/dist/handlers/chat.js:1487:23) at async Runtime.handler (file:///var/task/dist/handlers/chat.js:1419:22)
2026-02-03T17:37:49.662Z
END RequestId: 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59
2026-02-03T17:37:49.662Z
REPORT RequestId: 2a00bfc5-ccd2-4a0a-b704-76eda8b49b59 Duration: 20033.59 ms Billed Duration: 20034 ms Memory Size: 512 MB Max Memory Used: 108 MB