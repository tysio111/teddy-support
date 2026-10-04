export const HANDOFF_OPENED_EVENT = 'handoff.opened';

export class HandoffOpenedEvent {
  constructor(public readonly handoffId: string) {}
}
