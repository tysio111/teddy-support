# Roadmap

Candidate features for Teddy Support, based on what [README.md](README.md) describes and what `src/` contains today. None of them are implemented yet. The code currently has no WebSocket or SSE, no webhooks, no feedback or CSAT, no rate limiting, no PII redaction and no scheduled jobs. `Conversation.status` is a free-form string, and an escalation only sends a hand-off message; there is no agent workflow behind it.

## Suggested order

1. Human hand-off inbox and summary, because escalations currently go nowhere.
2. Feedback and analytics, so there is a way to measure everything else.
3. Streaming and channel adapters.
4. PII redaction and rate limiting.

## 1. Human hand-off (the biggest gap)

- **Agent inbox / escalation queue**: when a run escalates, set `conversation.status = escalated`, using an enum (`open`, `bot`, `escalated`, `assigned`, `resolved`) instead of the free-form string. Assign the conversation to a `user` and pause the bot until it is handed back. The `agent` sender already exists in `MessageSender`.
- **Hand-off summary**: Haiku summarises the conversation, the detected intents, the collected parameters and the failed executions, so the agent does not have to read the whole history.
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

## 4. Safety and compliance

- **PII redaction** before LLM calls and logging (card numbers, emails, phones), plus data retention and GDPR deletion per client.
- **Output guardrail**: check the answer against the cited chunks and policy before sending it. Today only incoming messages are screened.
- **Rate limiting** per client or conversation (`@nestjs/throttler`) and a cost budget per conversation.
- **Credentials**: encrypt `Action.authCredential` at rest, and add OAuth2 client credentials as an `authType`.

## 5. Actions

- **Read-only lookups for context**: call safe GET actions (such as order status) automatically to ground knowledge answers.
- **Multi-step workflows**: chain actions (for example `check_order_status` → `request_return`), passing the outputs of one action to the next as parameters.
- **Client identity binding**: fill parameters automatically from `Client.externalReference` and check ownership (the order belongs to this client).
- **Action sandbox / dry run** endpoint for admins, and a deterministic import of actions from an OpenAPI spec alongside the LLM doc extraction.
- **Response templating**: a response schema per action, so `generateResponse` only shows whitelisted fields.

## 6. Knowledge base

- **Sources beyond file uploads**: crawl URLs (`Resource.sourceUrl` already exists), sync from Notion, Confluence or Zendesk, and re-index on a schedule.
- **Incremental re-index**: compare chunk content hashes and re-embed only the chunks that changed, instead of the whole document.
- **Answer caching** for frequent questions (a semantic cache in Qdrant).
- **Per-document metadata filters** (locale, product, validity dates) and a draft/published state for articles.

## 7. Platform

- **Proactive messages**: notify the client of events such as shipment status changes in the same conversation.
- **Persona and tone config per instance** (brand voice, languages) that an admin can edit, instead of env vars only.
- **Admin UI** over the existing REST API: draft action review, the inbox, analytics and knowledge status.
- **Multi-tenancy**, if one instance per customer stops scaling. It was removed on purpose in `93ff148`, so it has the lowest priority.
