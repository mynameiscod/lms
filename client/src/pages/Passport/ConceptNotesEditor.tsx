import React, { useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import passportApi, { MaterialAttachment } from '../../api/passportApi';

/**
 * Written notes, plus the files that go with them.
 *
 * WHY A REAL EDITOR. Notes were a plain textarea, which meant an admin explaining the four
 * HTTP methods could not bold a method name, number a list, or paste a code sample without
 * it collapsing into one grey block. The rest of the product already writes rich text with
 * Quill (assignments, quizzes, the content library), so this is the same editor and the
 * same toolbar rather than a second thing to learn.
 *
 * WHY UPLOADS ARE NOT A URL FIELD. A handout lives on somebody's laptop, not on a public
 * URL. Files are stored server-side and referenced by a server-generated key; the admin
 * never types a path, and nothing here trusts a filename.
 *
 * IMAGES PASTED INTO THE EDITOR are a different thing from ATTACHMENTS, deliberately.
 * A pasted image is part of the prose and lives inline in the HTML; an attachment is a
 * separate document a student downloads. Collapsing them would make a 4MB PDF look like
 * something that belongs mid-sentence.
 */

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'indent',
  'blockquote', 'code-block', 'link', 'image',
];

const ICON: Record<string, string> = {
  pdf: 'bi-file-earmark-pdf', doc: 'bi-file-earmark-word', docx: 'bi-file-earmark-word',
  xls: 'bi-file-earmark-excel', xlsx: 'bi-file-earmark-excel', csv: 'bi-file-earmark-spreadsheet',
  ppt: 'bi-file-earmark-slides', pptx: 'bi-file-earmark-slides',
  png: 'bi-file-earmark-image', jpg: 'bi-file-earmark-image', jpeg: 'bi-file-earmark-image',
  gif: 'bi-file-earmark-image', webp: 'bi-file-earmark-image',
  txt: 'bi-file-earmark-text', md: 'bi-file-earmark-text',
};

const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();

/** Bytes are not a unit an admin thinks in. */
const sizeOf = (n: number): string => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Say what actually went wrong.
 *
 * The first version fell back to a bare "could not be uploaded", which is the least useful
 * thing it could have said: a 404 (server without the route yet), a 413 (file too big) and
 * a dropped connection all looked identical, so there was no way to tell a misconfiguration
 * from a file that needed shrinking. The server sends a JSON `message` wherever it can, and
 * this only has to cover the cases where it cannot.
 */
const uploadFailureOf = (e: any): string => {
  const msg = e?.response?.data?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;

  const status = e?.response?.status;
  if (!status) return 'the server did not respond. Check it is running, then try again.';
  if (status === 401 || status === 403) return 'you are not signed in with rights to upload here.';
  if (status === 404) return 'the upload endpoint is missing — the server is running an older build.';
  if (status === 413) return 'the file is too large.';
  if (status >= 500) return `the server errored (HTTP ${status}). Check the server log.`;
  return `upload failed (HTTP ${status}).`;
};

interface Props {
  notes: string;
  attachments: MaterialAttachment[];
  onNotes: (html: string) => void;
  onAttachments: (list: MaterialAttachment[]) => void;
}

const ConceptNotesEditor: React.FC<Props> = ({ notes, attachments, onNotes, onAttachments }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const modules = useMemo(() => QUILL_MODULES, []);

  const pick = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true); setErr('');

    // Sequential rather than parallel: the failure message names the file that failed,
    // which a Promise.all would lose behind whichever rejected first.
    const added: MaterialAttachment[] = [];
    for (const f of Array.from(files)) {
      try {
        const r = await passportApi.uploadAttachment(f);
        added.push(r.attachment);
      } catch (e: any) {
        setErr(`${f.name}: ${uploadFailureOf(e)}`);
        break;
      }
    }
    if (added.length) onAttachments([...attachments, ...added]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAt = (i: number) => {
    // The stored file is left in place. An admin who removes an attachment from a draft
    // and then cancels has not asked for it to be destroyed, and a background sweep can
    // reclaim genuinely unreferenced files far more safely than a click can.
    onAttachments(attachments.filter((_, n) => n !== i));
  };

  /**
   * Opened through a signed URL, so the browser streams it.
   *
   * Downloading the bytes here and wrapping them in a blob would put a 1GB attachment in
   * page memory before anything appeared. Handing the browser a URL lets it stream, show a
   * progress bar, and use its own PDF or video viewer.
   */
  const open = async (a: MaterialAttachment) => {
    setErr('');
    try {
      const url = await passportApi.attachmentUrl(a.fileKey);
      window.open(url, '_blank', 'noopener');
    } catch (e: any) {
      setErr(`${a.fileName}: ${uploadFailureOf(e)}`);
    }
  };

  return (
    <div className="cne">
      <div className="cne-editor">
        <ReactQuill
          theme="snow"
          value={notes || ''}
          onChange={onNotes}
          modules={modules}
          formats={QUILL_FORMATS}
          placeholder="Write the notes a student will read…"
        />
      </div>

      <div className="cne-files">
        <div className="cne-files-head">
          <span>
            <i className="bi bi-paperclip" /> Attachments
            {attachments.length > 0 && <em>{attachments.length}</em>}
          </span>
          <button type="button" onClick={pick} disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Add files'}
          </button>
        </div>

        <input
          ref={fileRef} type="file" multiple hidden
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md"
          onChange={e => onFiles(e.target.files)} />

        {err && <div className="cne-err">{err}</div>}

        {attachments.length === 0 ? (
          <p className="cne-hint">
            Images, PDF, Word, Excel, PowerPoint, CSV or plain text — up to 1&nbsp;GB each.
            Students open these alongside the notes.
          </p>
        ) : (
          <ul className="cne-list">
            {attachments.map((a, i) => (
              <li key={a.fileKey || i}>
                <i className={`bi ${ICON[extOf(a.fileName)] || 'bi-file-earmark'}`} />
                <span className="nm" title={a.fileName}>{a.fileName}</span>
                <span className="sz">{sizeOf(a.size)}</span>
                <button type="button" className="vw" onClick={() => open(a)}>View</button>
                <button type="button" onClick={() => removeAt(i)} aria-label="Remove">×</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConceptNotesEditor;
