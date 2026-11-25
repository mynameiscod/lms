/**
 * Terms & agreements (2026-11-25): rollout by all / batches / students, acceptance with signature,
 * re-asking on a new version, and holding the LMS until accepted.
 */
import mongoose from 'mongoose';
import { startMongo, stopMongo } from './mongoHarness';
import User from '../../models/User';
import Batch from '../../models/Batch';
import { AgreementAcceptance } from '../../models/Agreement';
import * as svc from '../../services/agreementService';
import * as rules from '../../services/studentRulesService';

jest.setTimeout(240_000);
const tid = String(new mongoose.Types.ObjectId());
const admin = String(new mongoose.Types.ObjectId());
const SIG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

let java = '';
let python = '';
const mk = async (email: string, extra: any = {}) =>
  String((await User.create({ tenantId: tid, email, password: 'x'.repeat(12), firstName: email.split('@')[0], lastName: 'S', role: 'STUDENT', batchId: java, isActive: true, ...extra } as any))._id);

describe('Agreements', () => {
  beforeAll(async () => {
    await startMongo();
    java = String((await Batch.create({ tenantId: tid, name: 'Java', startDate: new Date(), endDate: new Date(Date.now() + 90 * 86_400_000), isActive: true } as any))._id);
    python = String((await Batch.create({ tenantId: tid, name: 'Python', startDate: new Date(), endDate: new Date(Date.now() + 90 * 86_400_000), isActive: true } as any))._id);
  });
  afterAll(stopMongo);

  it('a draft is invisible; going live shows it to the students it covers only', async () => {
    const a = await mk('a@x.test');
    const p = await mk('p@x.test', { batchId: python });
    const ag = await svc.create(tid, admin, { title: 'Institute rules', points: ['Be on time', 'No phones in class'], audience: { mode: 'batches', batchIds: [java] } });
    expect((await svc.mine(tid, a)).pending).toHaveLength(0);
    await svc.setStatus(tid, admin, ag.id, 'live');
    expect((await svc.mine(tid, a)).pending.map((x) => x.title)).toEqual(['Institute rules']);
    expect((await svc.mine(tid, p)).pending).toHaveLength(0);
  });

  it('will not go live empty or with no batch picked', async () => {
    await expect(svc.create(tid, admin, { title: 'Empty', points: [], status: 'live' })).rejects.toThrow(/at least one point/);
    await expect(svc.create(tid, admin, { title: 'No batch', points: ['x'], audience: { mode: 'batches', batchIds: [] }, status: 'live' })).rejects.toThrow(/batch/);
  });

  it('a signature agreement refuses acceptance without a signature and name, then records a snapshot', async () => {
    const s = await mk('sig@x.test');
    const ag = await svc.create(tid, admin, { title: 'Placement agreement', kind: 'agreement', points: ['Attend every drive'], requireSignature: true, audience: { mode: 'students', studentIds: [s] }, status: 'live' });
    await expect(svc.accept(tid, s, ag.id, {}, {})).rejects.toThrow(/sign/);
    await expect(svc.accept(tid, s, ag.id, { signature: SIG }, {})).rejects.toThrow(/full name/);
    await svc.accept(tid, s, ag.id, { signature: SIG, signedName: 'Sig Student', version: 1 }, { ip: '1.2.3.4' });
    const rec: any = await AgreementAcceptance.findOne({ agreementId: ag.id, userId: s }).lean();
    expect(rec.snapshot.points).toEqual(['Attend every drive']);
    expect(rec.signedName).toBe('Sig Student');
    // Someone not named is refused.
    const other = await mk('other@x.test');
    await expect(svc.accept(tid, other, ag.id, { signature: SIG, signedName: 'X Y' }, {})).rejects.toThrow(/not for your account/);
  });

  it('editing with "ask again" makes everyone accept the new version; a typo fix does not', async () => {
    const s = await mk('ver@x.test');
    const ag = await svc.create(tid, admin, { title: 'Fee terms', points: ['Pay by the 5th'], audience: { mode: 'students', studentIds: [s] }, status: 'live' });
    await svc.accept(tid, s, ag.id, {}, {});
    expect((await svc.mine(tid, s)).pending.find((x) => x.id === ag.id)).toBeUndefined();
    await svc.update(tid, admin, ag.id, { ...ag, points: ['Pay by the 5th.'] });
    expect((await svc.mine(tid, s)).pending.find((x) => x.id === ag.id)).toBeUndefined();
    await svc.update(tid, admin, ag.id, { ...ag, points: ['Pay by the 1st'], reask: true });
    expect((await svc.mine(tid, s)).pending.find((x) => x.id === ag.id)?.version).toBe(2);
    const r = await svc.responses(tid, ag.id);
    expect(r.rows[0].status).toBe('old_version');
  });

  it('"hold the LMS" blocks the student until accepted, even with the profile rule off', async () => {
    const s = await mk('hold@x.test');
    const ag = await svc.create(tid, admin, { title: 'Code of conduct', points: ['Be kind'], blockLms: true, audience: { mode: 'students', studentIds: [s] }, status: 'live' });
    expect(await rules.profileGateBlocks(tid, s)).toBe(true);
    const st = await rules.profileGateStatus(tid, s);
    expect(st.enabled).toBe(true);
    expect(st.complete).toBe(false);
    expect(st.agreements.map((x: any) => x.title)).toEqual(['Code of conduct']);
    expect(rules.profileGateAllows('POST', `/api/v1/agreements/${ag.id}/accept`, s)).toBe(true);
    await svc.accept(tid, s, ag.id, {}, {});
    rules.forgetGate(tid, s);
    expect(await rules.profileGateBlocks(tid, s)).toBe(false);
  });

  it('cannot delete once accepted; closing hides it from students', async () => {
    const s = await mk('del@x.test');
    const ag = await svc.create(tid, admin, { title: 'Close me', points: ['x'], audience: { mode: 'students', studentIds: [s] }, status: 'live' });
    await svc.accept(tid, s, ag.id, {}, {});
    await expect(svc.remove(tid, ag.id)).rejects.toThrow(/Close it instead/);
    await svc.setStatus(tid, admin, ag.id, 'closed');
    const m = await svc.mine(tid, s);
    expect([...m.pending, ...m.accepted].find((x) => x.id === ag.id)).toBeUndefined();
  });

  it('counts targeted / accepted for the admin list', async () => {
    const list = await svc.list(tid);
    const rules1 = list.find((x: any) => x.title === 'Institute rules');
    expect(rules1.counts.targeted).toBeGreaterThan(0);
    expect(rules1.counts.accepted).toBe(0);
  });
});
