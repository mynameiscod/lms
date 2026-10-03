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
    key: 'PRACTICE_REMINDER', label: 'Daily practice — evening reminder', module: 'Practice Pass',
    settingsKey: 'WHATSAPP_TEMPLATE_PRACTICE_REMINDER',
    variables: ['Student first name', 'Tasks still left today (e.g. "Communication Lab, Coding problem")'],
    help: 'Sent at 7 PM IST to students who have not finished today’s practice tasks. Only sent when a template is assigned here. Keep it UTILITY: a missed-practice reminder is transactional.',
  },
  {
    key: 'WEEKLY_REPORT', label: 'Weekly learning report', module: 'Reports',
    settingsKey: 'WHATSAPP_TEMPLATE_WEEKLY_REPORT',
    variables: ['Student first name', 'Week (e.g. 22–27 Sep)', 'Practice days (e.g. 4 of 6)', 'Practice attendance (e.g. 72%)', 'Overall score (e.g. 68/100)'],
    help: 'Sent when an admin sends the weekly report with WhatsApp ticked (Weekly Reports page). The full report still goes by email; WhatsApp carries the headline numbers. Keep it UTILITY.',
  },
  {
    key: 'PREP_PACK', label: 'Drive prep pack', module: 'Interview Hub',
    settingsKey: 'WHATSAPP_TEMPLATE_PREP_PACK',
    variables: ['Student first name', 'Company name', 'Drive date (e.g. 10 Oct 2026)', 'Link to the prep pack'],
    help: 'Sent to students who applied to a placement drive — on applying and/or a few days before the drive (Admin → Drives → Interview Experiences → Automation). Email is always free; WhatsApp only when a template is assigned here and WhatsApp is ticked. Keep it UTILITY.',
  },
  {
    key: 'INTERVIEW_EXPERIENCE_INVITE', label: 'Interview experience — invite', module: 'Interview Hub',
    settingsKey: 'WHATSAPP_TEMPLATE_INTERVIEW_EXPERIENCE_INVITE',
    variables: ['Student first name', 'Company name', 'Link to share the experience'],
    help: 'Sent when an admin invites students to share what they were asked in an interview (Admin → Interview Experiences → Invite). Email is always free; WhatsApp only goes out when a template is assigned here. Keep it UTILITY.',
  },
  {
    key: 'LEAD_WELCOME', label: 'CRM — new lead welcome', module: 'CRM / Leads',
    settingsKey: 'WHATSAPP_TEMPLATE_LEAD_WELCOME',
    variables: ['Lead first name'],
    help: 'Sent to a new lead when "Send WhatsApp welcome" is on for its source. Without a template the welcome goes as plain text, which Meta drops for anyone who has not messaged you first — i.e. almost every ad lead.',
  },
  {
    key: 'PLACEMENT_PROGRAM_REGISTERED', label: 'Placement Program — registration received', module: 'Placement Program',
    settingsKey: 'WHATSAPP_TEMPLATE_PLACEMENT_PROGRAM_REGISTERED',
    variables: ['Candidate first name'],
    help: 'Sent as soon as someone submits the Placement Program form from an ad. Nothing is sent until a template is assigned here, and the candidate timeline records that. Keep it UTILITY (a factual "we received your registration") — a marketing template is not delivered to most ad leads.',
  },
  {
    key: 'PLACEMENT_INTERVIEW_BOOKED', label: 'Placement Program — interview booked', module: 'Placement Program',
    settingsKey: 'WHATSAPP_TEMPLATE_PLACEMENT_INTERVIEW_BOOKED',
    variables: ['Candidate first name', 'Interview date and time (IST)', 'Meeting link'],
    help: 'Sent when a candidate books their interview. Keep it UTILITY, e.g. "Hi {{1}}, your interview is confirmed for {{2}} IST. Join here: {{3}}". An email with a calendar invite also goes out when the candidate gave an email.',
  },
  {
    key: 'PLACEMENT_INTERVIEW_REMINDER', label: 'Placement Program — interview reminder', module: 'Placement Program',
    settingsKey: 'WHATSAPP_TEMPLATE_PLACEMENT_INTERVIEW_REMINDER',
    variables: ['Candidate first name', 'Interview date and time (IST)', 'Meeting link'],
    help: 'Sent 24 hours and 1 hour before the interview. Same three variables as the booking message. Keep it UTILITY.',
  },
];

export const getPurpose = (key: string) =>
  WA_TEMPLATE_PURPOSES.find((p) => p.key === String(key || '').toUpperCase());
