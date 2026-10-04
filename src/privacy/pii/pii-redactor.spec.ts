import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { PiiRedactor, PiiVault } from './pii-redactor';

describe('PiiRedactor', () => {
  const redactor = new PiiRedactor();

  it.each([
    ['jan.kowalski+shop@example.co.uk', '[EMAIL]'],
    ['4111 1111 1111 1111', '[CARD]'],
    ['4111-1111-1111-1111', '[CARD]'],
    ['5500005555555559', '[CARD]'],
    ['+48 600 700 800', '[PHONE]'],
    ['+1 (555) 123-4567', '[PHONE]'],
    ['0048600700800', '[PHONE]'],
    ['(555) 123-4567', '[PHONE]'],
    ['600-700-800', '[PHONE]'],
  ])('should redact %s', (value, expected) => {
    expect(redactor.redact(`Mine is ${value}, thanks`)).toBe(
      `Mine is ${expected}, thanks`,
    );
  });

  it.each([
    // Fails the Luhn check: an order number, not a card.
    'order 4111111111111112',
    'order ORD-123456789',
    'tracking 123456789012',
    'it costs 1299.99 PLN',
    'on 2026-10-04 at 14:30',
    'size 42, qty 3',
  ])('should leave %s alone', (text) => {
    expect(redactor.redact(text)).toBe(text);
  });

  it('should do nothing when disabled', () => {
    expect(new PiiRedactor(false).redact('a@b.com')).toBe('a@b.com');
  });

  it('should number values per vault and restores them deeply', () => {
    const vault = new PiiVault();
    const text = redactor.tokenize(
      'Email a@b.com or c@d.com, again a@b.com, card 4111 1111 1111 1111',
      vault,
    );

    expect(text).toBe(
      'Email [EMAIL_1] or [EMAIL_2], again [EMAIL_1], card [CARD_1]',
    );
    expect(
      vault.restore({
        email: '[EMAIL_2]',
        list: ['[CARD_1]', 3, null],
        unknown: '[EMAIL_9]',
      }),
    ).toEqual({
      email: 'c@d.com',
      list: ['4111 1111 1111 1111', 3, null],
      unknown: '[EMAIL_9]',
    });
  });

  describe('wrap', () => {
    function echoModel() {
      const seen: BaseLanguageModelInput[] = [];
      const model = RunnableLambda.from((input: BaseLanguageModelInput) => {
        seen.push(input);
        const human = (input as HumanMessage[])[1];
        return { reply: `Sent to ${human.content as string}` };
      });
      return { model, seen };
    }

    it('should tokenize human messages and restores the output', async () => {
      const { model, seen } = echoModel();

      const result = await redactor
        .wrap(model)
        .invoke([
          new SystemMessage('Contact support@ours.com'),
          new HumanMessage('a@b.com'),
        ]);

      const sent = seen[0] as (SystemMessage | HumanMessage)[];
      expect(sent[0].content).toBe('Contact support@ours.com');
      expect(sent[1].content).toBe('[EMAIL_1]');
      expect(result).toEqual({ reply: 'Sent to a@b.com' });
    });

    it('should keep placeholders without restore', async () => {
      const { model } = echoModel();

      const result = await redactor
        .wrap(model, { restore: false })
        .invoke([new SystemMessage(''), new HumanMessage('a@b.com')]);

      expect(result).toEqual({ reply: 'Sent to [EMAIL_1]' });
    });

    it('should tokenize text parts of complex content', async () => {
      const { model, seen } = echoModel();

      await redactor.wrap(model).invoke([
        new SystemMessage(''),
        new HumanMessage({
          content: [
            {
              type: 'text',
              text: 'a@b.com',
              cache_control: { type: 'ephemeral' },
            },
          ],
        }),
      ]);

      expect((seen[0] as HumanMessage[])[1].content).toEqual([
        {
          type: 'text',
          text: '[EMAIL_1]',
          cache_control: { type: 'ephemeral' },
        },
      ]);
    });
  });
});
