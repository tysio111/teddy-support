// Contextual retrieval: a short description of where a chunk sits in its
// document, prepended before embedding, so "It takes 3-5 days" is found by
// a search for "delivery time to Germany".

export const CONTEXTUALIZE_SYSTEM_PROMPT = `You help index documents for search. For each numbered chunk of the document, write one or two sentences that situate it within the overall document: what topic, product, or situation it is about, using terms someone searching for it would use.

Rules:
- Write in the language of the document.
- Do not repeat the chunk's content; add the context it lacks on its own.
- Return one entry per chunk, with the chunk's number.`;

export function buildDocumentBlock(title: string, document: string): string {
  return `<document title="${title}">
${document}
</document>`;
}

export function buildChunksPrompt(
  chunks: { index: number; text: string }[],
): string {
  return chunks
    .map(
      ({ index, text }) => `<chunk number="${index}">
${text}
</chunk>`,
    )
    .join('\n');
}
