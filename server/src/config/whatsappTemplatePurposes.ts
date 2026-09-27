/**
 * Every place in the system that sends a WhatsApp template, and the SHAPE of what it sends.
 *
 * Meta validates a send against the named template: the number of body variables, whether a
 * url-button parameter or header image is present. A call site can only use a template it can
 * fill, so assigning a template to a purpose is checked against this list rather than trusted.
 *
 * `settingsKey` is where the assignment is stored (name, `_LANG`, `_BUTTON` suffixes); the
 * send path (assessmentOtpService.templateConfig) already resolves these keys, so assigning a
 * template here needs no change at the call sites.
 */
export interface WaTemplatePurpose {
  key: string;
  label: string;
  module: string;
  settingsKey: string;
  /** What each body variable carries, in order. A template may use FEWER (the tail is dropped). */
  variables: string[];
  /** The call site passes a url-button parameter (so a dynamic URL button can be filled). */
  buttonParam?: string;
  /** The call site passes a header image (so an IMAGE-header template can be filled). */
  headerImage?: boolean;
  /** Meta category this purpose must use; otherwise UTILITY is recommended. */
  requiredCategory?: 'AUTHENTICATION';
  help: string;
}

export const WA_TEMPLATE_PURPOSES: WaTemplatePurpose[] = [
  {
    key: 'OTP', label: 'OTP / verification code', module: 'Sign-up & assessments',
    settingsKey: 'WHATSAPP_OTP_TEMPLATE',
    variables: ['Verification code'], buttonParam: 'Verification code (copy-code button)',
    requiredCategory: 'AUTHENTICATION',
    help: 'Assessment, Tech Battle and CareerPilot sign-up codes. Must be an AUTHENTICATION template with a copy-code button.',
  },
  {
    key: 'NOTIFY', label: 'Tech Battles — approval & reminders', module: 'Tech Battles',
    settingsKey: 'WHATSAPP_NOTIFY_TEMPLATE',
    variables: ['Member name', 'Start time (IST)'], buttonParam: 'Exam token — URL like https://platform.codebegun.com/battles/exam/{{1}}',
    help: 'Sent when a registration is approved and before the battle starts. Also the fallback for any use below with no template of its own.',
  },
  {
    key: 'HACKATHON_PENDING', label: 'Hackathon — payment pending', module: 'Hackathons',
    settingsKey: 'WHATSAPP_TEMPLATE_HACKATHON_PENDING',
    variables: ['Team lead name', 'Team name', 'Hackathon title'], buttonParam: 'Registration code — URL like https://platform.codebegun.com/hackathons/resume/{{1}}',
    help: 'Sent the moment a team registers, with the link back to their unpaid registration.',
  },
  {
    key: 'HACKATHON_CONFIRMED', label: 'Hackathon — registration confirmed', module: 'Hackathons',
    settingsKey: 'WHATSAPP_TEMPLATE_HACKATHON_CONFIRMED',
    variables: ['Member name', 'Team name', 'Hackathon title', 'Date & time', 'Venue'],
    buttonParam: 'Registration code — URL like https://platform.codebegun.com/hackathons/resume/{{1}}',
    headerImage: true,
    help: 'Sent on payment success. An IMAGE header carries the hackathon banner as a poster.',
  },
  {
    key: 'HACKATHON_EXAM_INVITE', label: 'Hackathon exam — invitation', module: 'Hackathon exams',
    settingsKey: 'WHATSAPP_TEMPLATE_HACKATHON_EXAM_INVITE',
    variables: ['Candidate name', 'Event title', 'Start time'], buttonParam: 'Exam token — URL like https://platform.codebegun.com/hackathon-exam/{{1}}',
    help: 'Sent when an admin issues exam invitations.',
  },
  {
    key: 'HACKATHON_EXAM_REMINDER', label: 'Hackathon exam — reminder', module: 'Hackathon exams',
    settingsKey: 'WHATSAPP_TEMPLATE_HACKATHON_EXAM_REMINDER',
    variables: ['Candidate name', 'Event title', 'Start time'], buttonParam: 'Exam token — URL like https://platform.codebegun.com/hackathon-exam/{{1}}',
    help: 'Fired at each reminder offset before the exam starts.',
  },
  {
    key: 'HACKATHON_EXAM_RESULT', label: 'Hackathon exam — result', module: 'Hackathon exams',
    settingsKey: 'WHATSAPP_TEMPLATE_HACKATHON_EXAM_RESULT',
    variables: ['Candidate name', 'Event title', 'Score (e.g. 24/40)'], buttonParam: 'Exam token — URL like https://platform.codebegun.com/hackathon-exam/{{1}}',
    help: 'Sent when an admin publishes results.',
  },
  {
    key: 'LEAD_WELCOME', label: 'CRM — new lead welcome', module: 'CRM / Leads',
    settingsKey: 'WHATSAPP_TEMPLATE_LEAD_WELCOME',
    variables: ['Lead first name'],
    help: 'Sent to a new lead when "Send WhatsApp welcome" is on for its source. Without a template the welcome goes as plain text, which Meta drops for anyone who has not messaged you first — i.e. almost every ad lead.',
  },
];

export const getPurpose = (key: string) =>
  WA_TEMPLATE_PURPOSES.find((p) => p.key === String(key || '').toUpperCase());
