import { readRecordingAudio, MAX_RECORDING_BYTES, recordingStorageConfigured } from '../mcp/recordings';
import { tools, validateArguments, canUseTool } from '../mcp/tools';

const tenant = '111111111111111111111111';
const call = { _id: '222222222222222222222222', callId: 'call-123', recordingKey: `outpero-recordings/${tenant}/call-123` };
const config = { tenantId: tenant, hostname: 'storage.bunnycdn.com', zone: 'recordings', readOnlyKey: 'synthetic-read-only-password' };
let previous: string | undefined;
beforeEach(() => { previous = process.env.MCP_RECORDING_STORAGE; process.env.MCP_RECORDING_STORAGE = JSON.stringify(config); });
afterEach(() => { if (previous === undefined) delete process.env.MCP_RECORDING_STORAGE; else process.env.MCP_RECORDING_STORAGE = previous; });

test('returns bytes as MCP audio without storage secrets or URLs', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(Buffer.from('ID3synthetic-audio')));
  const result = (await readRecordingAudio(tenant, call)).toResult();
  expect(result.content[1]).toEqual({ type: 'audio', data: Buffer.from('ID3synthetic-audio').toString('base64'), mimeType: 'audio/mpeg' });
  expect(fetcher).toHaveBeenCalledWith(`https://storage.bunnycdn.com/recordings/${call.recordingKey}`, expect.objectContaining({ method: 'GET', redirect: 'error', headers: { AccessKey: config.readOnlyKey } }));
  expect(JSON.stringify(result)).not.toContain(config.readOnlyKey);
  expect(JSON.stringify(result)).not.toContain('bunnycdn');
});

test.each(['../other', `outpero-recordings/333333333333333333333333/call-123`, 'https://evil.example/file', undefined])('rejects noncanonical stored key %s before networking', async recordingKey => {
  const fetcher = jest.spyOn(global, 'fetch');
  await expect(readRecordingAudio(tenant, { ...call, recordingKey })).rejects.toThrow('recording_not_found');
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([{ hostname: '127.0.0.1' }, { hostname: 'storage.bunnycdn.com.evil.example' }, { zone: '../elsewhere' }, { tenantId: '333333333333333333333333' }, { readOnlyKey: '' }])('invalid or foreign-tenant configuration cannot retrieve audio %j', async change => {
  process.env.MCP_RECORDING_STORAGE = JSON.stringify({ ...config, ...change });
  const fetcher = jest.spyOn(global, 'fetch');
  expect(recordingStorageConfigured(tenant)).toBe(false);
  await expect(readRecordingAudio(tenant, call)).rejects.toThrow('recording_storage_not_configured');
  expect(fetcher).not.toHaveBeenCalled();
});

test.each([true, false])('rejects oversized audio with declared length=%s', async declared => {
  jest.spyOn(global, 'fetch').mockResolvedValue(new Response(Buffer.alloc(MAX_RECORDING_BYTES + 1), declared ? { headers: { 'content-length': String(MAX_RECORDING_BYTES + 1) } } : {}));
  await expect(readRecordingAudio(tenant, call)).rejects.toThrow('recording_too_large');
});

test('rejects HTML and suppresses upstream failures', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>not audio</html>'));
  await expect(readRecordingAudio(tenant, call)).rejects.toThrow('unsupported_recording_format');
  fetcher.mockRejectedValue(new Error('secret credential and URL'));
  await expect(readRecordingAudio(tenant, call)).rejects.toThrow('recording_unavailable');
});

test.each(['codebegun_call_audio', 'codebegun_call_transcript'])('%s requires one database record ID and explicit recording consent', name => {
  const candidate = tools.find(t => t.name === name)!;
  expect(() => validateArguments(candidate, {})).toThrow('invalid_arguments');
  expect(() => validateArguments(candidate, { recordId: call._id, url: 'https://evil' })).toThrow('invalid_arguments');
  expect(validateArguments(candidate, { recordId: call._id })).toEqual({ recordId: call._id });
  const identity: any = { user: { role: 'TENANT_ADMIN' }, tenant: {}, modules: { leads: true }, permissions: ['mcp_connect', 'mcp_recordings_read', 'manage_leads'] };
  expect(canUseTool(identity, ['mcp_connect', 'mcp_calls_read'], candidate)).toBe(false);
  expect(canUseTool(identity, ['mcp_connect', 'mcp_recordings_read'], candidate)).toBe(true);
});
