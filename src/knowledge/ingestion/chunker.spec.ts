import { chunkMarkdown } from './chunker';

const options = { chunkTokens: 50, overlapTokens: 10 };
const maxChars = options.chunkTokens * 4;

describe('chunkMarkdown', () => {
  it('should keep the heading path of every chunk', () => {
    const chunks = chunkMarkdown(
      [
        '# Shipping',
        'Intro to shipping.',
        '## Returns',
        'You can return items within 30 days.',
        '### Damaged items',
        'Send a photo.',
        '## Delivery times',
        'Two to five days.',
      ].join('\n'),
      options,
    );

    expect(chunks).toEqual([
      { headingPath: ['Shipping'], text: 'Intro to shipping.' },
      {
        headingPath: ['Shipping', 'Returns'],
        text: 'You can return items within 30 days.',
      },
      {
        headingPath: ['Shipping', 'Returns', 'Damaged items'],
        text: 'Send a photo.',
      },
      {
        headingPath: ['Shipping', 'Delivery times'],
        text: 'Two to five days.',
      },
    ]);
  });

  it('should drop skipped heading levels and empty sections', () => {
    const chunks = chunkMarkdown('# A\n### C\nBody\n# Empty\n', options);

    expect(chunks).toEqual([{ headingPath: ['A', 'C'], text: 'Body' }]);
  });

  it('should treat plain text as one untitled section', () => {
    const chunks = chunkMarkdown('First paragraph.\n\nSecond one.', options);

    expect(chunks).toEqual([
      { headingPath: [], text: 'First paragraph.\n\nSecond one.' },
    ]);
  });

  it('should pack paragraphs up to the size limit', () => {
    const paragraph = 'word '.repeat(15).trim(); // 74 chars
    const chunks = chunkMarkdown(Array(5).fill(paragraph).join('\n\n'), {
      chunkTokens: 50,
      overlapTokens: 0,
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(maxChars);
    }
    expect(chunks.map((chunk) => chunk.text).join('\n\n')).toBe(
      Array(5).fill(paragraph).join('\n\n'),
    );
  });

  it('should split oversized paragraphs on sentences, then words', () => {
    const sentence = 'This sentence has exactly some words in it. ';
    const longSentence = 'x'.repeat(30) + ' ' + 'y '.repeat(150);
    const chunks = chunkMarkdown(sentence.repeat(10) + longSentence, {
      chunkTokens: 50,
      overlapTokens: 0,
    });

    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(maxChars);
    }
    expect(chunks[0].text.startsWith('This sentence')).toBe(true);
    expect(chunks[0].text.endsWith('in it.')).toBe(true);
  });

  it('should overlap consecutive chunks of a section', () => {
    const paragraphs = Array.from(
      { length: 6 },
      (_, i) => `Paragraph ${i} ` + 'filler '.repeat(10),
    );
    const chunks = chunkMarkdown(paragraphs.join('\n\n'), options);

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      const previousEnd = chunks[i - 1].text.slice(-20).trim();
      expect(chunks[i].text).toContain(previousEnd);
    }
  });

  it('should never overlap across sections', () => {
    const chunks = chunkMarkdown(
      `# A\n${'alpha '.repeat(30)}\n# B\nbeta`,
      options,
    );

    expect(chunks[chunks.length - 1]).toEqual({
      headingPath: ['B'],
      text: 'beta',
    });
  });
});
