/**
 * Edit lead: shows every section (contact, what they want, lead details, custom fields, answers
 * from the lead form) and saves them all in one payload.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import EditLeadModal from './EditLeadModal';

jest.mock('../../../api', () => ({
  leadApi: {
    getQueue: async () => ({ data: { options: { courses: ['Java Full Stack with AI', 'Python Full Stack with AI'] } } }),
    getSources: async () => ({ data: ['facebook', 'website'] }),
  },
}));
jest.mock('../../../components/common', () => ({
  Modal: ({ isOpen, title, children }: any) => (isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null),
}));

const lead = {
  _id: 'l1', name: 'Geetha', phone: '9182701438', email: '', source: 'facebook', priority: 'warm', notes: '',
  courseInterest: ['Java Full Stack with AI'], language: 'telugu',
  interests: { mode: 'offline', urgency: 'soon', affordability: 'needs_emi', placement: true, technologies: ['Java'] },
  customFields: { city: 'Vizag', custom_passout_year: '2027', 'which_course_are_you_interested_in_?': 'java_full_stack_with_ai', phone_number: '+919182701438', batch_pref: 'Morning' },
};

it('shows all sections and saves every field', async () => {
  const onSave = jest.fn();
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<EditLeadModal open lead={lead} busy={false} onClose={() => {}} onSave={onSave}
      customDefs={[{ fieldKey: 'batch_pref', label: 'Batch preference', type: 'select', options: ['Morning', 'Evening'] }]} />);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  const t = el.textContent || '';
  for (const s of ['Contact', 'City', 'Preferred language', 'What they want', 'Interested courses', 'Java Full Stack with AI', 'Training mode', 'When can they start', 'Fee / budget',
    'Wants placement support', 'Lead details', 'Next follow-up', 'Notes', 'Your custom fields', 'Batch preference', 'Answers from the lead form', 'Passout year', 'Which course are you interested in']) expect(t).toContain(s);
  expect(t).not.toContain('Phone number'); // plumbing keys stay hidden

  const input = el.querySelector('[aria-label="Add a course"]') as HTMLInputElement;
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(input, 'Data Analytics');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => { (Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'Save changes') as HTMLElement).click(); });
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Geetha', courseInterest: ['Java Full Stack with AI', 'Data Analytics'], language: 'telugu', priority: 'warm',
    interests: expect.objectContaining({ mode: 'offline', urgency: 'soon', affordability: 'needs_emi', placement: true, location: 'Vizag', technologies: ['Java'] }),
    customFields: expect.objectContaining({ custom_passout_year: '2027', city: 'Vizag', batch_pref: 'Morning' }),
  }));
  act(() => root.unmount());
  el.remove();
});
