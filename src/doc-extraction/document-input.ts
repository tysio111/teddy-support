import { MessageContent } from '@langchain/core/messages';
import mammoth from 'mammoth';
import { extname } from 'path';

export type DocumentContent = Exclude<MessageContent, string>;

export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx'];

export function isSupportedDocument(path: string): boolean {
  return SUPPORTED_DOCUMENT_EXTENSIONS.includes(extname(path).toLowerCase());
}

// Turns an uploaded document into model input. PDFs go to Claude natively so
// it sees layout and parameter tables; DOCX is converted to HTML, which keeps
// tables, headings and lists.
export async function buildDocumentContent(
  path: string,
  content: Buffer,
): Promise<DocumentContent> {
  const extension = extname(path).toLowerCase();

  if (extension === '.pdf') {
    return [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: content.toString('base64'),
        },
      },
    ];
  }

  if (extension === '.docx') {
    const { value: html } = await mammoth.convertToHtml({ buffer: content });
    if (!html.trim()) {
      throw new Error('The document has no readable text');
    }

    return [{ type: 'text', text: `<document>\n${html}\n</document>` }];
  }

  throw new Error(`Unsupported document type: ${extension || 'unknown'}`);
}
