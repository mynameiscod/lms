'use strict';
const assert = require('node:assert/strict');
const { MongoClient, ObjectId } = require('mongoose').mongo;
const settings = require('./settings.cjs');
async function denied(operation) {
  let rejected = false;
  try { await operation(); } catch (error) { rejected = error.code === 13; }
  assert.ok(rejected, 'Expected MongoDB to deny the operation');
}
async function main() {
  const root = new MongoClient(settings.uri(true));
  const app = new MongoClient(settings.uri());
  try {
    await root.connect();
    await app.connect();
    const db = root.db(settings.database), runtime = app.db(settings.database);
    const audits = await db.collection('mcpauditevents').find({}).toArray();
    assert.ok(audits.length > 0, 'No durable audits were written');
    assert.ok(audits.some(a => a.outcome === 'allowed') && audits.some(a => a.outcome === 'denied'));
    assert.ok(!JSON.stringify(audits).includes(settings.secret('test_password')));
    const absent = { _id: new ObjectId('000000000000000000000000') };
    await denied(() => runtime.collection('mcpauditevents').updateOne(absent, { $set: { reason: 'probe' } }));
    await denied(() => runtime.collection('mcpauditevents').deleteOne(absent));
    await denied(() => runtime.collection('users').updateOne(absent, { $set: { firstName: 'probe' } }));
    await denied(() => app.db('lms-saas').collection('users').findOne({}));
    const fields = [['mcpoauthcodes', 'codeHash'], ['mcpoauthaccesstokens', 'tokenHash'], ['mcpoauthrefreshtokens', 'tokenHash']];
    for (const [name, field] of fields) {
      const rows = await db.collection(name).find({}).toArray();
      assert.ok(rows.length > 0 && rows.every(row => /^[a-f0-9]{64}$/.test(row[field])), 'Tokens must be stored as hashes');
    }
    console.log('PASS: durable audits, hashed tokens, read-only LMS data and denied audit update/delete.');
  } finally { await Promise.all([root.close(), app.close()]); }
}
main().catch(error => { console.error('Staging database verification failed (' + (error.codeName || error.name) + ').'); process.exitCode = 1; });
