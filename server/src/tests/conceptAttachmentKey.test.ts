/**
 * The shape a stored attachment key may take.
 *
 * Keys are server-generated, so this is not input parsing — it is the last line of defence
 * against a value that reached the database being replayed as a filesystem path. The
 * download route joins two URL segments and re-checks the result here before opening
 * anything, so every way a `..` or an extra slash could arrive has to fail.
 *
 * The regex is duplicated rather than exported from the controller on purpose: importing it
 * would pull express, mongoose and the Bunny client into a test about a string.
 */

const KEY_RE = /^[a-z0-9]{1,40}\/[a-f0-9]{32}\.[a-z0-9]{1,8}$/;

const hex32 = 'a'.repeat(32);

describe('a well-formed key is accepted', () => {
  it('matches what upload generates', () => {
    expect(KEY_RE.test(`69c7723868202a8e4616ef3d/${hex32}.pdf`)).toBe(true);
    expect(KEY_RE.test(`shared/${hex32}.png`)).toBe(true);
    expect(KEY_RE.test(`t1/${hex32}.xlsx`)).toBe(true);
  });

  it('accepts every extension the uploader allows', () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'doc', 'docx',
      'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'md']) {
      expect(KEY_RE.test(`t1/${hex32}.${ext}`)).toBe(true);
    }
  });
});

describe('traversal cannot be expressed', () => {
  /**
   * The case this exists for. A dot is not in the folder character class and the name half
   * must be exactly 32 hex characters, so neither segment can carry `..`.
   */
  it('rejects a parent-directory hop in either segment', () => {
    expect(KEY_RE.test(`../${hex32}.pdf`)).toBe(false);
    expect(KEY_RE.test(`t1/../${hex32}.pdf`)).toBe(false);
    expect(KEY_RE.test('t1/../../etc/passwd')).toBe(false);
    expect(KEY_RE.test('../../etc/passwd')).toBe(false);
  });

  it('rejects an absolute path', () => {
    expect(KEY_RE.test(`/t1/${hex32}.pdf`)).toBe(false);
    expect(KEY_RE.test('/etc/passwd')).toBe(false);
  });

  it('rejects more than one slash, so a key cannot nest', () => {
    expect(KEY_RE.test(`t1/sub/${hex32}.pdf`)).toBe(false);
  });

  it('rejects a backslash, which some path APIs treat as a separator', () => {
    expect(KEY_RE.test(`t1\\${hex32}.pdf`)).toBe(false);
    expect(KEY_RE.test(`t1/..\\${hex32}.pdf`)).toBe(false);
  });

  /** A newline would let a crafted value smuggle a second line past a naive log or check. */
  it('rejects control characters and is anchored at both ends', () => {
    expect(KEY_RE.test(`t1/${hex32}.pdf\n../../etc/passwd`)).toBe(false);
    expect(KEY_RE.test(`prefix t1/${hex32}.pdf`)).toBe(false);
    expect(KEY_RE.test(`t1/${hex32}.pdf suffix`)).toBe(false);
  });

  it('rejects a null byte, which can truncate a path in a native call', () => {
    expect(KEY_RE.test(`t1/${hex32}.pdf\0.png`)).toBe(false);
    expect(KEY_RE.test(`t1/${hex32}\0/../../etc/passwd`)).toBe(false);
  });
});

describe('malformed keys are rejected', () => {
  it('rejects a name that is not exactly 32 hex characters', () => {
    expect(KEY_RE.test('t1/abc.pdf')).toBe(false);
    expect(KEY_RE.test(`t1/${'a'.repeat(31)}.pdf`)).toBe(false);
    expect(KEY_RE.test(`t1/${'a'.repeat(33)}.pdf`)).toBe(false);
  });

  it('rejects non-hex in the name', () => {
    expect(KEY_RE.test(`t1/${'z'.repeat(32)}.pdf`)).toBe(false);
  });

  it('rejects an uppercase folder, since upload lowercases it', () => {
    expect(KEY_RE.test(`T1/${hex32}.pdf`)).toBe(false);
  });

  it('rejects a missing or empty extension', () => {
    expect(KEY_RE.test(`t1/${hex32}`)).toBe(false);
    expect(KEY_RE.test(`t1/${hex32}.`)).toBe(false);
  });

  it('rejects an empty folder segment', () => {
    expect(KEY_RE.test(`/${hex32}.pdf`)).toBe(false);
  });

  it('rejects the empty string', () => {
    expect(KEY_RE.test('')).toBe(false);
  });
});

describe('the folder segment upload produces always matches', () => {
  /** Exactly the normalisation the uploader applies before building a key. */
  const folderOf = (tenantId: string) =>
    String(tenantId || 'shared').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) || 'shared';

  it('strips anything that could act as a separator', () => {
    expect(folderOf('../../etc')).toBe('etc');
    expect(folderOf('a/b')).toBe('ab');
    expect(folderOf('..')).toBe('shared');
    expect(folderOf('')).toBe('shared');
  });

  it('always yields a key this regex accepts', () => {
    for (const t of ['69c7723868202a8e4616ef3d', '../../etc', '', 'A-B_C', 'x'.repeat(80)]) {
      expect(KEY_RE.test(`${folderOf(t)}/${hex32}.pdf`)).toBe(true);
    }
  });
});
