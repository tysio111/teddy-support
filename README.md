# Teddy Support

An AI customer-support backend built on NestJS. For every client message it:

1. **Works out what the client wants** and calls the matching action, an endpoint of the business's own HTTP API (for example checking an order, booking an appointment or updating account details). It collects any missing parameters and asks for confirmation when the action needs it.
2. **Answers general questions** (shipping, returns, payments…) from a help-centre knowledge base using retrieval-augmented generation (RAG), with citations.
3. **Hands the conversation to a human** when it cannot help safely.

Admins can also upload API documentation and let Claude draft the action catalog from it.

## Table of Contents <!-- omit in toc -->

- [Architecture](#architecture)
- [Deployment model](#deployment-model)
- [Domain model](#domain-model)
- [Intent recognition](#intent-recognition)
  - [How a run starts](#how-a-run-starts)
  - [Graph](#graph)
  - [Nodes](#nodes)
  - [Outcomes](#outcomes)
  - [Human in the loop](#human-in-the-loop)
  - [Resilience](#resilience)
- [Knowledge base (RAG)](#knowledge-base-rag)
  - [Indexing](#indexing)
  - [Answering](#answering)
- [Action extraction from API docs](#action-extraction-from-api-docs)
- [REST API](#rest-api)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Evaluation and testing](#evaluation-and-testing)
- [Boilerplate features](#boilerplate-features)

## Architecture

```mermaid
flowchart LR
  subgraph Clients
    C[Client / channel]
    A[Admin]
  end

  subgraph API["NestJS API (/api/v1)"]
    MSG[Messages]
    RES[Resources]
    IR[Intent recognition<br/>LangGraph]
    KN[Knowledge service]
    DX[Doc extraction]
    IDX[Knowledge indexer]
  end

  subgraph Infra
    PG[(PostgreSQL<br/>data + LangGraph checkpoints)]
    QD[(Qdrant<br/>vectors)]
    FS[(Files<br/>local / S3)]
  end

  subgraph External
    CL[Claude<br/>Anthropic API]
    VO[Voyage AI<br/>embeddings]
    BIZ[Business HTTP API<br/>actions]
  end

  C -- POST message --> MSG
  MSG -.->|"message.created"| IR
  IR -- action intent --> BIZ
  IR -- general question --> KN
  KN --> QD
  KN --> VO
  IR --> CL
  KN --> CL
  IR --> PG

  A -- upload doc --> RES
  RES --> FS
  RES -.->|"action-extraction.requested"| DX
  RES -.->|"knowledge-index.requested"| IDX
  DX --> CL
  DX -- draft actions --> PG
  IDX --> VO
  IDX --> CL
  IDX --> QD
```

Long-running work is decoupled through in-process events (`@nestjs/event-emitter`, async listeners, no external queue):

| Event | Emitted by | Listener | Work |
| --- | --- | --- | --- |
| `message.created` | `MessagesService.create` | [intent-recognition.listener.ts](src/intent-recognition/intent-recognition.listener.ts) | Runs or resumes the intent graph |
| `action-extraction.requested` | `POST /resources/:id/extract-actions` | [doc-extraction.listener.ts](src/doc-extraction/doc-extraction.listener.ts) | Drafts actions from an API doc |
| `knowledge-index.requested` | `POST /resources/:id/index` | [knowledge.listener.ts](src/knowledge/knowledge.listener.ts) | Chunks, embeds and indexes a document |

## Deployment model

The app is single-tenant: each customer gets its own app instance and its own database, configured through that instance's `.env`. Nothing in the code is scoped by company. Access is controlled by the global roles:

- `admin` manages actions, action parameters and resources.
- `admin` and `user` handle clients, conversations and messages.

Per-customer settings such as `INTENT_DEFAULT_CONFIDENCE_THRESHOLD` are environment variables.

## Domain model

```mermaid
erDiagram
  CLIENT ||--o{ CONVERSATION : has
  CONVERSATION ||--o{ MESSAGE : contains
  MESSAGE ||--o{ DETECTED_INTENT : "classified as"
  ACTION |o--o{ DETECTED_INTENT : matches
  ACTION ||--o{ ACTION_PARAMETER : defines
  ACTION ||--o{ ACTION_EXECUTION : "called in"
  DETECTED_INTENT ||--o{ ACTION_EXECUTION : "one row per attempt"
  RESOURCE |o--o{ ACTION : "drafted from"
  RESOURCE |o--o| FILE : stores
  ROLE ||--o{ USER : ""
  STATUS ||--o{ USER : ""
  USER ||--o{ SESSION : ""
  USER |o--o| FILE : photo

  CLIENT {
    uuid id
    string name
    string email
    string externalReference
  }
  CONVERSATION {
    uuid id
    string channel
    string status
    datetime lastMessageAt
  }
  MESSAGE {
    uuid id
    string content
    enum sender
  }
  DETECTED_INTENT {
    uuid id
    float confidenceScore
    int rank
    enum status
    json extractedParameters
  }
  ACTION {
    uuid id
    string name
    string description
    string endpointUrl
    string httpMethod
    enum authType
    string authCredential
    float confidenceThreshold
    enum status
    bool requiresConfirmation
  }
  ACTION_PARAMETER {
    uuid id
    string name
    string type
    string description
    bool isRequired
    string enumValues
    int order
  }
  ACTION_EXECUTION {
    uuid id
    json requestPayload
    enum status
    int responseStatusCode
    json responsePayload
    string errorMessage
    datetime executedAt
  }
  RESOURCE {
    uuid id
    string title
    string type
    string sourceUrl
    enum status
    enum indexStatus
    string vectorRef
  }
```

| Enum | Values |
| --- | --- |
| Action status | `active`, `inactive`, `draft` (extracted from docs, awaiting admin review) |
| Action auth type | `none`, `bearer`, `api_key`, `basic` |
| Detected intent status | `detected`, `below_threshold`, `needs_clarification`, `awaiting_confirmation`, `declined`, `executed`, `execution_failed`, `escalated`, `failed` |
| Action execution status | `success`, `failed` |
| Message sender | `client`, `agent`, `bot` |
| Resource status (action extraction) | `uploaded`, `processing`, `extracted`, `failed` |
| Resource index status (knowledge) | `indexing`, `indexed`, `failed` |

Action credentials are never put into LLM prompts. The catalog given to the model has them stripped, and they are loaded just in time when the action is executed.

## Intent recognition

Every client message runs through a [LangGraph](https://langchain-ai.github.io/langgraphjs/) state machine ([src/intent-recognition/graph](src/intent-recognition/graph/intent-graph.ts)). The graph detects what the client wants, collects the parameters and calls the matching HTTP action. If the message matches no action, the graph answers it from the knowledge base instead.

### How a run starts

- Creating a message emits `message.created`. The listener only reacts to `client` messages, and only when `INTENT_RECOGNITION_ENABLED=true`.
- Runs for the same conversation are serialised by a per-conversation lock.
- The LangGraph thread is the conversation (`thread_id = conversationId`). If the previous run is paused waiting for the client (clarification or confirmation) and has not expired (`INTENT_PENDING_INPUT_TTL_MS`), the new message **resumes** it. Otherwise a fresh run starts. If the client changed the subject instead of answering a confirmation, the resumed run ends as `superseded` and a fresh run handles the message.

### Graph

```mermaid
flowchart TD
  START((start)) --> loadContext
  loadContext -- ok --> dedupe
  dedupe -- ok --> guardrail
  guardrail -- allow --> classifyIntent
  loadContext & dedupe & guardrail -- "skipped / duplicate / blocked" --> END((end))

  classifyIntent -- "intents found" --> persistIntents
  classifyIntent -- "no intent / no actions<br/>(knowledge enabled)" --> answerFromKnowledge
  classifyIntent -- "no intent<br/>(knowledge disabled)" --> END
  answerFromKnowledge -- "answered / small talk" --> END
  answerFromKnowledge -- no_answer --> escalateToHuman

  persistIntents -- "Send × N (parallel)" --> extractParameters
  persistIntents -- below_threshold --> escalateToHuman
  extractParameters --> validateParameters
  validateParameters -- "invalid, attempts left" --> repairParameters --> validateParameters
  validateParameters --> selectCandidate

  selectCandidate -- "missing params, rounds left" --> askClarification --> awaitClarification
  awaitClarification -.->|"⏸ client reply → Send"| extractParameters
  selectCandidate -- "missing params, rounds exhausted" --> escalateToHuman
  selectCandidate -- requiresConfirmation --> askConfirmation --> awaitConfirmation
  awaitConfirmation -.->|"⏸ yes"| checkCircuit
  awaitConfirmation -.->|"⏸ no"| generateResponse
  awaitConfirmation -.->|"⏸ unrelated"| END
  selectCandidate -- ready --> checkCircuit
  selectCandidate -- "no usable candidate" --> handleError

  checkCircuit -- closed --> executeAction --> recordAttempt
  checkCircuit -- open --> escalateToHuman
  recordAttempt -- retryable --> backoff --> executeAction
  recordAttempt --> finalizeExecution
  finalizeExecution -- executed --> generateResponse --> END
  finalizeExecution -- failed --> escalateToHuman

  handleError --> escalateToHuman --> END
```

Any node whose retries run out routes to `handleError`. The live diagram, generated from the compiled graph, is served at `GET /api/v1/intent-recognition/graph` (admin only).

### Nodes

| Node | Kind | Purpose |
| --- | --- | --- |
| `loadContext` | IO | Loads the message, the recent history (`INTENT_HISTORY_LIMIT`) and the catalog of active actions and their parameters, with credentials stripped |
| `dedupe` | IO | Stops if this message already has detected intents |
| `guardrail` | LLM | Prompt-injection screen: a regex pre-check, then an LLM verdict. Anything other than `allow` sets `blocked`. Can be turned off with `INTENT_GUARDRAIL_ENABLED=false` |
| `classifyIntent` | LLM | Ranks up to `INTENT_MAX_CANDIDATES` matching actions with a confidence score. General questions get no candidates |
| `persistIntents` | IO | Saves one `DetectedIntent` per candidate and compares each with its threshold (the action's `confidenceThreshold`, or the default) |
| `extractParameters` | LLM, fan-out | Extracts parameters for every candidate above its threshold, in parallel, so the next candidate is ready as a fallback |
| `validateParameters` | pure | Validates the extracted values against each parameter's type, required flag and enum values |
| `repairParameters` | LLM | Re-runs extraction with the validation errors fed back (`INTENT_MAX_REPAIR_ATTEMPTS`) |
| `selectCandidate` | IO | Picks the best-ranked extraction that succeeded and works out which parameters are missing |
| `askClarification` / `awaitClarification` | IO + ⏸ | Asks for the missing parameters and pauses with `interrupt()` (`INTENT_MAX_CLARIFICATION_ROUNDS`) |
| `askConfirmation` / `awaitConfirmation` | IO + ⏸ | For actions with `requiresConfirmation`: asks the client and pauses, then parses yes, no or unrelated |
| `checkCircuit` | IO | Circuit breaker built from recent `ActionExecution` rows |
| `executeAction` → `recordAttempt` → `backoff` | IO | Makes the HTTP call with an `Idempotency-Key`, writes one row per attempt and retries with jittered backoff |
| `finalizeExecution` | IO | Sets `executed` or `execution_failed` |
| `generateResponse` | LLM | Writes the reply to the client from the action result. If the LLM fails, a canned reply is sent instead |
| `answerFromKnowledge` | LLM | Runs the [RAG pipeline](#answering) and replies with citations, or sets `no_answer` |
| `handleError` / `escalateToHuman` | IO | Marks the intent `failed` or `escalated` and sends a hand-off message |

Nodes live in [src/intent-recognition/graph/nodes](src/intent-recognition/graph/nodes/) and prompts in [src/intent-recognition/prompts](src/intent-recognition/prompts/).

### Outcomes

Every run ends with one outcome ([intent-recognition.types.ts](src/intent-recognition/intent-recognition.types.ts)):

| Group | Outcomes |
| --- | --- |
| Stopped early | `skipped`, `duplicate`, `blocked`, `no_actions`, `no_intent` |
| Knowledge | `answered`, `no_answer` |
| Waiting for the client | `needs_clarification`, `awaiting_confirmation` |
| Ended by the client | `declined`, `superseded` |
| Action | `executed`, `execution_failed`, `circuit_open` |
| Other | `below_threshold`, `failed` |

### Human in the loop

The run pauses with `interrupt()` and its state is checkpointed in Postgres (schema `langgraph`). The client's next message resumes it, even after the process restarts. The example below uses the e-commerce seed data.

```mermaid
sequenceDiagram
  autonumber
  actor Client
  participant API as Messages API
  participant G as Intent graph
  participant CP as Postgres checkpointer
  participant Biz as Business API

  Client->>API: "Cancel my order please"
  API-->>G: message.created → run()
  G->>G: classify → cancel_order (0.93)<br/>extract → orderId missing
  G->>Client: "Which order number?"
  G->>CP: interrupt (clarification)
  Client->>API: "ORD-100234"
  API-->>G: message.created → resume()
  G->>CP: load state
  G->>G: re-extract → orderId = ORD-100234
  G->>Client: "Cancel order ORD-100234? (yes/no)"
  G->>CP: interrupt (confirmation)
  Client->>API: "yes"
  API-->>G: resume()
  G->>G: checkCircuit (closed)
  G->>Biz: POST /orders/ORD-100234/cancel<br/>Idempotency-Key
  Biz-->>G: 200 OK
  G->>Client: "Your order has been cancelled."
```

### Resilience

| Layer | Mechanism |
| --- | --- |
| LLM transport | SDK retries (`maxRetries`) |
| LLM model | Fallback chain `primary.withFallbacks([fallback])` (`INTENT_LLM_FALLBACK_MODEL`) |
| Graph node | `retryPolicy` with exponential backoff, only for transient errors ([transient-error.ts](src/intent-recognition/graph/transient-error.ts)), plus a per-node `timeout` (`INTENT_LLM_NODE_TIMEOUT_MS`) |
| Node failure | Once retries run out, `errorHandler` routes to `handleError` → `escalateToHuman`. If extraction fails for one candidate, the next candidate is used instead |
| LLM output | Zod structured output and validation, then a bounded repair loop that feeds the errors back to the model |
| Action call | Explicit retry loop. It only retries when the HTTP method makes that safe, honors `Retry-After`, uses full-jitter backoff and sends an `Idempotency-Key`. One `ActionExecution` row is written per attempt |
| Endpoint health | Circuit breaker built from recent `ActionExecution` rows (closed, open or half-open; `INTENT_CIRCUIT_*`) |
| Knowledge | If the knowledge base cannot answer (`no_answer`), the conversation goes to a human |
| Reply | If the LLM reply fails, a canned reply is sent |
| Process crash / waiting for client | Postgres checkpointer (`thread_id` = conversation). `interrupt()` pauses for clarification or confirmation, and the next client message resumes the run |

Newer Claude models (Opus 4.7+, Sonnet 5, Fable 5, …) only support adaptive sampling. [anthropic-models.ts](src/utils/anthropic-models.ts) handles this centrally: these models get no `temperature` and use `jsonSchema` structured output instead of forced tool calls.

## Knowledge base (RAG)

[src/knowledge](src/knowledge/) turns help-centre documents (Resources with a file attached) into a searchable knowledge base. The intent graph uses it when a message is a general question rather than an action request.

Stack: **Voyage AI** embeddings, **Qdrant** hybrid search (dense + BM25 sparse, RRF fusion), **Claude Haiku** for query rewriting, contextual chunks and reranking, and **Claude Opus** for the final answer.

### Indexing

```mermaid
flowchart LR
  R["POST /resources/:id/index<br/>indexStatus = indexing"] -.->|"knowledge-index.requested"| T
  T["Extract text<br/>PDF · DOCX · MD · TXT"] --> CH["Chunk by markdown section<br/>~500 tokens, 75 overlap<br/>keeps heading path"]
  CH --> CX["Contextualise each chunk<br/>Haiku, document prompt-cached"]
  CX --> E1["Dense embedding<br/>Voyage voyage-3.5"]
  CX --> E2["Sparse BM25 vector<br/>Snowball stemming"]
  E1 & E2 --> Q[("Qdrant upsert<br/>under new version")]
  Q --> D["Delete the previous<br/>version's points"]
  D --> OK["indexStatus = indexed<br/>vectorRef = version"]
  T & CH & E1 & Q -.->|"error"| F["indexStatus = failed<br/>indexError"]
```

- Each chunk is embedded as `Title > Heading > …` + its generated context + the chunk text.
- Re-indexing writes a new version before deleting the old one, so the resource always has searchable chunks.
- `DELETE /resources/:id/index` removes the resource's points and clears its index fields.
- Changing `KNOWLEDGE_EMBEDDING_MODEL` or `KNOWLEDGE_EMBEDDING_DIMENSION` requires re-indexing everything.

### Answering

```mermaid
flowchart LR
  M[Client message<br/>+ recent history] --> RW["Rewrite to a standalone query<br/>(and translate to KNOWLEDGE_LANGUAGE)"]
  RW --> HY{"HyDE?"}
  HY -- on --> H["Hypothetical passage<br/>added to dense query"]
  HY -- off --> S
  H --> S["Hybrid search in Qdrant<br/>dense + sparse → RRF"]
  S --> RR{"Rerank?"}
  RR -- on --> RK["Haiku rates 20 candidates 0–3<br/>keep ≥ KNOWLEDGE_MIN_RELEVANCE"]
  RR -- off --> TK
  RK --> TK["Top-K chunks (6)"]
  TK --> AN["Answer model (Opus)<br/>structured output + sources"]
  AN --> O1[answered + citations]
  AN --> O2[small_talk]
  AN --> O3[not_found → escalate]
```

`POST /api/v1/knowledge/query` (admin) runs the same pipeline outside a conversation. It accepts the per-request switches `hybrid`, `hyde` and `rerank` and returns every intermediate step: rewritten query, candidates, contexts, chunks and latency. The RAG evals and ablations use it.

## Action extraction from API docs

Admins attach an API document (PDF or DOCX) to a Resource. [src/doc-extraction](src/doc-extraction/) asks Claude (`DOC_EXTRACTION_MODEL`) to read it with structured output and drafts the action catalog from it: name, method, URL, auth type, confirmation flag and typed parameters.

```mermaid
stateDiagram-v2
  [*] --> uploaded
  uploaded --> processing: POST /resources/:id/extract-actions
  processing --> extracted: draft Actions + ActionParameters saved
  processing --> failed: extractionError
  extracted --> processing: re-run (replaces previous drafts)
  failed --> processing: retry
```

Extracted actions are saved with status `draft`. An admin reviews them, adds credentials and sets them to `active` before the intent graph can use them. Re-running extraction replaces earlier drafts and leaves active actions alone.

## REST API

All routes are under `/api/v1` and documented with Swagger at `/docs`. Authentication uses email + password with JWT access and refresh tokens.

| Route | Roles | Notes |
| --- | --- | --- |
| `/auth/*` | public / JWT | Register, confirm email, login, refresh, forgot and reset password, `me` |
| `/clients`, `/conversations`, `/messages` | admin, user | CRUD. Creating a message triggers intent recognition |
| `/actions`, `/action-parameters` | admin | Action catalog. `GET /actions?status=draft&resourceId=…` |
| `/detected-intents`, `/action-executions` | admin | Audit trail of what the bot detected and called |
| `/resources` | admin | Documents that feed doc extraction and the knowledge base |
| `POST /resources/:id/extract-actions` | admin | Starts action extraction (202) |
| `POST` / `DELETE /resources/:id/index` | admin | Indexes or removes a document in the knowledge base |
| `POST /knowledge/query` | admin | Runs the RAG pipeline directly |
| `GET /intent-recognition/graph` | admin | Mermaid source of the live graph |
| `/users` | admin | User management |
| `/files/upload` | JWT | Local, S3 or S3-presigned driver (`FILE_DRIVER`) |

## Getting started

Prerequisites: Node (see `.nvmrc`) and Docker. An Anthropic API key is required for the LLM features, and a Voyage API key for the knowledge base.

```bash
cp env-example-relational .env
# set DATABASE_HOST=localhost, MAIL_HOST=localhost for running the API outside Docker
# set ANTHROPIC_API_KEY, INTENT_RECOGNITION_ENABLED=true
# set VOYAGE_API_KEY, KNOWLEDGE_ENABLED=true

docker compose up -d postgres qdrant maildev adminer
npm install
npm run migration:run
npm run seed:run:relational
npm run start:dev           # http://localhost:3001/docs
```

To run the whole stack in Docker (migrations, seed and API): `docker compose up -d`.

**Seed data** (an example e-commerce platform; the actions and documents are just demo content):

- Users: `admin@example.com` (admin) and `john.doe@example.com` (user), both with password `secret`.
- 13 e-commerce actions with parameters, such as `check_order_status`, `track_shipment`, `cancel_order` (needs confirmation), `request_return` and `validate_discount_code`. They call `SEED_SHOP_API_URL` (httpbin by default).
- 4 clients with conversation history.
- 6 help-centre documents ([docs](src/database/seeds/relational/resource/docs/)): shipping, returns, payment methods, size guide, promotions and terms. Index each one with `POST /api/v1/resources/:id/index`.

**Chat playground.** Talk to the bot in the terminal against the seeded database:

```bash
npm run chat                                  # new conversation
npm run chat -- mark.schmidt@example.com      # latest conversation of a seeded client
npm run chat -- <conversationId> "where is my order ORD-100234?"
```

After each reply the playground prints the outcome, the intent, its parameters, the action call and knowledge sources, the node path, latency and token usage. Commands: `/history`, `/new`, `/quit`.

## Configuration

All settings come from `.env` (see [env-example-relational](env-example-relational)).

**Intent recognition** ([intent-recognition.config.ts](src/intent-recognition/config/intent-recognition.config.ts))

| Variable | Default | Purpose |
| --- | --- | --- |
| `INTENT_RECOGNITION_ENABLED` | `false` | Turns the graph on |
| `ANTHROPIC_API_KEY` | — | Shared by all LLM features |
| `INTENT_LLM_MODEL` / `INTENT_LLM_FALLBACK_MODEL` | `claude-haiku-4-5-20251001` / — | Primary and fallback model |
| `INTENT_DEFAULT_CONFIDENCE_THRESHOLD` | `0.7` | Used when an action has no own threshold |
| `INTENT_MAX_CANDIDATES` | `3` | Ranked candidates per message |
| `INTENT_HISTORY_LIMIT` | `20` | Messages of context |
| `INTENT_GUARDRAIL_ENABLED` | `true` | Prompt-injection screen |
| `INTENT_LLM_NODE_TIMEOUT_MS` | `30000` | Per-node timeout for LLM nodes |
| `INTENT_MAX_REPAIR_ATTEMPTS` / `INTENT_MAX_CLARIFICATION_ROUNDS` | `2` / `2` | Loop bounds |
| `ACTION_EXECUTION_TIMEOUT_MS` | `10000` | HTTP timeout per action call |
| `INTENT_MAX_EXECUTION_ATTEMPTS`, `INTENT_EXECUTION_BACKOFF_BASE_MS`, `INTENT_EXECUTION_MAX_BACKOFF_MS` | `3`, `500`, `10000` | Action retries |
| `INTENT_CIRCUIT_WINDOW_MS`, `_FAILURE_RATE`, `_MIN_CALLS`, `_COOLDOWN_MS` | `300000`, `0.5`, `5`, `30000` | Circuit breaker |
| `INTENT_CHECKPOINTER` | `postgres` | `postgres` or `memory` |
| `INTENT_PENDING_INPUT_TTL_MS` | `86400000` | How long a paused run can be resumed |

**Knowledge base** ([knowledge.config.ts](src/knowledge/config/knowledge.config.ts))

| Variable | Default | Purpose |
| --- | --- | --- |
| `KNOWLEDGE_ENABLED` | `false` | Routes unmatched messages to RAG |
| `VOYAGE_API_KEY` | — | Embeddings |
| `QDRANT_URL`, `QDRANT_API_KEY`, `KNOWLEDGE_COLLECTION` | `http://localhost:6333`, —, `knowledge` | Vector store |
| `KNOWLEDGE_EMBEDDING_MODEL`, `KNOWLEDGE_EMBEDDING_DIMENSION` | `voyage-3.5`, `1024` | Changing either requires re-indexing |
| `KNOWLEDGE_LANGUAGE` | — | Snowball stemmer language. Queries are translated into it |
| `KNOWLEDGE_FAST_MODEL` | `claude-haiku-4-5` | Rewrite, HyDE, contextual chunks, rerank |
| `KNOWLEDGE_ANSWER_MODEL`, `KNOWLEDGE_ANSWER_EFFORT`, `KNOWLEDGE_ANSWER_MAX_TOKENS` | `claude-opus-5-5`, `medium`, `4000` | Answer generation |
| `KNOWLEDGE_CHUNK_TOKENS`, `KNOWLEDGE_CHUNK_OVERLAP_TOKENS`, `KNOWLEDGE_CONTEXTUAL_CHUNKS` | `500`, `75`, `true` | Chunking |
| `KNOWLEDGE_PREFETCH_LIMIT`, `KNOWLEDGE_RERANK_CANDIDATES`, `KNOWLEDGE_TOP_K`, `KNOWLEDGE_MIN_RELEVANCE` | `40`, `20`, `6`, `2` | Retrieval sizes |
| `KNOWLEDGE_RERANK_ENABLED`, `KNOWLEDGE_HYDE_ENABLED` | `true`, `false` | Pipeline switches |
| `KNOWLEDGE_HISTORY_LIMIT` | `6` | Turns used for query rewriting |

**Doc extraction**: `DOC_EXTRACTION_MODEL` (`claude-sonnet-5-5`), `DOC_EXTRACTION_MAX_TOKENS` (`16000`).

**Tracing**: `LANGSMITH_TRACING=true`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`.

App, database, mail, file storage and auth settings are listed in [env-example-relational](env-example-relational).

## Evaluation and testing

| Command | What it checks |
| --- | --- |
| `npm run eval:intents` | Classification and parameter extraction against [fixtures](src/intent-recognition/evals/fixtures.ts), using the real model |
| `cd evals/rag && npm run eval` | RAG quality with [promptfoo](https://promptfoo.dev) against the running API |
| `cd evals/rag && npm run eval:ablations` | The same goldens across `baseline`, `rerank-off`, `dense-only` and `hyde-on` |
| `npm test` | Unit tests (graph routing and service, circuit breaker, executor, chunker, retriever, vector store, sparse encoder, doc extraction, …) |
| `npm run test:e2e` | E2E tests for auth and users |

The RAG evals ([evals/rag](evals/rag/README.md)) use 27 golden cases: single questions, follow-ups, Polish and German, out-of-scope and small talk. They score contextual precision, context recall, context relevance, faithfulness and answer relevance, with Claude Sonnet as the judge. `npm run synthesize -- <docs_dir>` drafts new goldens from markdown docs.

Observability: the latency and token usage of each node are logged for every run. Set `LANGSMITH_TRACING=true` for full traces.

CI ([.github/workflows/docker-e2e.yml](.github/workflows/docker-e2e.yml)) builds the Docker stack, runs migrations and seeds, lints and runs the E2E suite on every push and PR to `main`.

## Boilerplate features

- [x] PostgreSQL with [TypeORM](https://www.npmjs.com/package/typeorm), migrations and seeding.
- [x] Code generators for resources and properties (`npm run generate:resource:relational`, `npm run add:property:to-relational`).
- [x] Config Service ([@nestjs/config](https://www.npmjs.com/package/@nestjs/config)).
- [x] Mailing ([nodemailer](https://www.npmjs.com/package/nodemailer)) with Maildev for development.
- [x] Sign in and sign up via email, JWT access and refresh tokens, sessions.
- [x] Admin and User roles.
- [x] Internationalization ([nestjs-i18n](https://www.npmjs.com/package/nestjs-i18n)).
- [x] File uploads with local, Amazon S3 and S3-presigned drivers.
- [x] Swagger.
- [x] Unit and E2E tests.
- [x] Docker and CI (GitHub Actions).
- [ ] Social sign-in: the interfaces exist, but no provider modules are wired.
