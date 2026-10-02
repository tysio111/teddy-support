import {
  CircuitStateEnum,
  resolveCircuitState,
} from './circuit-breaker.service';

describe('resolveCircuitState', () => {
  const settings = { failureRate: 0.5, minCalls: 4, cooldownMs: 30_000 };
  const now = Date.parse('2026-01-01T00:10:00Z');
  const secondsAgo = (seconds: number) => new Date(now - seconds * 1000);

  it('should stay closed until there are enough calls', () => {
    expect(
      resolveCircuitState(
        { total: 3, failed: 3, lastFailedAt: secondsAgo(1) },
        settings,
        now,
      ),
    ).toBe(CircuitStateEnum.closed);
  });

  it('should stay closed below the failure rate', () => {
    expect(
      resolveCircuitState(
        { total: 10, failed: 4, lastFailedAt: secondsAgo(1) },
        settings,
        now,
      ),
    ).toBe(CircuitStateEnum.closed);
  });

  it('should open when the failure rate is reached', () => {
    expect(
      resolveCircuitState(
        { total: 10, failed: 5, lastFailedAt: secondsAgo(1) },
        settings,
        now,
      ),
    ).toBe(CircuitStateEnum.open);
  });

  it('should let a probe through after the cooldown', () => {
    expect(
      resolveCircuitState(
        { total: 10, failed: 8, lastFailedAt: secondsAgo(31) },
        settings,
        now,
      ),
    ).toBe(CircuitStateEnum.halfOpen);
  });
});
