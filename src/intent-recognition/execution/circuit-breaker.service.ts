import { Action } from '../../actions/domain/action';
import { ActionExecutionsService } from '../../action-executions/action-executions.service';
import { ActionExecutionStats } from '../../action-executions/infrastructure/persistence/action-execution.repository';
import { IntentRecognitionConfig } from '../config/intent-recognition-config.type';

export enum CircuitStateEnum {
  closed = 'closed',
  open = 'open',
  // Tripped, but the cooldown has passed: let a probe call through.
  halfOpen = 'half_open',
}

export type CircuitBreakerSettings = {
  failureRate: number;
  minCalls: number;
  cooldownMs: number;
};

export function resolveCircuitState(
  stats: ActionExecutionStats,
  settings: CircuitBreakerSettings,
  now: number = Date.now(),
): CircuitStateEnum {
  if (
    stats.total < settings.minCalls ||
    stats.failed / stats.total < settings.failureRate
  ) {
    return CircuitStateEnum.closed;
  }

  const sinceLastFailure = stats.lastFailedAt
    ? now - stats.lastFailedAt.getTime()
    : Infinity;

  return sinceLastFailure >= settings.cooldownMs
    ? CircuitStateEnum.halfOpen
    : CircuitStateEnum.open;
}

/**
 * Stops calling an endpoint that keeps failing, to fail fast and give it room
 * to recover. State is derived from recent ActionExecution rows, so it is
 * shared across instances and survives restarts without extra infrastructure.
 */
export class CircuitBreakerService {
  constructor(
    private readonly config: IntentRecognitionConfig,
    private readonly actionExecutionsService: ActionExecutionsService,
  ) {}

  async getState(action: Action): Promise<CircuitStateEnum> {
    const { config } = this;
    const stats = await this.actionExecutionsService.getRecentStatsByActionId(
      action.id,
      new Date(Date.now() - config.circuitWindowMs),
    );

    return resolveCircuitState(stats, {
      failureRate: config.circuitFailureRate,
      minCalls: config.circuitMinCalls,
      cooldownMs: config.circuitCooldownMs,
    });
  }
}
