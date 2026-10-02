# Knowledge base evals (promptfoo)

Black-box evals of the RAG pipeline through `POST /api/v1/knowledge/query`. The
eval calls the running API, so whatever the server is configured with gets
measured.

## Setup

```bash
# 1. API with the knowledge base on (.env): KNOWLEDGE_ENABLED=true,
#    VOYAGE_API_KEY, ANTHROPIC_API_KEY
docker compose up -d postgres qdrant
npm run seed:run:relational        # attaches the help center docs to resources
npm run start:dev

# 2. Index the seeded resources (as admin)
TOKEN=$(curl -s localhost:3001/api/v1/auth/email/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"secret"}' | jq -r .token)
for id in $(curl -s "localhost:3001/api/v1/resources?limit=50" \
  -H "authorization: Bearer $TOKEN" | jq -r '.data[].id'); do
  curl -s -X POST "localhost:3001/api/v1/resources/$id/index" \
    -H "authorization: Bearer $TOKEN" > /dev/null
done

# 3. Eval environment (promptfoo needs Node >= 22.22, see .nvmrc)
cd evals/rag
nvm use
npm install
export ANTHROPIC_API_KEY=...       # judge model
export VOYAGE_API_KEY=...          # embeddings for answer relevancy
```

Or pass `-- --env-file ../../.env` to the npm scripts below.

## Running

```bash
npm run eval              # baseline (server defaults)
npm run view              # browse results in the promptfoo web UI
```

Ablations are providers in `promptfooconfig.yaml`, each overriding one server
setting per request (`hybrid`, `hyde`, `rerank`). Run them side by side, one
column per variant:

```bash
npm run eval:ablations
npx promptfoo eval --filter-providers '^(baseline|rerank-off)$'
```

Keep a component only if it beats the baseline on these metrics enough to
justify its latency and cost (latency is in each result, the server-side
`serverLatencyMs` in its metadata).

| Metric | Assertion | Measures |
| --- | --- | --- |
| contextual-precision | `assertions/contextual-precision.js` | relevant chunks ranked above irrelevant ones |
| contextual-recall | `context-recall` | the chunks contain everything the expected answer needs |
| contextual-relevancy | `context-relevance` | share of retrieved text that is relevant |
| faithfulness | `context-faithfulness` | the reply is grounded in the chunks (no hallucination) |
| answer-relevancy | `answer-relevance` | the reply addresses the question |
| status | `assertions/status.js` | `answered` / `not_found` / `small_talk` as expected |

Out-of-scope questions must be `not_found` (so a human takes over) and small
talk `small_talk` (so nobody is paged); they are only checked on status.
Thresholds were carried over from the DeepEval suite, but promptfoo scores
some metrics differently (answer relevancy is an embedding similarity), so
recalibrate them against a baseline run.

## Golden set

`goldens.json` is hand-written against the seed docs in
`src/database/seeds/relational/resource/docs`: single questions, follow-ups that
need the conversation, Polish and German questions, out-of-scope questions and
small talk. For a client's own docs, draft more with:

```bash
npm run synthesize -- path/to/markdown/docs
```

and review `goldens.draft.json` by hand before merging it into `goldens.json`.

Settings: `RAG_API_URL` (default `http://localhost:3001/api/v1`),
`RAG_ADMIN_EMAIL` / `RAG_ADMIN_PASSWORD` (default: seeded admin). The judge
is `claude-sonnet-5-5` (`defaultTest.options.provider` in
`promptfooconfig.yaml`; override a run with `--grader`); `synthesize.js`
reads `RAG_JUDGE_MODEL` (same default).
