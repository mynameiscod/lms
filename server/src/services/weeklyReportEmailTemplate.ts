import type { WeeklyReportData } from './weeklyReportService';

const BASE = 'https://platform.codebegun.com';
const LOGO = `${BASE}/assets/logo.png`;

// ── small render helpers ──────────────────────────────────────────────────
const statCell = (value: string | number, label: string, color: string) => `
  <td width="33%" style="padding: 6px; text-align: center;">
    <div style="border: 1px solid #eef1f6; border-radius: 10px; padding: 12px 6px;">
      <div style="font-size: 20px; font-weight: 800; color: ${color};">${value}</div>
      <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${label}</div>
    </div>
  </td>`;

const miniRow = (label: string, value: string) => `
  <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">${label}<br><span style="font-size: 14px; font-weight: 700; color: #1a1a2e;">${value}</span></div>`;

const detailBtn = (text: string, href: string, color: string) => `
  <a href="${href}" style="display: block; text-align: center; margin-top: 14px; background: ${color}; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px; border-radius: 8px;">${text} &rarr;</a>`;

const bar = (label: string, rating: number) => {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return `
  <tr>
    <td style="font-size: 12px; color: #374151; padding: 4px 8px 4px 0; white-space: nowrap;">${label}</td>
    <td style="padding: 4px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #e6eef7; border-radius: 6px;">
        <tr><td style="background: #17a2b8; height: 8px; border-radius: 6px; width: ${pct}%; font-size: 0; line-height: 0;">&nbsp;</td></tr>
      </table>
    </td>
    <td style="font-size: 12px; font-weight: 700; color: #0b2e63; padding: 4px 0 4px 8px; white-space: nowrap;">${rating.toFixed(1)} / 5</td>
  </tr>`;
};

const feature = (icon: string, title: string) => `
  <td width="20%" valign="top" style="padding: 6px; text-align: center;">
    <div style="width: 42px; height: 42px; line-height: 42px; margin: 0 auto 6px; border-radius: 50%; background: #eaf2fb; font-size: 18px;">${icon}</div>
    <div style="font-size: 11px; font-weight: 700; color: #0b2e63; line-height: 1.3;">${title}</div>
  </td>`;

const stars = (rating: number) => {
  const full = Math.round(rating);
  return '★'.repeat(Math.max(0, Math.min(5, full))) + '☆'.repeat(Math.max(0, 5 - full));
};

// ── main template ─────────────────────────────────────────────────────────
export function getWeeklyReportEmailHtml(d: WeeklyReportData): string {
  const gen = new Date(d.period.generatedAtISO);
  const genDate = gen.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const genTime = gen.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const scoreColor = d.overall.score >= 70 ? '#17a2b8' : d.overall.score >= 50 ? '#d97706' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your Weekly Learning Report</title>
</head>
<body style="margin:0; padding:0; background:#eef2f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; color:#333;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Your Weekly Learning Report — ${d.period.label}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(11,46,99,.08);">

        <!-- top strip -->
        <tr><td style="padding:12px 24px; font-size:12px; color:#6b7280;">Your Learning. Our Commitment. Your Success.</td></tr>

        <!-- HERO -->
        <tr><td style="background:linear-gradient(135deg,#0a2a5e 0%,#123f86 55%,#1877c7 100%); padding:28px 30px;">
          <div style="display:inline-block; background:#fff; padding:8px 12px; border-radius:9px;"><img src="${LOGO}" alt="CodeBegun" width="150" style="display:block; height:auto; border:0;" /></div>
          <div style="font-size:11px; color:#b9d2f0; margin-top:8px;">by Savas Tech Solution Pvt Ltd</div>
          <div style="font-size:27px; font-weight:800; color:#fff; margin-top:16px; line-height:1.2;">Your Weekly<br><span style="color:#4fd0e6;">Learning Report</span> 📄</div>
          <div style="font-size:14px; color:#d7e6f8; margin-top:10px;">Stay consistent, keep learning, and move closer to your goals every day!</div>
        </td></tr>

        <!-- GREETING -->
        <tr><td style="padding:22px 26px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:12px;">
            <tr>
              <td style="padding:16px 18px; vertical-align:top;">
                <div style="font-size:17px; font-weight:700; color:#0b2e63;">Hi ${d.student.firstName},</div>
                <div style="font-size:13px; color:#6b7280; margin-top:4px;">Here's your learning progress summary for this week.${d.student.batchName ? ` (${d.student.batchName})` : ''}</div>
              </td>
              <td style="padding:16px 18px; vertical-align:top; text-align:right; white-space:nowrap;">
                <div style="font-size:11px; color:#8a94a6;">📅 Week Of</div>
                <div style="font-size:13px; font-weight:700; color:#1a1a2e; margin-bottom:8px;">${d.period.label}</div>
                <div style="font-size:11px; color:#8a94a6;">🕐 Generated ${genDate} · ${genTime}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- SUMMARY -->
        <tr><td style="padding:14px 26px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd; border-radius:12px;">
            <tr>
              <td width="55%" style="padding:20px; vertical-align:middle;">
                <div style="font-size:16px; font-weight:800; color:#0b2e63;">This Week's Summary</div>
                <div style="font-size:13px; color:#4b5563; line-height:1.6; margin-top:6px;">${d.overall.message}</div>
              </td>
              <td width="45%" style="padding:20px; vertical-align:middle; text-align:center; border-left:1px solid #e3ebf5;">
                <div style="font-size:11px; color:#8a94a6; text-transform:uppercase; letter-spacing:.5px;">Weekly Performance</div>
                <div style="font-size:22px; font-weight:800; color:${scoreColor}; margin:4px 0;">${d.overall.label}</div>
                <div style="display:inline-block; background:#0b2e63; color:#fff; font-size:12px; font-weight:700; padding:6px 14px; border-radius:20px;">Score: ${d.overall.score} / 100</div>
                <div style="margin-top:8px; font-size:12px; color:#6b7280;">Grade <span style="display:inline-block; background:#17a2b8; color:#fff; font-weight:800; border-radius:50%; width:26px; height:26px; line-height:26px; text-align:center; font-size:12px;">${d.overall.grade}</span></div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- SECTION CARDS -->
        <tr><td style="padding:12px 20px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <!-- Quizzes -->
            <td width="50%" valign="top" style="padding:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:14px;"><tr><td style="padding:16px;">
                <div style="font-size:15px; font-weight:800; color:#0b2e63;"><span style="color:#6d28d9;">📝</span> Quizzes</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>
                  ${statCell(String(d.quizzes.assigned).padStart(2, '0'), 'Assigned', '#6d28d9')}
                  ${statCell(String(d.quizzes.attempted).padStart(2, '0'), 'Attempted', '#6d28d9')}
                  ${statCell(`${d.quizzes.avgScore}%`, 'Avg Score', '#6d28d9')}
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="50%">${miniRow('Top Score', `${d.quizzes.topScore}%`)}</td>
                  <td width="50%">${miniRow('Time Spent', d.quizzes.timeLabel)}</td>
                </tr></table>
                ${detailBtn('View Quiz Details', `${BASE}/quizzes`, '#6d28d9')}
              </td></tr></table>
            </td>
            <!-- Assignments -->
            <td width="50%" valign="top" style="padding:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:14px;"><tr><td style="padding:16px;">
                <div style="font-size:15px; font-weight:800; color:#0b2e63;"><span style="color:#059669;">📋</span> Assignments</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>
                  ${statCell(String(d.assignments.assigned).padStart(2, '0'), 'Assigned', '#059669')}
                  ${statCell(String(d.assignments.submitted).padStart(2, '0'), 'Submitted', '#059669')}
                  ${statCell(d.assignments.scoredCount > 0 ? `${d.assignments.avgScore}%` : (d.assignments.submitted > 0 ? 'Pending' : '—'), d.assignments.scoredCount > 0 ? 'Avg Score' : (d.assignments.submitted > 0 ? 'Grading' : 'Avg Score'), '#059669')}
                </tr></table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="50%">${miniRow('Pending', String(d.assignments.pending).padStart(2, '0'))}</td>
                  <td width="50%">${miniRow('Time Spent', d.assignments.timeLabel)}</td>
                </tr></table>
                ${detailBtn('View Assignment Details', `${BASE}/assignments`, '#059669')}
              </td></tr></table>
            </td>
          </tr><tr>
            <!-- Attendance -->
            <td width="50%" valign="top" style="padding:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:14px;"><tr><td style="padding:16px;">
                <div style="font-size:15px; font-weight:800; color:#0b2e63;"><span style="color:#2563eb;">📅</span> Attendance</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
                  <td width="40%" style="text-align:center;">
                    <div style="width:66px; height:66px; line-height:66px; margin:0 auto; border-radius:50%; border:5px solid #2563eb; color:#0b2e63; font-size:18px; font-weight:800;">${d.attendance.percentage}%</div>
                  </td>
                  <td width="60%" style="font-size:12px; color:#374151; line-height:1.9;">
                    <span style="color:#059669;">●</span> Present <b>${d.attendance.present}</b> &nbsp;
                    <span style="color:#dc2626;">●</span> Absent <b>${d.attendance.absent}</b><br>
                    <span style="color:#d97706;">●</span> Late <b>${d.attendance.late}</b> &nbsp;
                    <span style="color:#6b7280;">●</span> Leave <b>${d.attendance.leave}</b><br>
                    <span style="color:#6b7280;">Total Classes</span> <b>${d.attendance.totalClasses}</b>
                  </td>
                </tr></table>
                ${detailBtn('View Attendance Details', `${BASE}/my-attendance`, '#2563eb')}
              </td></tr></table>
            </td>
            <!-- Mock Interview -->
            <td width="50%" valign="top" style="padding:6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:14px;"><tr><td style="padding:16px;">
                <div style="font-size:15px; font-weight:800; color:#0b2e63;"><span style="color:#ea7317;">🎤</span> Mock Interview</div>
                ${d.interview.taken > 0 ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>
                  <td width="42%" valign="top">
                    <div style="font-size:11px; color:#8a94a6;">Interviews Taken</div>
                    <div style="font-size:26px; font-weight:800; color:#0b2e63;">${String(d.interview.taken).padStart(2, '0')}</div>
                    <div style="font-size:11px; color:#8a94a6; margin-top:6px;">Average Score</div>
                    <div style="color:#f5a623; font-size:15px;">${stars(d.interview.avgRating)}</div>
                    <div style="font-size:12px; font-weight:700; color:#0b2e63;">${d.interview.avgRating.toFixed(1)} / 5</div>
                  </td>
                  <td width="58%" valign="top">
                    ${d.interview.breakdown.length
                      ? `<div style="font-size:11px; color:#8a94a6; margin-bottom:4px;">Performance Breakdown</div>
                         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${d.interview.breakdown.map(b => bar(b.label, b.rating)).join('')}</table>`
                      : `<div style="font-size:12px; color:#9ca3af; padding-top:18px;">Feedback recorded.</div>`}
                  </td>
                </tr></table>
                ${d.interview.remarks ? `<div style="margin-top:10px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:9px 12px; font-size:12.5px; color:#9a3412;">💬 <b>Mentor feedback:</b> ${String(d.interview.remarks).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}`
                : d.interview.absent > 0 ? `
                <div style="margin-top:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px; text-align:center;">
                  <div style="font-size:22px;">🚫</div>
                  <div style="font-size:14px; font-weight:800; color:#b91c1c; margin-top:4px;">Marked Absent</div>
                  <div style="font-size:12px; color:#7f1d1d; margin-top:3px;">You were scheduled for a mock interview but didn't attend. Don't miss the next one!</div>
                </div>`
                : d.interview.scheduled > 0 ? `
                <div style="margin-top:12px; background:#eff6ff; border:1px solid #dbeafe; border-radius:10px; padding:14px; text-align:center;">
                  <div style="font-size:22px;">🗓️</div>
                  <div style="font-size:13.5px; font-weight:700; color:#1e40af; margin-top:4px;">Mock interview scheduled</div>
                  <div style="font-size:12px; color:#3b5bdb; margin-top:3px;">Your mentor's feedback will appear here once submitted.</div>
                </div>`
                : `<div style="font-size:12px; color:#9ca3af; padding:24px 0; text-align:center;">No mock interviews this week.</div>`}
              </td></tr></table>
            </td>
          </tr></table>
        </td></tr>

        ${d.challenges.totalAssigned > 0 ? `
        <!-- DAILY CHALLENGES -->
        <tr><td style="padding:6px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef1f6; border-radius:14px;"><tr><td style="padding:16px 18px;">
            <div style="font-size:15px; font-weight:800; color:#0b2e63; margin-bottom:2px;">🎯 Daily Challenges</div>
            <div style="font-size:12px; color:#8a94a6; margin-bottom:12px;">Scheduled challenges for your batch this week — completed vs missed.</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              ${[
                { name: '🎙 Communication Lab', c: d.challenges.communication },
                { name: '🧩 Logical Thinking Lab', c: d.challenges.thinking },
              ].map(x => `
              <td width="50%" valign="top" style="padding:6px;">
                <div style="border:1px solid #eef1f6; border-radius:10px; padding:12px 14px;">
                  <div style="font-size:13px; font-weight:700; color:#0b2e63; margin-bottom:8px;">${x.name}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="text-align:center;"><div style="font-size:18px; font-weight:800; color:#0b2e63;">${x.c.assigned}</div><div style="font-size:10px; color:#8a94a6;">Assigned</div></td>
                    <td style="text-align:center;"><div style="font-size:18px; font-weight:800; color:#059669;">${x.c.completed}</div><div style="font-size:10px; color:#8a94a6;">Completed</div></td>
                    <td style="text-align:center;"><div style="font-size:18px; font-weight:800; color:${x.c.missed > 0 ? '#dc2626' : '#94a3b8'};">${x.c.missed}</div><div style="font-size:10px; color:#8a94a6;">Missed</div></td>
                  </tr></table>
                </div>
              </td>`).join('')}
            </tr></table>
            ${d.challenges.totalMissed > 0
              ? `<div style="font-size:12px; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; margin-top:10px;">⚠️ ${d.challenges.totalMissed} scheduled challenge${d.challenges.totalMissed > 1 ? 's were' : ' was'} missed this week — try to complete them within their window next time.</div>`
              : `<div style="font-size:12px; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:8px 12px; margin-top:10px;">✅ All scheduled challenges completed on time. Excellent consistency!</div>`}
          </td></tr></table>
        </td></tr>` : ''}

        <!-- QUOTE -->
        <tr><td style="padding:14px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0a2a5e,#123f86); border-radius:12px;">
            <tr><td style="padding:20px 24px; text-align:center;">
              <div style="font-size:15px; font-weight:700; color:#fff;">"Small progress every day leads to big results.</div>
              <div style="font-size:15px; font-weight:700; color:#4fd0e6;">Keep learning, keep growing!" 🏆</div>
            </td></tr>
          </table>
        </td></tr>

        <!-- WHY LEARN -->
        <tr><td style="padding:6px 20px 18px;">
          <div style="text-align:center; font-size:14px; font-weight:800; color:#0b2e63; margin-bottom:8px;">Why Learn with CodeBegun?</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            ${feature('📚', 'Industry Relevant Curriculum')}
            ${feature('🤖', 'AI-Powered Learning')}
            ${feature('🛠️', 'Hands-on Projects')}
            ${feature('📈', 'Progress Tracking')}
            ${feature('🧑‍💼', 'Placement Support')}
          </tr></table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#0a2445; padding:26px 30px;">
          <div style="display:inline-block; background:#fff; padding:8px 12px; border-radius:9px;"><img src="${LOGO}" alt="CodeBegun" width="150" style="display:block; height:auto; border:0;" /></div>
          <div style="font-size:11px; color:#8fa6c6; margin-top:8px;">by Savas Tech Solution Pvt Ltd</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr>
            <td width="34%" valign="top">
              <div style="font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; margin-bottom:10px;">Our Courses</div>
              <div style="font-size:12px; color:#c5d4ea; line-height:2;">Full Stack Development<br>Data Analytics<br>Data Science<br>Artificial Intelligence<br>Cyber Security<br>UI/UX Design</div>
            </td>
            <td width="33%" valign="top">
              <div style="font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; margin-bottom:10px;">Quick Links</div>
              <div style="font-size:12px; line-height:2;">
                <a href="${BASE}/dashboard" style="color:#c5d4ea; text-decoration:none;">Dashboard</a><br>
                <a href="${BASE}/my-learning" style="color:#c5d4ea; text-decoration:none;">My Courses</a><br>
                <a href="${BASE}/hms-classes" style="color:#c5d4ea; text-decoration:none;">Live Classes</a><br>
                <a href="${BASE}/assignments" style="color:#c5d4ea; text-decoration:none;">Assignments</a><br>
                <a href="mailto:info@codebegun.com" style="color:#c5d4ea; text-decoration:none;">Support</a>
              </div>
            </td>
            <td width="33%" valign="top">
              <div style="font-size:11px; font-weight:700; color:#fff; text-transform:uppercase; margin-bottom:10px;">Connect With Us</div>
              <div style="font-size:12px; line-height:1.9;">
                <a href="https://www.linkedin.com/company/codbegun" style="color:#c5d4ea; text-decoration:none;">LinkedIn</a> ·
                <a href="https://www.instagram.com/codebegun" style="color:#c5d4ea; text-decoration:none;">Instagram</a> ·
                <a href="https://www.youtube.com/@codebegun" style="color:#c5d4ea; text-decoration:none;">YouTube</a><br>
                <span style="color:#a9bcd8;">📞 +91-6301099587<br>✉️ info@codebegun.com</span>
              </div>
            </td>
          </tr></table>
          <div style="border-top:1px solid rgba(255,255,255,.12); margin-top:18px; padding-top:14px; font-size:11px; color:#8fa6c6; line-height:1.7;">
            📍 Registered Office: Plot No.4, Flat No.102, SM Reddy Complex, Madhapur, Hyderabad, Telangana 500081, India.<br>
            © ${gen.getFullYear()} Savas Tech Solution Pvt Ltd. All rights reserved. You're receiving this because you're a student of CodeBegun.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
