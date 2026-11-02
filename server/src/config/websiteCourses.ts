/**
 * Courses the website may send leads for, by the `course` key it posts.
 *
 * The server decides the name that lands in the CRM, so a page can only ever tag a lead with a
 * course listed here — nothing typed in the browser reaches the lead's course.
 * To add a course (and a landing page for it), add one entry.
 */
export interface WebsiteCourse { key: string; name: string }

export const WEBSITE_COURSES: Record<string, WebsiteCourse> = {
  fde: { key: 'fde', name: 'FDE – Forward Deployed & Applied AI Engineer' },
};
