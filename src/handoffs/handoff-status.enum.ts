export enum HandoffStatusEnum {
  // In the inbox, nobody has picked it up yet.
  pending = 'pending',
  assigned = 'assigned',
  // Handed back to the bot without resolving.
  released = 'released',
  resolved = 'resolved',
}

export const ACTIVE_HANDOFF_STATUSES: string[] = [
  HandoffStatusEnum.pending,
  HandoffStatusEnum.assigned,
];

export enum HandoffSummaryStatusEnum {
  pending = 'pending',
  ready = 'ready',
  failed = 'failed',
}

// Escalations requested by an agent rather than the intent graph.
export const MANUAL_HANDOFF_REASON = 'manual';
