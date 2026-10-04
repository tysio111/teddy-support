import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Runnable, RunnableLambda } from '@langchain/core/runnables';

export enum PiiKindEnum {
  card = 'CARD',
  email = 'EMAIL',
  phone = 'PHONE',
}

type Detector = {
  kind: PiiKindEnum;
  pattern: RegExp;
  accept?: (match: string) => boolean;
};

// Order matters: card numbers are matched before phones, which would
// otherwise claim their digit groups.
const DETECTORS: Detector[] = [
  {
    kind: PiiKindEnum.email,
    pattern:
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
  },
  {
    // 13-19 digits, optionally grouped by spaces or dashes. The Luhn check
    // keeps order and tracking numbers out; no card number starts with 0.
    kind: PiiKindEnum.card,
    pattern: /(?<![\d-])[1-9](?:[ -]?\d){12,18}(?![\d-])/g,
    accept: (match) => passesLuhn(digitsOf(match)),
  },
  {
    // International numbers (+48 600 700 800, 0048...) and grouped national
    // ones ((555) 123-4567, 600-700-800). A bare run of digits is left alone:
    // it is more likely an order number than a phone.
    kind: PiiKindEnum.phone,
    pattern:
      /(?<![\w+])(?:(?:\+|00)\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}(?:[ .-]?\d{2,4}){1,4}|\(?\d{3}\)?[ .-]\d{3}[ .-]\d{3,4})(?![\w])/g,
    accept: (match) => {
      const count = digitsOf(match).length;
      return count >= 9 && count <= 15;
    },
  },
];

// Matches the placeholders produced below, e.g. [EMAIL_1].
const TOKEN_PATTERN = new RegExp(
  `\\[(${Object.values(PiiKindEnum).join('|')})_(\\d+)\\]`,
  'g',
);

/**
 * Maps PII found in one LLM call to numbered placeholders, so the model sees
 * `[EMAIL_1]` instead of the address and the values can be put back into its
 * output (extracted parameters, replies, summaries). The same value always
 * gets the same placeholder within a vault.
 */
export class PiiVault {
  private readonly tokensByValue = new Map<string, string>();
  private readonly valuesByToken = new Map<string, string>();
  private readonly counters = new Map<PiiKindEnum, number>();

  get size(): number {
    return this.valuesByToken.size;
  }

  tokenFor(kind: PiiKindEnum, value: string): string {
    const key = `${kind}:${value}`;
    const existing = this.tokensByValue.get(key);
    if (existing) {
      return existing;
    }

    const next = (this.counters.get(kind) ?? 0) + 1;
    this.counters.set(kind, next);
    const token = `[${kind}_${next}]`;
    this.tokensByValue.set(key, token);
    this.valuesByToken.set(token, value);
    return token;
  }

  // Deep-restores placeholders in strings, arrays and plain objects.
  restore<T>(value: T): T {
    if (typeof value === 'string') {
      return value.replace(
        TOKEN_PATTERN,
        (token) => this.valuesByToken.get(token) ?? token,
      ) as T;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.restore(item)) as T;
    }
    if (value && typeof value === 'object' && isPlainObject(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, this.restore(item)]),
      ) as T;
    }
    return value;
  }
}

export class PiiRedactor {
  constructor(readonly enabled = true) {}

  // One-way: for logs and anything that is never restored.
  redact(text: string): string {
    return this.enabled ? replacePii(text, (kind) => `[${kind}]`) : text;
  }

  // Reversible: placeholders are recorded in the vault.
  tokenize(text: string, vault: PiiVault): string {
    return this.enabled
      ? replacePii(text, (kind, value) => vault.tokenFor(kind, value))
      : text;
  }

  /**
   * Wraps an LLM runnable so client PII never reaches the provider: the text
   * of human messages is tokenized before the call (system prompts are ours
   * and left alone). With `restore`, placeholders in the output are replaced
   * with the original values; without it they stay, which suits internal
   * strings such as search queries that are sent on to other services.
   */
  wrap<T>(
    runnable: Runnable<BaseLanguageModelInput, T>,
    { restore = true }: { restore?: boolean } = {},
  ): Runnable<BaseMessage[], T> {
    if (!this.enabled) {
      return runnable;
    }

    return RunnableLambda.from(async (messages: BaseMessage[], config) => {
      const vault = new PiiVault();
      const output = await runnable.invoke(
        messages.map((message) => this.tokenizeMessage(message, vault)),
        config,
      );

      return restore ? vault.restore(output) : output;
    });
  }

  private tokenizeMessage(message: BaseMessage, vault: PiiVault): BaseMessage {
    if (!HumanMessage.isInstance(message)) {
      return message;
    }

    if (typeof message.content === 'string') {
      return new HumanMessage(this.tokenize(message.content, vault));
    }

    return new HumanMessage({
      content: message.content.map((part) =>
        part.type === 'text' && typeof part.text === 'string'
          ? { ...part, text: this.tokenize(part.text, vault) }
          : part,
      ),
    });
  }
}

function replacePii(
  text: string,
  replacement: (kind: PiiKindEnum, value: string) => string,
): string {
  return DETECTORS.reduce(
    (current, { kind, pattern, accept }) =>
      current.replace(pattern, (match) =>
        !accept || accept(match) ? replacement(kind, match) : match,
      ),
    text,
  );
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
