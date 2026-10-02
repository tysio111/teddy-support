import { createHash } from 'crypto';
// No type definitions; the API is newStemmer(language).stem(word).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const snowball = require('snowball-stemmers') as {
  newStemmer: (language: string) => { stem: (word: string) => string };
  algorithms: () => string[];
};

export type SparseVector = {
  indices: number[];
  values: number[];
};

// Unicode letters and digits, so it works for any script.
const TOKEN = /[\p{L}\p{N}]+/gu;

/**
 * BM25-style keyword vectors for Qdrant. The encoder only produces term
 * frequencies; Qdrant applies IDF (sparse vector `modifier: idf`), so the
 * same encoder serves documents and queries and nothing needs refitting when
 * documents are added.
 *
 * Terms are hashed to 32-bit indices: no vocabulary to store, and collisions
 * are rare enough not to matter for ranking.
 */
export class SparseEncoder {
  private readonly stemmer: { stem: (word: string) => string } | null;

  constructor(language?: string) {
    if (language && !snowball.algorithms().includes(language.toLowerCase())) {
      throw new Error(
        `No stemmer for language "${language}". Supported: ${snowball.algorithms().join(', ')}`,
      );
    }
    this.stemmer = language ? snowball.newStemmer(language) : null;
  }

  encode(text: string): SparseVector {
    const counts = new Map<number, number>();
    for (const term of this.terms(text)) {
      const index = hashTerm(term);
      counts.set(index, (counts.get(index) ?? 0) + 1);
    }

    // Qdrant expects unique indices; sorted keeps payloads deterministic.
    const indices = [...counts.keys()].sort((a, b) => a - b);
    return { indices, values: indices.map((index) => counts.get(index)!) };
  }

  terms(text: string): string[] {
    const words = text.normalize('NFKC').toLowerCase().match(TOKEN) ?? [];
    return this.stemmer ? words.map((word) => this.stemmer!.stem(word)) : words;
  }
}

function hashTerm(term: string): number {
  return createHash('md5').update(term).digest().readUInt32LE(0);
}
