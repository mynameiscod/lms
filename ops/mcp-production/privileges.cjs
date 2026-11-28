'use strict';
// Shared exact privilege allowlist. Write scopes add attendance only, never delete.
const model = name => require('../../server/dist/models/' + name).default;
const { mcpModels } = require('../../server/dist/mcp/bootstrap');
const lms = ['User', 'Tenant', 'Role', 'Batch', 'Attendance', 'Exam', 'Fee', 'Lead', 'OutperoCall'];
function privileges(database, scopes) {
  const write = scopes.includes('mcp_attendance_write');
  return lms.map(name => ({ resource: { db: database, collection: model(name).collection.name },
    actions: name === 'Attendance' && write ? ['find', 'insert', 'update', 'listIndexes'] : ['find'] }))
    .concat(mcpModels.map(m => ({ resource: { db: database, collection: m.collection.name },
      actions: m.modelName === 'McpAuditEvent' ? ['find', 'insert', 'listIndexes'] : ['find', 'insert', 'update', 'remove', 'listIndexes'] })));
}
const normalized = p => p.map(x => ({ resource: x.resource, actions: [...x.actions].sort() }))
  .sort((a, b) => JSON.stringify(a.resource).localeCompare(JSON.stringify(b.resource)));
module.exports = { privileges, normalized };
