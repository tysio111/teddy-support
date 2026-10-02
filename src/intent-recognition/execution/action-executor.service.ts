import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { Action } from '../../actions/domain/action';
import { ActionAuthTypeEnum } from '../../actions/action-auth-type.enum';
import { ExtractedParameters } from '../intent-recognition.types';

const MAX_RESPONSE_PAYLOAD_LENGTH = 10_000;
const METHODS_WITHOUT_BODY = ['GET', 'HEAD', 'DELETE'];

export type ActionExecutionResult = {
  success: boolean;
  // Serialized request without auth headers, safe to persist.
  requestPayload: string;
  responseStatusCode: number | null;
  responsePayload: string | null;
  errorMessage: string | null;
  executedAt: Date;
};

@Injectable()
export class ActionExecutorService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  async execute(
    action: Action,
    parameters: ExtractedParameters,
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
      const url = new URL(action.endpointUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Unsupported endpoint protocol: ${url.protocol}`);
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...this.buildAuthHeaders(action),
      };
      let body: string | undefined;

      if (METHODS_WITHOUT_BODY.includes(method)) {
        for (const [key, value] of Object.entries(params)) {
          url.searchParams.set(key, String(value));
        }
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(params);
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(
          this.configService.getOrThrow(
            'intentRecognition.actionExecutionTimeoutMs',
            { infer: true },
          ),
        ),
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
      };
    } catch (error) {
      return {
        success: false,
        requestPayload,
        responseStatusCode: null,
        responsePayload: null,
        errorMessage: error instanceof Error ? error.message : String(error),
        executedAt,
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
        throw new Error(`Unsupported auth type: ${action.authType}`);
    }
  }
}
