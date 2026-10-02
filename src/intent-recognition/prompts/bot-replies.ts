import { Action } from '../../actions/domain/action';
import { ActionParameter } from '../../action-parameters/domain/action-parameter';
import {
  ExtractedParameters,
  IntentOutcomeEnum,
} from '../intent-recognition.types';

// Deterministic replies: used where the wording must be predictable (asking
// for input, confirming side effects) or when the LLM is unavailable.

export function buildClarificationQuestion(
  action: Action,
  parameters: ActionParameter[],
  missing: string[],
): string {
  const fields = parameters
    .filter((parameter) => missing.includes(parameter.name))
    .map((parameter) => `- ${parameter.description}`)
    .join('\n');

  return `I can help with that (${action.description}). I just need a few more details:\n${fields}`;
}

export function buildConfirmationQuestion(
  action: Action,
  parameters: ExtractedParameters,
): string {
  const details = Object.entries(parameters)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([name, value]) => `- ${name}: ${String(value)}`)
    .join('\n');

  return `I'm about to: ${action.description}${details ? `\n${details}` : ''}\nReply "yes" to confirm or "no" to cancel.`;
}

export function buildDeclinedReply(): string {
  return "No problem, I've cancelled that. Is there anything else I can help with?";
}

export function buildFallbackReply(action: Action): string {
  return `Done! I've completed your request: ${action.description}.`;
}

const ESCALATION_REPLIES: Partial<Record<IntentOutcomeEnum, string>> = {
  [IntentOutcomeEnum.belowThreshold]:
    "I want to make sure I get this right, so I'm passing your request to a member of our team.",
  [IntentOutcomeEnum.needsClarification]:
    "I still don't have everything I need, so I'm passing your request to a member of our team.",
  [IntentOutcomeEnum.circuitOpen]:
    'That service is temporarily unavailable. A member of our team will follow up with you shortly.',
};

export function buildEscalationReply(
  outcome: IntentOutcomeEnum | null,
): string {
  return (
    (outcome && ESCALATION_REPLIES[outcome]) ??
    "Sorry, I couldn't complete that automatically. A member of our team will take over from here."
  );
}
