const RETRYABLE_STATUS_CODES = [408, 409, 425, 429, 529];
const RETRYABLE_ERROR_CODES = [
  // Network
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  // Postgres: serialization failure, deadlock, admin shutdown, too many
  // connections
  '40001',
  '40P01',
  '57P01',
  '53300',
];
const RETRYABLE_ERROR_NAMES = [
  'NodeTimeoutError',
  'TimeoutError',
  'APIConnectionError',
  'APIConnectionTimeoutError',
];

/**
 * Decides whether a failed graph node is worth re-running. Transient
 * infrastructure failures (rate limits, overload, network, DB contention) are;
 * deterministic ones (bad request, auth, schema/parse errors, bugs) are not,
 * since re-running them only burns time and tokens.
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    name?: string;
    code?: string;
    status?: number;
    response?: { status?: number };
    cause?: { code?: string };
  };

  const status = candidate.status ?? candidate.response?.status;
  if (typeof status === 'number') {
    return status >= 500 || RETRYABLE_STATUS_CODES.includes(status);
  }

  const code = candidate.code ?? candidate.cause?.code;
  if (code && RETRYABLE_ERROR_CODES.includes(code)) {
    return true;
  }

  return !!candidate.name && RETRYABLE_ERROR_NAMES.includes(candidate.name);
}
