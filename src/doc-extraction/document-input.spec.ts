import mammoth from 'mammoth';
import { buildDocumentContent, isSupportedDocument } from './document-input';

jest.mock('mammoth', () => ({ convertToHtml: jest.fn() }));

describe('document input', () => {
  it('should detect supported documents by extension', () => {
    expect(isSupportedDocument('/api/v1/files/abc.PDF')).toBe(true);
    expect(isSupportedDocument('abc.docx')).toBe(true);
    expect(isSupportedDocument('abc.png')).toBe(false);
  });

  it('should pass PDFs to the model as a native document block', async () => {
    const content = await buildDocumentContent('a.pdf', Buffer.from('%PDF'));

    expect(content).toEqual([
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: Buffer.from('%PDF').toString('base64'),
        },
      },
    ]);
  });

  it('should convert DOCX to HTML text', async () => {
    jest
      .mocked(mammoth.convertToHtml)
      .mockResolvedValue({ value: '<table></table>', messages: [] });

    const content = await buildDocumentContent('a.docx', Buffer.from('zip'));

    expect(content).toEqual([
      { type: 'text', text: '<document>\n<table></table>\n</document>' },
    ]);
  });

  it('should reject empty DOCX and unsupported types', async () => {
    jest
      .mocked(mammoth.convertToHtml)
      .mockResolvedValue({ value: '  ', messages: [] });

    await expect(
      buildDocumentContent('a.docx', Buffer.from('zip')),
    ).rejects.toThrow('no readable text');
    await expect(
      buildDocumentContent('a.png', Buffer.from('png')),
    ).rejects.toThrow('Unsupported document type: .png');
  });
});
