// promptfoo provider for the knowledge base eval endpoint
// (POST /knowledge/query). The reply is the output; the retrieved chunks and
// pipeline stats go into metadata for the context-based assertions.
//
// Configuration (environment variables):
//   RAG_API_URL         default http://localhost:3001/api/v1
//   RAG_ADMIN_EMAIL     default admin@example.com (seeded admin)
//   RAG_ADMIN_PASSWORD  default secret
//
// Provider config (promptfooconfig.yaml): `hybrid`, `hyde`, `rerank` override
// the server's pipeline settings for ablations; unset keeps the server default.

const API_URL = process.env.RAG_API_URL ?? 'http://localhost:3001/api/v1';
// Answers can take several model calls; generous, but bounded.
const TIMEOUT_MS = 120_000;
const PIPELINE_OPTIONS = ['hybrid', 'hyde', 'rerank'];

let tokenPromise;

async function post(path, body, token) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `POST ${path} failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json();
}

function token() {
  tokenPromise ??= post('/auth/email/login', {
    email: process.env.RAG_ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.RAG_ADMIN_PASSWORD ?? 'secret',
  })
    .then((body) => body.token)
    .catch((error) => {
      tokenPromise = undefined;
      throw error;
    });
  return tokenPromise;
}

export default class RagProvider {
  constructor(options = {}) {
    this.providerId = options.id ?? 'teddy-rag';
    this.config = options.config ?? {};
  }

  id() {
    return this.providerId;
  }

  pipelineOptions() {
    return Object.fromEntries(
      PIPELINE_OPTIONS.filter((key) => typeof this.config[key] === 'boolean').map(
        (key) => [key, this.config[key]],
      ),
    );
  }

  async callApi(prompt, context) {
    const vars = context?.vars ?? {};
    try {
      const body = await post(
        '/knowledge/query',
        {
          question: vars.question ?? prompt,
          history: vars.history ?? [],
          ...this.pipelineOptions(),
        },
        await token(),
      );
      return {
        // Context assertions need a string; "" when nothing was answered.
        output: body.reply ?? '',
        metadata: {
          status: body.status,
          rewrittenQuery: body.rewrittenQuery,
          contexts: body.contexts,
          citations: body.citations,
          candidates: body.candidates,
          serverLatencyMs: body.latencyMs,
          pipeline: this.pipelineOptions(),
        },
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}
