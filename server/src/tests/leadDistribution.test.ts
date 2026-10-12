const lead: any = { _id: '65a0000000000000000000aa', createdBy: '65a0000000000000000000bb' };
const config: any = { mode: 'round_robin', roundRobinPointer: null, eligibleRoles: ['sales'], weights: [], maxLeadsPerDayDefault: 20 };
const assigned = jest.fn(async (..._args: any[]) => lead);
const userFind = jest.fn(async () => []);
const pointer = jest.fn(async () => config);
jest.mock('../services/outperoPolicyService', () => ({ waitsForOutpero: () => false }));
jest.mock('../models/Lead', () => ({ __esModule: true, default: { findOne: jest.fn(async () => lead), findOneAndUpdate: (...a: any[]) => (assigned as any)(...a), aggregate: jest.fn(async () => []) } }));
jest.mock('../models/LeadDistributionConfig', () => ({ __esModule: true, default: { findOne: jest.fn(async () => config), findOneAndUpdate: (...a: any[]) => (pointer as any)(...a) } }));
jest.mock('../models/User', () => ({ __esModule: true, default: { find: (...a: any[]) => ({ lean: () => (userFind as any)(...a) }) } }));
import { autoAssignLead } from '../services/leadDistributionService';
beforeEach(() => { lead.assignedTo = undefined; lead.assignment = undefined; config.roundRobinPointer = null; userFind.mockReset().mockResolvedValue([{ _id: '65a0000000000000000000cc' }, { _id: '65a0000000000000000000dd' }] as any); pointer.mockReset().mockResolvedValue(config); assigned.mockClear(); });
describe('lead distribution', () => {
  it('preserves an existing owner without advancing round robin', async () => {
    lead.assignedTo = '65a0000000000000000000dd';
    expect(await autoAssignLead('65a0000000000000000000ee', lead._id, true)).toBe(lead.assignedTo);
    expect(pointer).not.toHaveBeenCalled(); expect(assigned).not.toHaveBeenCalled();
  });
  it('selects only active eligible staff, and conditionally writes an unassigned lead', async () => {
    config.roundRobinPointer = '65a0000000000000000000cc';
    expect(await autoAssignLead('65a0000000000000000000ee', lead._id, true)).toBe('65a0000000000000000000dd');
    expect(userFind).toHaveBeenCalledWith({ tenantId: '65a0000000000000000000ee', isActive: true, role: { $in: ['sales'] } }, '_id');
    expect(assigned.mock.calls[0][0]).toMatchObject({ assignedTo: null, 'assignment.assignedTo': null });
  });
  it('retries pointer contention rather than selecting the same staff member', async () => {
    pointer.mockResolvedValueOnce(null as any).mockResolvedValueOnce(config);
    await autoAssignLead('65a0000000000000000000ee', lead._id, true); expect(pointer).toHaveBeenCalledTimes(2);
  });
});
