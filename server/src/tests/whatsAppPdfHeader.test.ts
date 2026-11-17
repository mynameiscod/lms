/**
 * PDF (Document) headers on WhatsApp templates: what is checked before Meta, what each send
 * carries, and which files the upload accepts.
 */
jest.mock('../services/bunnyStorageService', () => ({
  isBunnyStorageConfigured: () => true,
  uploadFile: jest.fn(async () => undefined),
  getFileStream: jest.fn(),
}));

import { buildSendComponents } from '../services/whatsAppTemplateShape';
import { validateInput, checkCompatibility } from '../services/whatsAppTemplateService';
import { storePdf, WaFileError } from '../services/whatsAppFileService';
import * as bunny from '../services/bunnyStorageService';

const tpl = (header: any) => ({ body: 'Hi {{1}}, here is our brochure.', header, buttons: [], category: 'UTILITY' } as any);

describe('sending a PDF-header template', () => {
  it('attaches the template’s own PDF with its file name', () => {
    const c = buildSendComponents(tpl({ format: 'DOCUMENT', documentUrl: 'https://x.test/a/b-Brochure.pdf', fileName: 'CodeBegun Brochure.pdf' }), { body: ['Ravi'] });
    expect(c[0]).toEqual({ type: 'header', parameters: [{ type: 'document', document: { link: 'https://x.test/a/b-Brochure.pdf', filename: 'CodeBegun Brochure.pdf' } }] });
    expect(c[1].parameters[0].text).toBe('Ravi');
  });

  it('a send may carry a different PDF; its name comes from the send or the link', () => {
    const t = tpl({ format: 'DOCUMENT', documentUrl: 'https://x.test/default.pdf', fileName: 'Default.pdf' });
    expect(buildSendComponents(t, { body: ['R'], headerDocumentUrl: 'https://x.test/files/Fees%202026.pdf' })[0].parameters[0].document)
      .toEqual({ link: 'https://x.test/files/Fees%202026.pdf', filename: 'Fees 2026.pdf' });
    expect(buildSendComponents(t, { body: ['R'], headerDocumentUrl: 'https://x.test/f.pdf', headerFileName: 'Java Syllabus.pdf' })[0].parameters[0].document.filename).toBe('Java Syllabus.pdf');
    // A non-https override is ignored, never sent.
    expect(buildSendComponents(t, { body: ['R'], headerDocumentUrl: 'http://x.test/f.pdf' })[0].parameters[0].document.link).toBe('https://x.test/default.pdf');
  });
});

describe('creating a PDF-header template', () => {
  const base = { name: 'brochure', language: 'en', category: 'UTILITY' as const, body: 'Hi {{1}}, here is our brochure.', bodyExamples: ['Ravi'] };
  it('needs a PDF', () => {
    expect(validateInput({ ...base, header: { format: 'DOCUMENT' } }).join(' ')).toMatch(/PDF header needs a PDF/);
    expect(validateInput({ ...base, header: { format: 'DOCUMENT', documentUrl: 'https://x.test/b.pdf', fileName: 'B.pdf' } })).toEqual([]);
  });
  it('can be used for system messages once a PDF is stored', () => {
    const p: any = { key: 'X', label: 'x', module: 'm', settingsKey: 'K', variables: ['name'], buttonParam: false, headerImage: false };
    expect(checkCompatibility({ ...tpl({ format: 'DOCUMENT' }), status: 'APPROVED', name: 'b' }, p).errors.join(' ')).toMatch(/no PDF is stored/);
    expect(checkCompatibility({ ...tpl({ format: 'DOCUMENT', documentUrl: 'https://x.test/b.pdf' }), status: 'APPROVED', name: 'b' }, p).errors).toEqual([]);
  });
});

describe('uploading the PDF', () => {
  const pdf = Buffer.from('%PDF-1.7\n...');
  it('stores a real PDF under an unguessable public link', async () => {
    const r = await storePdf('69c7723868202a8e4616ef3d', { buffer: pdf, originalname: 'CodeBegun Brochure (2026).pdf', size: pdf.length });
    expect(r.fileName).toBe('CodeBegun-Brochure-2026.pdf');
    expect(r.url).toMatch(/\/api\/v1\/public\/wa-files\/69c7723868202a8e4616ef3d\/[a-f0-9]{16}-CodeBegun-Brochure-2026\.pdf$/);
    expect((bunny.uploadFile as jest.Mock).mock.calls[0][0]).toMatch(/^wa-template-files\/69c7723868202a8e4616ef3d\//);
  });
  it('refuses anything that is not a PDF, or too large', async () => {
    await expect(storePdf('t', { buffer: Buffer.from('MZ\x90\x00'), originalname: 'x.pdf', size: 4 })).rejects.toBeInstanceOf(WaFileError);
    await expect(storePdf('t', { buffer: pdf, originalname: 'x.pdf', size: 31 * 1024 * 1024 })).rejects.toThrow(/under 30 MB/);
  });
});
