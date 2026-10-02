export type TextChunk = {
  headingPath: string[];
  text: string;
};

export type ChunkOptions = {
  chunkTokens: number;
  overlapTokens: number;
};

// Language-agnostic estimate; good enough for sizing chunks. Embedding models
// truncate rather than fail, and chunks stay well below their limits.
const CHARS_PER_TOKEN = 4;

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

type Section = {
  headingPath: string[];
  paragraphs: string[];
};

/**
 * Splits a markdown document into retrieval chunks:
 * - never across sections, so every chunk keeps a precise heading path;
 * - paragraphs are packed greedily up to `chunkTokens`;
 * - oversized paragraphs are split on sentences, then on words;
 * - consecutive chunks of a section share `overlapTokens` of text, so a fact
 *   cut at a boundary is still retrievable from one chunk.
 * Plain text (e.g. extracted from a PDF) is a single untitled section.
 */
export function chunkMarkdown(
  markdown: string,
  { chunkTokens, overlapTokens }: ChunkOptions,
): TextChunk[] {
  const maxChars = chunkTokens * CHARS_PER_TOKEN;
  const overlapChars = Math.min(
    overlapTokens * CHARS_PER_TOKEN,
    Math.floor(maxChars / 2),
  );

  return splitSections(markdown).flatMap(({ headingPath, paragraphs }) =>
    packParagraphs(paragraphs, maxChars, overlapChars).map((text) => ({
      headingPath,
      text,
    })),
  );
}

function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const headings: string[] = [];
  let current: Section = { headingPath: [], paragraphs: [] };
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim();
    if (text) {
      current.paragraphs.push(text);
    }
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      if (current.paragraphs.length) {
        sections.push(current);
      }
      const level = heading[1].length;
      headings.length = level - 1;
      headings[level - 1] = heading[2].trim();
      current = {
        // Skipped levels (e.g. # then ###) leave holes; drop them.
        headingPath: headings.filter(Boolean),
        paragraphs: [],
      };
    } else if (!line.trim()) {
      flushParagraph();
    } else {
      paragraph.push(line);
    }
  }

  flushParagraph();
  if (current.paragraphs.length) {
    sections.push(current);
  }

  return sections;
}

function packParagraphs(
  paragraphs: string[],
  maxChars: number,
  overlapChars: number,
): string[] {
  const pieces = paragraphs.flatMap((paragraph) =>
    paragraph.length > maxChars ? splitLong(paragraph, maxChars) : [paragraph],
  );

  const chunks: string[] = [];
  let current = '';

  for (const piece of pieces) {
    if (current && current.length + 2 + piece.length > maxChars) {
      chunks.push(current);
      const overlap = tail(current, overlapChars);
      // Only carry the overlap if the next piece still fits with it.
      current =
        overlap && overlap.length + 2 + piece.length <= maxChars
          ? `${overlap}\n\n${piece}`
          : piece;
    } else {
      current = current ? `${current}\n\n${piece}` : piece;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

// Sentences first; a single sentence longer than the limit is cut on words.
function splitLong(text: string, maxChars: number): string[] {
  const sentences = text.match(/[^.!?。！？]+(?:[.!?。！？]+|$)\s*/g) ?? [text];
  const parts: string[] = [];
  let current = '';

  for (const sentence of sentences.flatMap((s) =>
    s.length > maxChars ? splitWords(s, maxChars) : [s],
  )) {
    if (current && current.length + sentence.length > maxChars) {
      parts.push(current.trim());
      current = '';
    }
    current += sentence;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function splitWords(text: string, maxChars: number): string[] {
  const parts: string[] = [];
  let current = '';

  for (const word of text.split(/(\s+)/)) {
    if (current && current.length + word.length > maxChars) {
      parts.push(current);
      current = '';
    }
    // A single "word" longer than the limit (a URL, a base64 blob) is cut.
    if (word.length > maxChars) {
      for (let i = 0; i < word.length; i += maxChars) {
        parts.push(word.slice(i, i + maxChars));
      }
      continue;
    }
    current += word;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

// The last `maxChars` of `text`, starting at a word boundary.
function tail(text: string, maxChars: number): string {
  if (maxChars <= 0) {
    return '';
  }
  if (text.length <= maxChars) {
    return text;
  }

  const slice = text.slice(text.length - maxChars);
  const boundary = slice.search(/\s/);
  return (boundary === -1 ? slice : slice.slice(boundary)).trim();
}
