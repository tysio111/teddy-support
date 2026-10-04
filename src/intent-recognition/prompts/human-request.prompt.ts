// Explicit requests for a human agent, matched before any LLM call so they
// escalate even with no actions configured. Kept narrow on purpose: a question
// that merely mentions a person ("is a human reviewing my refund?") must not
// match. Classification flags paraphrases these patterns miss.
const HUMAN = String.raw`(a\s+|an\s+|some\s+|your\s+|the\s+)?(real\s+|live\s+|actual\s+)?(human|person|agent|operator|representative|rep|someone|somebody|support\s+agent|customer\s+service|staff\s+member|member\s+of\s+(your|the)\s+team)`;

const HUMAN_REQUEST_PATTERNS = [
  // English
  new RegExp(String.raw`\b(talk|speak|chat)\s+(to|with)\s+${HUMAN}\b`, 'i'),
  new RegExp(
    String.raw`\b(connect|transfer|put)\s+me\s+(through\s+)?(to|with)\s+${HUMAN}\b`,
    'i',
  ),
  new RegExp(
    String.raw`\b(i\s+(want|need)|can\s+i\s+(get|have)|give\s+me|get\s+me)\s+${HUMAN}\b`,
    'i',
  ),
  /^\s*(human|agent|operator|representative|real person)(\s+please)?[\s.!]*$/i,
  // Polish
  /\b(porozmawia[ćc]|rozmawia[ćc]|po[łl][aą]cz(y[ćc])?)\s+((si[eę]|mnie)\s+)?z\s+(cz[łl]owiekiem|konsultantem|konsultantk[aą]|pracownikiem|agentem|kim[sś])/i,
  // German
  /\b(mit|zu)\s+(einem|einer)\s+(menschen|mitarbeiter(in)?|berater(in)?|person)\s+(sprechen|reden|verbinden)/i,
  /\bverbinden\s+sie\s+mich\s+mit\s+(einem|einer)\s+(menschen|mitarbeiter(in)?|berater(in)?|person)/i,
];

export function matchesHumanRequest(text: string): boolean {
  return HUMAN_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}
