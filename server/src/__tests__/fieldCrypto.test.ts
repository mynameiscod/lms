import { encryptField, decryptField } from '../utils/fieldCrypto';
const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });
test('personal fields require a configured encryption or validated JWT key', () => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.JWT_SECRET;
  expect(() => encryptField('private-account')).toThrow();
  process.env.JWT_SECRET = 'fallback-key-32-chars-minimum!!';
  expect(() => encryptField('private-account')).toThrow();
});
test('existing configured keys round-trip and reject tampered ciphertext', () => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-at-least-32-bytes';
  const cipher = encryptField('private-account');
  expect(cipher).not.toContain('private-account');
  expect(decryptField(cipher)).toBe('private-account');
  expect(decryptField(cipher.slice(0, -2) + (cipher.endsWith('00') ? '01' : '00'))).toBe('');
});
