import { Action } from '../../actions/domain/action';
import { ActionAuthTypeEnum } from '../../actions/action-auth-type.enum';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';
import { ExtractedParameters } from '../intent-recognition.types';

const MAX_RESPONSE_PAYLOAD_LENGTH = 10_000;
const METHODS_WITHOUT_BODY = ['GET', 'HEAD', 'DELETE'];
// RFC 9110: repeating these has the same effect as sending them once.
const IDEMPOTENT_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];
// The request never reached the server, so it is safe to repeat any method.
const NOT_SENT_ERROR_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'];

export type ActionExecutionResult = {
  success: boolean;
  // Serialized request without auth headers, safe to persist.
  requestPayload: string;
  responseStatusCode: number | null;
  responsePayload: string | null;
  errorMessage: string | null;
  executedAt: Date;
  // Whether repeating the call may succeed without risking a duplicate side
  // effect.
  retryable: boolean;
  // Server-requested delay (Retry-After), if any.
  retryAfterMs: number | null;
};

/**
 * Transient failures are retryable, but a non-idempotent request (POST, PATCH)
 * that may already have been processed is not: a timeout or a 500/502/504 does
 * not tell us whether the side effect happened. Only responses that guarantee
 * the request was not processed (429, 503) or errors raised before it was sent
 * are safe to repeat for every method.
 */
export function isRetryableFailure(
  method: string,
  failure: { statusCode: number } | { error: unknown },
): boolean {
  const idempotent = IDEMPOTENT_METHODS.includes(method.toUpperCase());

  if ('statusCode' in failure) {
    const { statusCode } = failure;
    if (statusCode === 429 || statusCode === 503) {
      return true;
    }
    return idempotent && (statusCode === 408 || statusCode >= 500);
  }

  const code = (failure.error as { cause?: { code?: string } })?.cause?.code;
  if (code && NOT_SENT_ERROR_CODES.includes(code)) {
    return true;
  }

  return idempotent;
}

// Retry-After is either delay-seconds or an HTTP date.
export function parseRetryAfter(
  header: string | null,
  now: number = Date.now(),
): number | null {
  if (!header) {
    return null;
  }

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

// Fills `{name}` placeholders in the endpoint URL (e.g. /orders/{orderId}) and
// returns the parameters that were not used, which go to the query or body.
export function fillPathParameters(
  endpointUrl: string,
  params: Record<string, unknown>,
): { url: string; remaining: Record<string, unknown> } {
  const remaining = { ...params };
  const url = endpointUrl.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (!(name in remaining)) {
      throw new ConfigurationError(`Missing value for path parameter ${name}`);
    }
    const value = remaining[name];
    delete remaining[name];
    return encodeURIComponent(String(value));
  });

  return { url, remaining };
}

// A misconfigured action (bad URL, protocol or auth type): retrying cannot help.
class ConfigurationError extends Error {}

function isConfigurationError(error: unknown): boolean {
  return (
    error instanceof ConfigurationError ||
    (error as { code?: string })?.code === 'ERR_INVALID_URL'
  );
}

export class ActionExecutorService {
  constructor(private readonly config: IntentRecognitionConfig) {}

  async execute(
    action: Action,
    parameters: ExtractedParameters,
    options: { idempotencyKey?: string } = {},
  ): Promise<ActionExecutionResult> {
    const method = action.httpMethod.toUpperCase();
    const params = Object.fromEntries(
      Object.entries(parameters).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );
    const requestPayload = JSON.stringify({
      method,
      url: action.endpointUrl,
      params,
    });
    const executedAt = new Date();

    try {
      const filled = fillPathParameters(action.endpointUrl, params);
      const url = new URL(filled.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ConfigurationError(
          `Unsupported endpoint protocol: ${url.protocol}`,
        );
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        // Lets endpoints that support it deduplicate our retries.
        ...(options.idempotencyKey && {
          'Idempotency-Key': options.idempotencyKey,
        }),
        ...this.buildAuthHeaders(action),
      };
      let body: string | undefined;

      if (METHODS_WITHOUT_BODY.includes(method)) {
        for (const [key, value] of Object.entries(filled.remaining)) {
          url.searchParams.set(key, String(value));
        }
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(filled.remaining);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(this.config.actionExecutionTimeoutMs),
      });
      const responseText = await response.text();

      return {
        success: response.ok,
        requestPayload,
        responseStatusCode: response.status,
        responsePayload: responseText.slice(0, MAX_RESPONSE_PAYLOAD_LENGTH),
        errorMessage: response.ok
          ? null
          : `Endpoint responded with status ${response.status}`,
        executedAt,
        retryable:
          !response.ok &&
          isRetryableFailure(method, { statusCode: response.status }),
        retryAfterMs: response.ok
          ? null
          : parseRetryAfter(response.headers.get('retry-after')),
      };
    } catch (error) {
      return {
        success: false,
        requestPayload,
        responseStatusCode: null,
        responsePayload: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        executedAt,
        retryable:
          !isConfigurationError(error) && isRetryableFailure(method, { error }),
        retryAfterMs: null,
      };
    }
  }

  private buildAuthHeaders(action: Action): Record<string, string> {
    const credential = action.authCredential ?? '';

    switch (action.authType) {
      case ActionAuthTypeEnum.none:
        return {};
      case ActionAuthTypeEnum.bearer:
        return { Authorization: `Bearer ${credential}` };
      case ActionAuthTypeEnum.apiKey:
        return { 'X-API-Key': credential };
      case ActionAuthTypeEnum.basic:
        // Credential is stored as "username:password".
        return {
          Authorization: `Basic ${Buffer.from(credential).toString('base64')}`,
        };
      default:
        throw new ConfigurationError(
          `Unsupported auth type: ${action.authType}`,
        );
    }
  }
}
