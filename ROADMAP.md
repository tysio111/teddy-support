# Roadmap

Candidate features for Teddy Support, based on what [README.md](README.md) describes and what `src/` contains today. Apart from the hand-off inbox and summary, none of them are implemented yet. The code currently has no WebSocket or SSE, no webhooks, no feedback or CSAT, no rate limiting, no PII redaction and no scheduled jobs. Events and the per-conversation lock are in-process only, the deterministic bot replies are English only, and CI does not run the unit tests.

## Suggested order

1. Unit tests in CI and durable message processing, because both are cheap and protect everything else.
2. ~~Human hand-off inbox and summary~~ (done, see [README](README.md#human-hand-off)).
3. Feedback and analytics, so there is a way to measure everything else.
4. Streaming and channel adapters.
5. PII redaction and rate limiting.

## 1. Human hand-off (the biggest gap)

- ~~**Agent inbox / escalation queue**~~ and ~~**hand-off summary**~~: done (`/handoffs`, `ConversationStatusEnum`, Haiku summary).
- **Escalate on request**: "I want to talk to a human" currently ends as `no_intent` when the knowledge base is off. Detect it explicitly and escalate.
- **Agent copilot**: suggested replies drafted from the knowledge base and actions, which the agent approves or edits before sending.
- **SLA and routing**: assign by skill, language or load, and escalate again when an SLA is breached (`@nestjs/schedule`).

## 2. Channels and real time

- **Streaming replies** over an SSE or WebSocket gateway. Today replies are produced by fire-and-forget event listeners and the client has to poll `/messages`.
- **Channel adapters**: inbound and outbound webhooks for email (the mailer already exists), WhatsApp/Messenger, Slack and a web widget. Each channel maps to `conversation.channel`.
- **Outbound webhooks** to the business: `conversation.escalated`, `action.executed`, `intent.below_threshold`.

## 3. Quality loop and analytics

- **Feedback/CSAT**: thumbs up or down per bot message and a rating at the end of a conversation, stored and linked to the `DetectedIntent` and the knowledge sources used.
- **Analytics endpoints and dashboard**: outcome distribution (outcomes are already typed), containment rate (conversations resolved without a human), escalation reasons, latency and token cost per node (already logged; they need to be persisted), and action success rate per endpoint.
- **Knowledge gap mining**: cluster the `no_answer` and `below_threshold` messages to suggest missing help-centre articles or missing actions.
- **Production → eval goldens**: promote real conversations with negative feedback to the promptfoo goldens in [evals/rag](evals/rag/) and the intent fixtures in [src/intent-recognition/evals/fixtures.ts](src/intent-recognition/evals/fixtures.ts).
- **Online eval sampling**: an LLM judge scores a sample of live answers for faithfulness, reusing the promptfoo metric prompts.
- **Unit tests and evals in CI**: [docker-e2e.yml](.github/workflows/docker-e2e.yml) only lints and runs the E2E suite, so `npm test` never runs in CI. Add a job for it, plus a manual or nightly job for `npm run eval:intents` and the promptfoo RAG evals that fails below a score threshold.
- **Replay / shadow testing**: re-run stored conversations against a new prompt or model and diff the outcomes before changing `INTENT_LLM_MODEL` in production.
- **E2E coverage of the bot domain**: E2E tests only cover auth and users. Add messages → intent run (with a stubbed LLM) and resources → index.

## 4. Safety and compliance

- **PII redaction** before LLM calls and logging (card numbers, emails, phones), plus data retention and GDPR deletion per client.
- **Output guardrail**: check the answer against the cited chunks and policy before sending it. Today only incoming messages are screened.
- **Indirect prompt injection screening**: action responses and indexed help-centre documents also reach the LLM and are untrusted, but the guardrail only screens client messages.
- **Rate limiting** per client or conversation (`@nestjs/throttler`) and a cost budget per conversation.
- **Credentials**: encrypt `Action.authCredential` at rest, and add OAuth2 client credentials as an `authType`.

## 5. Actions

- **Read-only lookups for context**: call safe GET actions (such as order status) automatically to ground knowledge answers.
- **Multi-step workflows**: chain actions (for example `check_order_status` → `request_return`), passing the outputs of one action to the next as parameters.
- **Client identity binding**: fill parameters automatically from `Client.externalReference` and check ownership (the order belongs to this client).
- **Action sandbox / dry run** endpoint for admins, and a deterministic import of actions from an OpenAPI spec alongside the LLM doc extraction.
- **Response templating**: a response schema per action, so `generateResponse` only shows whitelisted fields.

## 6. Intent recognition

- **Localised deterministic replies**: [bot-replies.ts](src/intent-recognition/prompts/bot-replies.ts) (clarification, confirmation, declined, fallback) is English only, while LLM replies and RAG handle Polish and German. Use the existing `nestjs-i18n` with the client's detected language, and accept "tak" or "ja" when parsing confirmations.
- **Several intents in one message**: for "cancel ORD-1 and track ORD-2" only the best candidate runs; the others are only fallbacks. Queue the remaining intents and handle them one after another.
- **Catalog pre-filtering**: every classification prompt contains the whole catalog ([classification.prompt.ts](src/intent-recognition/prompts/classification.prompt.ts)). With 100+ actions, embed the action descriptions with Voyage and send only the top N to the classifier.
- **Prompt caching for intent nodes**: only knowledge contextualisation uses `cache_control` ([knowledge-llm.service.ts](src/knowledge/llm/knowledge-llm.service.ts)). The system prompt and catalog for classification and extraction rarely change and can be cached to cut cost and latency.
- **Attachments and images**: photos of a damaged item for a return or a screenshot of an error, passed to Claude vision during classification and extraction.
- **Resolution detection**: close a conversation when the client says they are done or after inactivity (needs the status enum from section 1).

## 7. Knowledge base

- **Sources beyond file uploads**: crawl URLs (`Resource.sourceUrl` already exists), sync from Notion, Confluence or Zendesk, and re-index on a schedule.
- **Incremental re-index**: compare chunk content hashes and re-embed only the chunks that changed, instead of the whole document.
- **Answer caching** for frequent questions (a semantic cache in Qdrant).
- **Per-document metadata filters** (locale, product, validity dates) and a draft/published state for articles.

## 8. Runtime

- **Durable message processing**: `message.created` is an in-process `EventEmitter2` event ([messages.service.ts](src/messages/messages.service.ts)), so a crash between saving the message and running the graph silently loses the run. Use a transactional outbox or a BullMQ queue, plus a sweeper that re-runs client messages with no detected intent and no bot reply.
- **Cross-instance conversation lock**: the lock is an in-memory `Map` ([intent-recognition.listener.ts](src/intent-recognition/intent-recognition.listener.ts)), so two replicas can run the same conversation at once. Use a Postgres advisory lock, as the comment there suggests.
- **Health checks** with `@nestjs/terminus` for Postgres, Qdrant, Anthropic and Voyage. There is no health endpoint today.
- **Graph versioning for paused runs**: a run paused at `awaitClarification` or `awaitConfirmation` may not resume after a deploy that changes the nodes or the state shape. Store a graph version in the state and expire or migrate incompatible threads.

## 9. Platform

- **Proactive messages**: notify the client of events such as shipment status changes in the same conversation.
- **Persona and tone config per instance** (brand voice, languages) that an admin can edit, instead of env vars only.
- **Admin UI** over the existing REST API: draft action review, the inbox, analytics and knowledge status.
- **Multi-tenancy**, if one instance per customer stops scaling. It was removed on purpose in `93ff148`, so it has the lowest priority.
