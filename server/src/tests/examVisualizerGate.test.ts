import { visualizeCandidateCode } from '../services/hackathonExamService';
import HackathonExam from '../models/HackathonExam';

/*
 * The exam-side Code Visualizer is OFF unless an admin turns it on for that exam. These
 * refusals happen before any database or sandbox call, so they are checked without either.
 */
const attempt = (over: any = {}) => ({ submittedAt: null, drawnItems: [], answers: [], ...over }) as any;

describe('exam visualizer gate', () => {
  it('defaults to off on a new exam', () => {
    const e = new HackathonExam({ tenantId: 't', hackathonId: '64b000000000000000000001', title: 'x', startAt: new Date(), endAt: new Date(), durationMins: 30 });
    expect(e.runPolicy.allowVisualizer).toBe(false);
  });

  it('refuses when the exam has not enabled it', async () => {
    const exam = { runPolicy: { enabled: true, allowVisualizer: false } } as any;
    await expect(visualizeCandidateCode(exam, attempt(), 'i', 'code')).rejects.toMatchObject({ code: 'VISUALIZER_DISABLED' });
  });

  it('refuses when running code is off, even if the visualizer flag is on', async () => {
    const exam = { runPolicy: { enabled: false, allowVisualizer: true } } as any;
    await expect(visualizeCandidateCode(exam, attempt(), 'i', 'code')).rejects.toMatchObject({ code: 'VISUALIZER_DISABLED' });
  });

  it('refuses after the paper is submitted', async () => {
    const exam = { runPolicy: { enabled: true, allowVisualizer: true } } as any;
    await expect(visualizeCandidateCode(exam, attempt({ submittedAt: new Date() }), 'i', 'code'))
      .rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
  });
});
