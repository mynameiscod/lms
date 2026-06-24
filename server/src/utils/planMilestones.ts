/**
 * Shared milestone logic for personalized plans — used by both the journey view
 * (getJourney) and the lazy day-content generator so they never diverge.
 *
 * A mock interview sits at the end of every 3rd study-week; a project at the
 * mid-point and the final day. Mock takes precedence on a shared day.
 */
export interface PlanMilestone { kind: 'mock' | 'project'; title: string; }

const STUDY_PER_WEEK = 5;

export function milestoneForDay(totalDays: number, day: number): PlanMilestone | null {
  const totalWeeks = Math.max(1, Math.ceil(totalDays / STUDY_PER_WEEK));
  for (let w = 3; w <= totalWeeks; w += 3) {
    if (day === Math.min(totalDays, w * STUDY_PER_WEEK)) {
      return { kind: 'mock', title: `Mock Interview #${Math.floor(w / 3)}` };
    }
  }
  const mid = Math.max(1, Math.round(totalDays / 2));
  if (day === mid) return { kind: 'project', title: 'Mid-track Project' };
  if (day === totalDays) return { kind: 'project', title: 'Capstone Project' };
  return null;
}
