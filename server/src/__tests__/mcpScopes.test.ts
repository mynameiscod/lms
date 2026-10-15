import { canUseTool, tools, validateArguments } from '../mcp/tools';
const allScopes = ['mcp_connect', ...tools.map(t => t.scope)];
const native = ['view_enrolled_students', 'view_courses', 'view_attendance', 'view_exams', 'view_fees', 'view_placement', 'view_leads', 'manage_leads'];
const identity = (overrides: any = {}) => ({ user: { role: 'TENANT_ADMIN' }, tenant: { studentFeatures: {} },
  modules: { courses: true, attendance: true, feeManagement: true, placement: true, leads: true },
  permissions: [...allScopes, ...native], ...overrides } as any);

describe('MCP tool permission intersection', () => {
  test.each(tools)('$name requires consent AND the current domain permission', candidate => {
    expect(canUseTool(identity(), allScopes, candidate)).toBe(true);
    expect(canUseTool(identity(), ['mcp_connect'], candidate)).toBe(false);
    expect(canUseTool(identity({ permissions: native }), allScopes, candidate)).toBe(false);
    expect(canUseTool(identity(), [candidate.scope], candidate)).toBe(false);
  });
  test.each(tools)('$name requires the native LMS domain permission', candidate => {
    expect(canUseTool(identity({ permissions: allScopes }), allScopes, candidate)).toBe(false);
  });
  test('student self access never includes CRM or Outpero', () => {
    for (const candidate of tools.filter(t => ['calls', 'leads'].includes(t.domain))) {
      expect(canUseTool(identity({ user: { role: 'STUDENT' } }), allScopes, candidate)).toBe(false);
    }
  });
  test('tenant and student feature gates apply', () => {
    const attendance = tools.find(t => t.name === 'codebegun_attendance')!;
    expect(canUseTool(identity({ modules: { attendance: false } }), allScopes, attendance)).toBe(false);
    expect(canUseTool(identity({ user: { role: 'STUDENT' }, tenant: { studentFeatures: { attendance: false } } }), allScopes, attendance)).toBe(false);
  });
  test('all tools declare read-only bounded schemas', () => {
    expect(new Set(tools.map(t => t.name)).size).toBe(tools.length);
    for (const candidate of tools) {
      expect(candidate.annotations.readOnlyHint).toBe(true);
      expect(candidate.inputSchema.additionalProperties).toBe(false);
      if (!candidate.summary) expect(candidate.inputSchema.properties.limit.maximum).toBe(50);
    }
  });
  test.each([{ tenantId: '507f1f77bcf86cd799439011' }, { limit: 51 }, { limit: 0 }, { limit: '1' },
    { limit: 1.1 }, { after: { $ne: null } }, { recordId: 'not-an-id' }, { $where: 'evil' }, [], null])('rejects unsupported input %j', args => {
    expect(() => validateArguments(tools.find(t => t.name === 'codebegun_students')!, args)).toThrow('invalid_arguments');
  });
});
