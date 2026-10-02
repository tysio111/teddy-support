import mammoth from 'mammoth';
import { extname } from 'path';
import { extractText } from 'unpdf';

export const INDEXABLE_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt'];

export function isIndexable(path: string): boolean {
  return INDEXABLE_EXTENSIONS.includes(extname(path).toLowerCase());
}

// mammoth ships convertToMarkdown but leaves it out of its type definitions.
type MammothWithMarkdown = typeof mammoth & {
  convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>;
};

/**
 * Turns a document into markdown for chunking. DOCX keeps its headings, which
 * the chunker uses as section boundaries; PDF text has no structure, so it is
 * chunked by paragraphs and sentences only.
 */
export async function extractDocumentText(
  path: string,
  content: Buffer,
): Promise<string> {
  const extension = extname(path).toLowerCase();
  let text: string;

  switch (extension) {
    case '.pdf': {
      const result = await extractText(new Uint8Array(content), {
        mergePages: false,
      });
      text = result.text.join('\n\n');
      break;
    }
    case '.docx': {
      const result = await (mammoth as MammothWithMarkdown).convertToMarkdown({
        buffer: content,
      });
      // mammoth escapes punctuation for markdown; plain text embeds better.
      text = result.value.replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1');
      break;
    }
    case '.md':
    case '.txt':
      text = content.toString('utf8');
      break;
    default:
      throw new Error(`Unsupported document type: ${extension || 'unknown'}`);
  }

  if (!text.trim()) {
    throw new Error('The document has no readable text');
  }

  return text;
}
