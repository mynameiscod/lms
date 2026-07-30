import { SOCIAL_LINKS, APP_URL, SITE_URL } from '../constants/brand';
import { unsubscribeUrl } from './unsubscribeService';

/**
 * Tech Battle registration-confirmation email.
 *
 * Owner-supplied design, used ONLY for battle registrations — the other emails keep
 * emailTemplates.ts. Kept out of battleController so the markup isn't tangled with
 * request handling.
 *
 * Table-based with inline styles on purpose: Gmail strips <style> in some clients and
 * ignores flex/grid entirely. The <style> block only carries the mobile overrides,
 * which degrade to the desktop layout where unsupported.
 */

export interface BattleEmailData {
  name: string;
  email: string;
  battleTitle: string;
  startAt: Date | string;
  examUrl: string;
  supportUrl?: string;
  unsubscribeUrl?: string;
}

const ist = (d: Date | string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d).toLocaleString('en-IN', { ...opts, timeZone: 'Asia/Kolkata' });

/** Look a social account up by key so the design's brand colours stay, but the URLs
 *  come from the single source of truth rather than being retyped here. */
const social = (key: string) => SOCIAL_LINKS.find(s => s.key === key)?.href || '';

/**
 * One icon = one table cell.
 *
 * These were inline-block anchors separated by margins, which is what threw the row
 * out of alignment: inline-block defaults to `vertical-align:baseline`, so chips
 * carrying different font sizes (10px "WA" next to 14px "f") sat at different
 * heights, and Outlook ignores both `line-height` and `border-radius` on an inline
 * anchor, so the glyphs drifted off-centre inside squares. Cells in a single row are
 * always mutually aligned, in every client. `mso-line-height-rule` makes Outlook
 * honour the 28px line box so each glyph is vertically centred; `text-decoration`
 * kills the underline clients add to bare links, which also skewed the optical row.
 */
const chip = (href: string, label: string, aria: string, bg: string, size: number) =>
  href
    ? `<td style="padding:0 4px; font-size:0; line-height:0;"><a href="${href}" target="_blank" aria-label="${aria}" title="${aria}" style="display:block; width:28px; height:28px; line-height:28px; mso-line-height-rule:exactly; border-radius:50%; background:${bg}; color:#ffffff; text-align:center; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:${size}px; font-weight:700;">${label}</a></td>`
    : '';

const socialRow = (align: 'left' | 'right') =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="${align}" class="social-tbl" style="border-collapse:collapse;"><tr>${[
    chip(social('instagram'), 'IG', 'Instagram', '#e1306c', 11),
    chip(social('linkedin'), 'in', 'LinkedIn', '#0a66c2', 11),
    chip(social('youtube'), '▶', 'YouTube', '#ff0000', 11),
    chip(social('facebook'), 'f', 'Facebook', '#1877f2', 14),
    chip(social('whatsapp'), 'WA', 'WhatsApp', '#25d366', 10),
  ].join('')}</tr></table>`;

export function buildBattleConfirmationEmail(d: BattleEmailData): string {
  const dateStr = ist(d.startAt, { day: 'numeric', month: 'short', year: 'numeric' });
  const weekday = ist(d.startAt, { weekday: 'long' });
  const timeStr = `${ist(d.startAt, { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()} IST`;
  const support = d.supportUrl || 'mailto:support@codebegun.com';
  const unsubscribe = d.unsubscribeUrl || unsubscribeUrl(d.email);
  const logo = 'https://www.codebegun.com/images/logo.png';
  const esc = (s: string) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  const name = esc(d.name);
  const title = esc(d.battleTitle);

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>CodeBegun Tech Battle Registration Confirmed</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    html, body { margin:0 !important; padding:0 !important; width:100% !important; min-width:100% !important; background:#eef4ff; }
    table { border-spacing:0 !important; border-collapse:collapse !important; table-layout:fixed; margin:0 auto !important; }
    img { display:block; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { text-decoration:none; }
    * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
    .mobile-stack, .mobile-stack td { vertical-align:top; }
    @media screen and (max-width:680px) {
      .email-shell { width:100% !important; border-radius:0 !important; }
      .mobile-pad { padding-left:20px !important; padding-right:20px !important; }
      .mobile-stack, .mobile-stack > tbody, .mobile-stack > tbody > tr, .mobile-stack > tbody > tr > td { display:block !important; width:100% !important; max-width:100% !important; box-sizing:border-box !important; }
      .mobile-hide { display:none !important; max-height:0 !important; overflow:hidden !important; }
      .mobile-center { text-align:center !important; }
      .mobile-center img { margin-left:auto !important; margin-right:auto !important; }
      .hero-title { font-size:33px !important; line-height:39px !important; }
      .header-social { padding-top:16px !important; text-align:left !important; }
      /* align="right" floats the icon table; on mobile the header stacks, so it has
         to come back to the left edge under the logo instead of hugging the margin. */
      .header-social .social-tbl { float:left !important; }
      .hero-art-wrap { padding:24px 0 4px !important; }
      .info-col { border-right:0 !important; border-bottom:1px solid #e2e8f4 !important; padding-bottom:18px !important; margin-bottom:18px !important; }
      .exam-button-cell { padding-top:18px !important; }
      .note-cell { padding-bottom:18px !important; }
      .support-button { padding-top:16px !important; text-align:left !important; }
      .course-card { border-right:0 !important; border-bottom:1px solid #e5eaf4 !important; padding:20px 0 !important; }
      .stat-cell { border-right:0 !important; border-bottom:1px solid #dce7ff !important; padding:17px 0 !important; }
      .footer-col { border-right:0 !important; padding:0 0 24px !important; }
      .full-button { width:100% !important; box-sizing:border-box !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#eef4ff;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">
    Your CodeBegun Tech Battle registration is confirmed. Save your personal exam link and join 10 minutes early.
  </div>
  <center role="article" aria-roledescription="email" lang="en" style="width:100%; background:#eef4ff;">
    <table role="presentation" width="100%" bgcolor="#eef4ff" style="width:100%; background:#eef4ff;">
      <tr><td align="center" style="padding:24px 10px;">
        <table role="presentation" width="800" class="email-shell" bgcolor="#ffffff" style="width:800px; max-width:800px; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 18px 55px rgba(14,47,105,.10);">

          <!-- Header -->
          <tr><td class="mobile-pad" style="padding:28px 38px 22px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%;">
              <tr>
                <td width="47%" class="mobile-center" style="width:47%; vertical-align:middle;">
                  <a href="https://www.codebegun.com/" target="_blank" aria-label="Visit CodeBegun">
                    <img src="${logo}" width="235" alt="CodeBegun — Building Skills, Building Futures" style="width:235px; max-width:100%; height:auto;">
                  </a>
                </td>
                <td width="53%" align="right" class="header-social mobile-center" style="width:53%; vertical-align:middle; font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:12px; line-height:16px; font-weight:700; color:#304364; margin-bottom:8px;">Stay Connected</div>
                  ${socialRow('right')}
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Hero -->
          <tr><td class="mobile-pad" style="padding:0 28px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%; background:#f4f7ff; background-image:linear-gradient(120deg,#f4f7ff 0%,#eef3ff 48%,#fbfdff 100%); border-radius:15px;">
              <tr>
                <td width="59%" style="width:59%; padding:42px 20px 42px 34px; font-family:Arial,Helvetica,sans-serif;">
                  <div class="hero-title" style="font-size:39px; line-height:46px; font-weight:800; letter-spacing:-1px; color:#0a2557;">
                    You're All Set!<br><span style="color:#2f66f5;">Tech Battle Awaits</span> 🎉
                  </div>
                  <div style="font-size:15px; line-height:24px; color:#314464; padding-top:13px;">
                    Your spot for <strong>${title}</strong> is confirmed. Get ready to showcase your skills and take a step closer to your dreams.
                  </div>
                </td>
                <td width="41%" align="center" class="hero-art-wrap" style="width:41%; padding:28px 24px 28px 10px;">
                  <table role="presentation" width="230" style="width:230px; max-width:100%;">
                    <tr><td align="center" style="padding:0 0 14px;">
                      <div style="width:108px; height:108px; line-height:108px; margin:0 auto; border-radius:54px; background:#28b6c4; background-image:linear-gradient(135deg,#23c4c3,#2874d9); color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:55px; font-weight:800; box-shadow:0 14px 30px rgba(38,136,204,.24);">&#10003;</div>
                    </td></tr>
                    <tr><td align="center" bgcolor="#344eea" style="padding:18px 12px; border-radius:16px; background:#344eea; background-image:linear-gradient(135deg,#1d72f2,#4931d4); font-family:Arial,Helvetica,sans-serif; color:#ffffff;">
                      <div style="font-size:13px; line-height:18px; font-weight:800; letter-spacing:1.4px;">REGISTRATION</div>
                      <div style="font-size:22px; line-height:28px; font-weight:800;">CONFIRMED</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Greeting -->
          <tr><td class="mobile-pad" style="padding:24px 58px 16px; font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:20px; line-height:27px; font-weight:800; color:#0a2557;">Hi ${name},</div>
            <div style="font-size:15px; line-height:23px; color:#314464; padding-top:5px;">
              Great news! Your registration for <strong>${title}</strong> is confirmed.
            </div>
          </td></tr>

          <!-- Date / Time -->
          <tr><td class="mobile-pad" style="padding:0 58px 22px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%; border:1px solid #dbe3f0; border-radius:13px;">
              <tr>
                <td width="50%" class="info-col" style="width:50%; padding:23px 28px; border-right:1px solid #dbe3f0;">
                  <table role="presentation" width="100%" style="width:100%;"><tr>
                    <td width="65" style="width:65px; vertical-align:middle;">
                      <div style="width:55px; height:55px; line-height:55px; border-radius:50%; background:#f1ebff; color:#4f2ee8; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:25px;">📅</div>
                    </td>
                    <td style="font-family:Arial,Helvetica,sans-serif; vertical-align:middle;">
                      <div style="font-size:13px; line-height:18px; font-weight:700; color:#2a3958;">Exam Date</div>
                      <div style="font-size:20px; line-height:27px; font-weight:800; color:#0a2557; padding-top:3px;">${dateStr}</div>
                      <div style="font-size:13px; line-height:18px; color:#314464;">${weekday}</div>
                    </td>
                  </tr></table>
                </td>
                <td width="50%" style="width:50%; padding:23px 28px;">
                  <table role="presentation" width="100%" style="width:100%;"><tr>
                    <td width="65" style="width:65px; vertical-align:middle;">
                      <div style="width:55px; height:55px; line-height:55px; border-radius:50%; background:#f1ebff; color:#4f2ee8; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:25px;">⏰</div>
                    </td>
                    <td style="font-family:Arial,Helvetica,sans-serif; vertical-align:middle;">
                      <div style="font-size:13px; line-height:18px; font-weight:700; color:#2a3958;">Time to Start</div>
                      <div style="font-size:20px; line-height:27px; font-weight:800; color:#0a2557; padding-top:3px;">${timeStr}</div>
                      <div style="font-size:13px; line-height:18px; color:#314464;">Be on time!</div>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Exam Link -->
          <tr><td class="mobile-pad" style="padding:0 58px 24px;">
            <table role="presentation" width="100%" class="mobile-stack" bgcolor="#f0fff4" style="width:100%; background:#f0fff4; border:1px solid #62d889; border-radius:13px;">
              <tr>
                <td width="57%" style="width:57%; padding:22px 24px;">
                  <table role="presentation" width="100%" style="width:100%;"><tr>
                    <td width="74" style="width:74px; vertical-align:middle;">
                      <div style="width:62px; height:62px; line-height:62px; border-radius:50%; background:#d8f9e2; color:#087d2d; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:30px;">🔗</div>
                    </td>
                    <td style="font-family:Arial,Helvetica,sans-serif; vertical-align:middle;">
                      <div style="font-size:18px; line-height:24px; font-weight:800; color:#087d2d;">Your Personal Exam Link</div>
                      <div style="font-size:13px; line-height:20px; color:#31503b; padding-top:4px;">This link will unlock at the scheduled start time.</div>
                    </td>
                  </tr></table>
                </td>
                <td width="43%" align="center" class="exam-button-cell" style="width:43%; padding:22px 24px 22px 8px; font-family:Arial,Helvetica,sans-serif;">
                  <a href="${d.examUrl}" target="_blank" class="full-button" style="display:inline-block; min-width:218px; padding:15px 20px; border-radius:7px; background:#078c2d; color:#ffffff; font-size:17px; line-height:21px; font-weight:800; text-align:center;">Open My Exam &nbsp; &rarr;</a>
                  <div style="font-size:11px; line-height:17px; color:#31503b; padding-top:9px;">Keep this link private. One attempt. Single device.</div>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Important Notes -->
          <tr><td class="mobile-pad" style="padding:0 58px 8px;">
            <table role="presentation" width="100%" style="width:100%;"><tr>
              <td style="border-top:1px solid #dbe3f0; width:34%;"></td>
              <td align="center" style="width:32%; padding:0 12px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:16px; letter-spacing:1px; font-weight:800; color:#0a2557;">IMPORTANT NOTES</td>
              <td style="border-top:1px solid #dbe3f0; width:34%;"></td>
            </tr></table>
          </td></tr>
          <tr><td class="mobile-pad" style="padding:12px 58px 22px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%;"><tr>
              <td width="25%" align="center" class="note-cell" style="width:25%; padding:0 8px; font-family:Arial,Helvetica,sans-serif;">
                <div style="width:45px; height:45px; line-height:45px; margin:0 auto; border-radius:50%; background:#f2edff; color:#4f2ee8; font-size:22px;">⏰</div>
                <div style="font-size:12px; line-height:17px; color:#1f3458; padding-top:9px;">Join at least<br><strong>10 minutes early</strong></div>
              </td>
              <td width="25%" align="center" class="note-cell" style="width:25%; padding:0 8px; font-family:Arial,Helvetica,sans-serif;">
                <div style="width:45px; height:45px; line-height:45px; margin:0 auto; border-radius:50%; background:#f2edff; color:#4f2ee8; font-size:21px;">📶</div>
                <div style="font-size:12px; line-height:17px; color:#1f3458; padding-top:9px;">Ensure a stable<br><strong>internet connection</strong></div>
              </td>
              <td width="25%" align="center" class="note-cell" style="width:25%; padding:0 8px; font-family:Arial,Helvetica,sans-serif;">
                <div style="width:45px; height:45px; line-height:45px; margin:0 auto; border-radius:50%; background:#f2edff; color:#4f2ee8; font-size:21px;">📱</div>
                <div style="font-size:12px; line-height:17px; color:#1f3458; padding-top:9px;">Use a single device<br><strong>no switching</strong></div>
              </td>
              <td width="25%" align="center" class="note-cell" style="width:25%; padding:0 8px; font-family:Arial,Helvetica,sans-serif;">
                <div style="width:45px; height:45px; line-height:45px; margin:0 auto; border-radius:50%; background:#f2edff; color:#4f2ee8; font-size:20px;">🎯</div>
                <div style="font-size:12px; line-height:17px; color:#1f3458; padding-top:9px;">Avoid distractions<br><strong>and stay focused</strong></div>
              </td>
            </tr></table>
          </td></tr>

          <!-- Support -->
          <tr><td class="mobile-pad" style="padding:0 58px 18px;">
            <table role="presentation" width="100%" class="mobile-stack" bgcolor="#f8f7ff" style="width:100%; background:#f8f7ff; border:1px solid #d8d2ff; border-radius:11px;">
              <tr>
                <td width="62%" style="width:62%; padding:17px 20px; font-family:Arial,Helvetica,sans-serif;">
                  <table role="presentation" width="100%" style="width:100%;"><tr>
                    <td width="55" style="width:55px; vertical-align:middle;"><div style="font-size:32px; line-height:36px;">🎧</div></td>
                    <td style="vertical-align:middle;">
                      <div style="font-size:18px; line-height:23px; font-weight:800; color:#0a2557;">Need Help?</div>
                      <div style="font-size:12px; line-height:18px; color:#314464;">Our support team is here for you.<br>Reach us anytime — we're happy to help.</div>
                    </td>
                  </tr></table>
                </td>
                <td width="38%" align="right" class="support-button" style="width:38%; padding:17px 20px 17px 8px;">
                  <a href="${support}" target="_blank" class="full-button" style="display:inline-block; min-width:190px; padding:13px 18px; border-radius:7px; background:#4a24d8; color:#ffffff; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:19px; font-weight:800; text-align:center;">Contact Support &nbsp; &rarr;</a>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- CareerPilot / LMS -->
          <tr><td class="mobile-pad" style="padding:0 58px 22px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%; background:#fbf5ff; border:1px solid #eadcf8; border-radius:12px;">
              <tr>
                <td width="43%" style="width:43%; padding:20px 18px; font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:16px; line-height:22px; font-weight:800; color:#372397;">Plan Beyond the Battle with <span style="font-size:24px; line-height:30px;">CareerPilot</span> ✨</div>
                  <div style="font-size:12px; line-height:18px; color:#314464; padding-top:7px;">Your AI-powered career companion to discover, assess, plan and advance.</div>
                  <div style="font-size:12px; line-height:19px; color:#314464; padding-top:9px;">
                    <div>&#10003; Discover career paths for your skills</div>
                    <div>&#10003; Assess strengths with AI-driven quizzes</div>
                    <div>&#10003; Get a personalized career roadmap</div>
                    <div>&#10003; Track progress and opportunities</div>
                  </div>
                  <div style="padding-top:13px;">
                    <a href="${APP_URL}/passport/join" target="_blank" style="display:inline-block; padding:11px 17px; border-radius:6px; background:#6a2be2; color:#ffffff; font-size:13px; line-height:17px; font-weight:800;">Explore CareerPilot &nbsp; &rarr;</a>
                  </div>
                </td>
                <td width="22%" align="center" class="mobile-hide" style="width:22%; padding:20px 10px; vertical-align:bottom;">
                  <table role="presentation" width="135" style="width:135px; border:7px solid #121212; border-radius:22px; background:#ffffff; box-shadow:0 8px 22px rgba(32,24,90,.18);">
                    <tr><td style="padding:18px 10px 13px; font-family:Arial,Helvetica,sans-serif;">
                      <div style="font-size:9px; line-height:12px; font-weight:800; color:#0a2557;">Your Career Journey</div>
                      <div style="font-size:8px; line-height:11px; color:#63708a;">Starts Here</div>
                      <table role="presentation" width="100%" style="width:100%; margin-top:11px !important;">
                        <tr>
                          <td align="center" style="padding:6px 2px; background:#f6f3ff; font-size:10px;">🔍<br><span style="font-size:7px;">Discover</span></td>
                          <td align="center" style="padding:6px 2px; background:#f6f3ff; font-size:10px;">📊<br><span style="font-size:7px;">Assess</span></td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:6px 2px; background:#f2fbff; font-size:10px;">📅<br><span style="font-size:7px;">Plan</span></td>
                          <td align="center" style="padding:6px 2px; background:#f2fbff; font-size:10px;">🚀<br><span style="font-size:7px;">Advance</span></td>
                        </tr>
                      </table>
                      <div style="font-size:7px; line-height:10px; font-weight:700; color:#0a2557; padding-top:11px;">Your Progress</div>
                      <div style="height:7px; border-radius:4px; background:#e7ecf5; margin-top:5px;"><div style="width:72%; height:7px; border-radius:4px; background:#20c7b3;"></div></div>
                    </td></tr>
                  </table>
                </td>
                <td width="35%" bgcolor="#241a78" style="width:35%; padding:20px 18px; background:#241a78; background-image:linear-gradient(145deg,#3a1d96,#082e74); border-radius:11px; font-family:Arial,Helvetica,sans-serif; color:#ffffff;">
                  <div style="font-size:18px; line-height:24px; font-weight:800;">Super AI-Powered LMS by CodeBegun</div>
                  <div style="font-size:12px; line-height:18px; color:#e7eaff; padding-top:8px;">Learn smarter. Achieve faster. Our LMS adapts to your learning style with real-time progress tracking.</div>
                  <div style="font-size:12px; line-height:19px; color:#ffffff; padding-top:10px;">
                    <div>&#10003; Adaptive learning paths</div>
                    <div>&#10003; AI-powered doubt assistance</div>
                    <div>&#10003; Real-time progress tracking</div>
                    <div>&#10003; Industry-relevant projects</div>
                  </div>
                  <div style="padding-top:13px;">
                    <a href="${SITE_URL}/" target="_blank" style="display:inline-block; padding:10px 16px; border:1px solid #95b6ff; border-radius:6px; color:#ffffff; font-size:13px; line-height:17px; font-weight:800;">Explore LMS &nbsp; &rarr;</a>
                  </div>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- Courses -->
          <tr><td class="mobile-pad" style="padding:0 58px 8px;">
            <table role="presentation" width="100%" style="width:100%;"><tr>
              <td style="border-top:1px solid #dbe3f0; width:28%;"></td>
              <td align="center" style="width:44%; padding:0 12px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:20px; font-weight:800; color:#0a2557;">Our Most Popular Courses</td>
              <td style="border-top:1px solid #dbe3f0; width:28%;"></td>
            </tr></table>
          </td></tr>
          <tr><td class="mobile-pad" style="padding:0 50px 20px;">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%; border:1px solid #dbe3f0; border-radius:12px;"><tr>
              <td width="25%" class="course-card" style="width:25%; padding:20px 16px; border-right:1px solid #dbe3f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:28px; line-height:32px;">☕</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557; padding-top:8px;">Java Full Stack<br>with AI</div>
                <div style="font-size:10px; line-height:15px; color:#66738b; padding-top:8px;">⏱ 145 Days &nbsp; | &nbsp; Project Based</div>
                <div style="font-size:11px; line-height:17px; color:#314464; padding-top:7px;">Java, Spring Boot, React, databases and DevOps with AI tools.</div>
              </td>
              <td width="25%" class="course-card" style="width:25%; padding:20px 16px; border-right:1px solid #dbe3f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:28px; line-height:32px;">📊</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557; padding-top:8px;">Data Analytics<br>with AI</div>
                <div style="font-size:10px; line-height:15px; color:#66738b; padding-top:8px;">⏱ 120 Days &nbsp; | &nbsp; Hands-on</div>
                <div style="font-size:11px; line-height:17px; color:#314464; padding-top:7px;">Excel, SQL, Python and Power BI to turn data into insights.</div>
              </td>
              <td width="25%" class="course-card" style="width:25%; padding:20px 16px; border-right:1px solid #dbe3f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:28px; line-height:32px;">🧠</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557; padding-top:8px;">Data Science<br>with AI</div>
                <div style="font-size:10px; line-height:15px; color:#66738b; padding-top:8px;">⏱ 155 Days &nbsp; | &nbsp; Industry Projects</div>
                <div style="font-size:11px; line-height:17px; color:#314464; padding-top:7px;">Python, ML and deep learning with real-world datasets.</div>
              </td>
              <td width="25%" class="course-card" style="width:25%; padding:20px 16px; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:28px; line-height:32px;">🤖</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557; padding-top:8px;">Artificial Intelligence</div>
                <div style="font-size:10px; line-height:15px; color:#66738b; padding-top:8px;">⏱ 185 Days &nbsp; | &nbsp; Advanced AI</div>
                <div style="font-size:11px; line-height:17px; color:#314464; padding-top:7px;">NLP, computer vision, LLMs, RAG and AI agent applications.</div>
              </td>
            </tr></table>
          </td></tr>

          <!-- Trust stats -->
          <tr><td class="mobile-pad" style="padding:0 50px 22px;">
            <table role="presentation" width="100%" class="mobile-stack" bgcolor="#f4f7fc" style="width:100%; background:#f4f7fc; border-radius:10px;"><tr>
              <td width="25%" align="center" class="stat-cell" style="width:25%; padding:16px 9px; border-right:1px solid #dce4f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:22px; line-height:25px;">👥</div>
                <div style="font-size:15px; line-height:20px; font-weight:800; color:#0a2557;">12,000+</div>
                <div style="font-size:10px; line-height:14px; color:#53647d;">Students Trained</div>
              </td>
              <td width="25%" align="center" class="stat-cell" style="width:25%; padding:16px 9px; border-right:1px solid #dce4f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:22px; line-height:25px;">🏢</div>
                <div style="font-size:15px; line-height:20px; font-weight:800; color:#0a2557;">60+</div>
                <div style="font-size:10px; line-height:14px; color:#53647d;">Company Network</div>
              </td>
              <td width="25%" align="center" class="stat-cell" style="width:25%; padding:16px 9px; border-right:1px solid #dce4f0; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:22px; line-height:25px;">🎯</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557;">Career Support</div>
                <div style="font-size:10px; line-height:14px; color:#53647d;">Resume, Interview &amp; Guidance</div>
              </td>
              <td width="25%" align="center" class="stat-cell" style="width:25%; padding:16px 9px; font-family:Arial,Helvetica,sans-serif;">
                <div style="font-size:22px; line-height:25px;">👨‍🏫</div>
                <div style="font-size:13px; line-height:18px; font-weight:800; color:#0a2557;">Industry Mentors</div>
                <div style="font-size:10px; line-height:14px; color:#53647d;">Learn from Working Professionals</div>
              </td>
            </tr></table>
          </td></tr>

          <!-- Footer -->
          <tr><td bgcolor="#082f70" class="mobile-pad" style="padding:30px 48px 20px; background:#082f70; background-image:linear-gradient(130deg,#062b67,#073a82);">
            <table role="presentation" width="100%" class="mobile-stack" style="width:100%;"><tr>
              <td width="35%" class="footer-col" style="width:35%; padding:0 24px 0 0; border-right:1px solid rgba(255,255,255,.22); font-family:Arial,Helvetica,sans-serif; color:#ffffff;">
                <a href="https://www.codebegun.com/" target="_blank" aria-label="Visit CodeBegun" style="display:inline-block; padding:9px 12px; background:#ffffff; border-radius:8px;">
                  <img src="${logo}" width="205" alt="CodeBegun — Building Skills, Building Futures" style="width:205px; max-width:100%; height:auto;">
                </a>
                <div style="font-size:10px; line-height:16px; color:#d6e4ff; padding-top:14px;">CodeBegun is a training and education brand owned and operated by Savas Tech Solution Pvt Ltd.</div>
              </td>
              <td width="36%" class="footer-col" style="width:36%; padding:0 24px; border-right:1px solid rgba(255,255,255,.22); font-family:Arial,Helvetica,sans-serif; color:#ffffff;">
                <div style="font-size:12px; line-height:16px; font-weight:800;">Contact Us</div>
                <div style="font-size:9px; line-height:15px; color:#d6e4ff; padding-top:8px;">
                  Plot No.4, Flat No.102, SM Reddy Complex,<br>House No.1-98/8/9/A, Madhapur,<br>Hyderabad, Telangana 500081
                </div>
                <div style="font-size:9px; line-height:16px; color:#d6e4ff; padding-top:6px;">
                  <a href="tel:+916301099587" style="color:#ffffff;">📞 +91 63010 99587</a><br>
                  <a href="mailto:support@codebegun.com" style="color:#ffffff;">✉ support@codebegun.com</a><br>
                  <a href="https://www.codebegun.com/" target="_blank" style="color:#ffffff;">🌐 www.codebegun.com</a>
                </div>
              </td>
              <td width="29%" class="footer-col" style="width:29%; padding:0 0 0 24px; font-family:Arial,Helvetica,sans-serif; color:#ffffff;">
                <div style="font-size:12px; line-height:16px; font-weight:800;">Follow Us</div>
                <div style="padding-top:10px;">${socialRow('left')}</div>
              </td>
            </tr></table>
            <table role="presentation" width="100%" style="width:100%; margin-top:20px !important; border-top:1px solid rgba(255,255,255,.20);"><tr>
              <td style="padding-top:14px; font-family:Arial,Helvetica,sans-serif; font-size:9px; line-height:14px; color:#bed1ef;">
                &copy; ${new Date().getFullYear()} CodeBegun by Savas Tech Solution Pvt Ltd.<br class="mobile-hide"> All rights reserved.
              </td>
              <td align="right" style="padding-top:14px; font-family:Arial,Helvetica,sans-serif; font-size:9px; line-height:14px; color:#bed1ef;">
                <a href="${unsubscribe}" style="color:#bed1ef;">Unsubscribe</a>
                <span style="padding:0 8px;">|</span>
                <a href="https://www.codebegun.com/privacy-policy" target="_blank" style="color:#bed1ef;">Privacy Policy</a>
              </td>
            </tr></table>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </center>
</body>
</html>`;
}
