/**
 * CodeBegun Student Welcome Email Templates
 * Premium HTML email with full Node.js integration and plain text fallback
 */

export interface EmailTemplateData {
  studentName: string;
  setupLink: string;
  mobileNumber?: string;
}

/**
 * Gets the HTML email template
 * Uses inline CSS only for email client compatibility
 */
export function getStudentWelcomeEmailHtml({
  studentName,
  setupLink,
  mobileNumber
}: EmailTemplateData): string {
  const base = 'https://platform.codebegun.com';
  const logoUrl = `${base}/assets/logo.png`;
  const year = new Date().getFullYear();

  const feature = (icon: string, title: string, desc: string) => `
    <td width="20%" valign="top" style="padding: 8px 6px; text-align: center;">
      <div style="width: 46px; height: 46px; line-height: 46px; margin: 0 auto 8px; border-radius: 50%; background: #eaf2fb; font-size: 20px;">${icon}</div>
      <div style="font-size: 13px; font-weight: 700; color: #0b2e63; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 11px; color: #6b7280; line-height: 1.5;">${desc}</div>
    </td>`;

  const product = (icon: string, title: string, desc: string, href: string) => `
    <td width="50%" valign="top" style="padding: 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7fafd; border: 1px solid #e6eef7; border-radius: 12px;">
        <tr><td style="padding: 18px 16px; text-align: center;">
          <div style="font-size: 26px; margin-bottom: 8px;">${icon}</div>
          <div style="font-size: 15px; font-weight: 700; color: #0b2e63; margin-bottom: 6px;">${title}</div>
          <div style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 12px;">${desc}</div>
          <a href="${href}" style="display: inline-block; font-size: 12px; font-weight: 700; color: #ffffff; background: #178ca4; text-decoration: none; padding: 7px 18px; border-radius: 20px;">Explore &rarr;</a>
        </td></tr>
      </table>
    </td>`;

  const stat = (num: string, label: string) => `
    <td valign="top" style="padding: 6px 10px; text-align: center;">
      <div style="font-size: 20px; font-weight: 800; color: #178ca4;">${num}</div>
      <div style="font-size: 11px; color: #52607a; font-weight: 600;">${label}</div>
    </td>`;

  const footLink = (label: string, href: string) => `
    <div style="margin: 0 0 8px;"><a href="${href}" style="color: #c5d4ea; text-decoration: none; font-size: 13px;">${label}</a></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>Welcome to CodeBegun</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">Welcome to CodeBegun — your learning journey begins now!</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2f7;">
        <tr>
            <td align="center" style="padding: 28px 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(11, 46, 99, 0.08);">

                    <!-- LOGO HEADER (white, so the colour logo reads correctly) -->
                    <tr>
                        <td style="padding: 26px 30px 18px; border-bottom: 1px solid #eef2f7;">
                            <img src="${logoUrl}" alt="CodeBegun — Software Training &amp; Career Solutions" width="190" style="display: block; height: auto; border: 0;" />
                        </td>
                    </tr>

                    <!-- HERO -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0a2a5e 0%, #123f86 55%, #1877c7 100%); padding: 40px 34px;">
                            <div style="font-size: 15px; color: #b9d2f0; font-weight: 600; margin-bottom: 4px;">Welcome to</div>
                            <div style="font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; margin-bottom: 10px;">Code<span style="color: #4fd0e6;">Begun</span>!</div>
                            <div style="font-size: 17px; font-weight: 700; color: #ffffff; margin-bottom: 12px;">Your Future. Our Mission. Let's Begin.</div>
                            <div style="font-size: 14px; color: #d7e6f8; line-height: 1.7; max-width: 440px;">
                                We're thrilled to have you on board. CodeBegun is your all-in-one platform to learn, practice, build and grow &mdash; anytime, anywhere.
                            </div>
                            <div style="display: inline-block; margin-top: 18px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.28); color: #ffffff; font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 22px;">
                                🚀 Learn today, Lead tomorrow.
                            </div>
                        </td>
                    </tr>

                    <!-- GREETING -->
                    <tr>
                        <td style="padding: 32px 34px 6px;">
                            <div style="font-size: 20px; font-weight: 700; color: #0b2e63; margin-bottom: 8px;">Hi ${studentName}, 👋</div>
                            ${mobileNumber ? `<div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;"><strong style="color:#374151;">📱 Mobile:</strong> ${mobileNumber}</div>` : ''}
                            <div style="font-size: 15px; color: #4b5563; line-height: 1.7;">
                                Welcome to CodeBegun! 🎉 We're excited to have you join our learning community. Whether you're looking to master new skills, build your portfolio, or prepare for your dream role &mdash; you're in the right place.
                            </div>
                        </td>
                    </tr>

                    <!-- WHY LEARN -->
                    <tr>
                        <td style="padding: 26px 24px 6px;">
                            <div style="text-align: center; font-size: 17px; font-weight: 800; color: #0b2e63; margin-bottom: 4px;">Why Learn with CodeBegun?</div>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e6eef7; border-radius: 14px; margin-top: 14px;">
                                <tr>
                                    ${feature('📚', 'Industry-Relevant', 'Learn the skills top companies actually demand')}
                                    ${feature('🤖', 'AI-Powered Learning', 'Smart recommendations &amp; a personalized plan')}
                                    ${feature('🛠️', 'Hands-on Projects', 'Build real projects &amp; a job-ready portfolio')}
                                    ${feature('📈', 'Progress Tracking', 'Track your growth with insights &amp; reports')}
                                    ${feature('🧑‍💼', 'Placement Support', 'Mock interviews, guidance &amp; hiring network')}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA -->
                    <tr>
                        <td style="padding: 30px 34px 6px; text-align: center;">
                            <div style="font-size: 17px; font-weight: 800; color: #0b2e63; margin-bottom: 6px;">Let's Get You Started</div>
                            <div style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">Set up your password to access your personalized dashboard.</div>
                            <a href="${setupLink}" style="display: inline-block; background: linear-gradient(135deg, #0b5cad 0%, #1877c7 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 15px 44px; border-radius: 30px; box-shadow: 0 8px 18px rgba(24, 119, 199, 0.28);">
                                Setup Your Password &rarr;
                            </a>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 14px;">🔒 This secure link expires in 24 hours.</div>
                            <div style="font-size: 12px; color: #9ca3af; margin-top: 6px;">
                                Prefer social sign-in? Log in with Google, Microsoft, LinkedIn or GitHub at
                                <a href="${base}/login" style="color: #178ca4; text-decoration: none; font-weight: 600;">platform.codebegun.com</a>.
                            </div>
                        </td>
                    </tr>

                    <!-- EXPLORE PRODUCTS -->
                    <tr>
                        <td style="padding: 28px 26px 6px;">
                            <div style="text-align: center; font-size: 17px; font-weight: 800; color: #0b2e63; margin-bottom: 12px;">Explore Our Products</div>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    ${product('💻', 'CodeBegun LMS', 'AI-powered courses, quizzes, assignments &amp; live classes', `${base}/dashboard`)}
                                    ${product('🎤', 'Mock Interviews', 'AI-driven interviews to boost your confidence', `${base}/my-interviews`)}
                                </tr>
                                <tr>
                                    ${product('⌨️', 'Code Playground', 'Practice coding live in our in-browser editor', `${base}/playground`)}
                                    ${product('📄', 'Resume Builder', 'Create a professional resume that gets noticed', `${base}/resume-builder`)}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- QUOTE -->
                    <tr>
                        <td style="padding: 22px 34px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #0a2a5e 0%, #123f86 100%); border-radius: 12px;">
                                <tr><td style="padding: 22px 26px; text-align: center;">
                                    <div style="font-size: 15px; font-style: italic; color: #eaf2fb; line-height: 1.6;">&ldquo;The beautiful thing about learning is nobody can take it away from you.&rdquo;</div>
                                    <div style="font-size: 12px; color: #9cc0ea; font-weight: 700; margin-top: 8px;">&mdash; B.B. King</div>
                                </td></tr>
                            </table>
                        </td>
                    </tr>

                    <!-- STATS -->
                    <tr>
                        <td style="padding: 4px 20px 26px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    ${stat('1000+', 'Students Empowered')}
                                    ${stat('50+', 'Expert Mentors')}
                                    ${stat('100%', 'Real Projects')}
                                    ${stat('24/7', 'Career Support')}
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #0a2445; padding: 32px 30px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td valign="top" style="padding-bottom: 22px;">
                                        <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">CODE<span style="color: #4fd0e6;">BEGUN</span></div>
                                        <div style="font-size: 11px; color: #8fa6c6; margin-top: 4px;">by Savas Tech Solution Pvt Ltd</div>
                                        <div style="font-size: 12px; color: #a9bcd8; line-height: 1.6; margin-top: 10px; max-width: 380px;">Empowering learners with in-demand skills, real-world projects &amp; placement support to build successful careers.</div>
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td width="34%" valign="top">
                                                    <div style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Our Courses</div>
                                                    ${footLink('Full Stack Development', `${base}`)}
                                                    ${footLink('Data Analytics', `${base}`)}
                                                    ${footLink('Data Science', `${base}`)}
                                                    ${footLink('Artificial Intelligence', `${base}`)}
                                                    ${footLink('Cyber Security', `${base}`)}
                                                    ${footLink('UI/UX Design', `${base}`)}
                                                </td>
                                                <td width="33%" valign="top">
                                                    <div style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Quick Links</div>
                                                    ${footLink('Dashboard', `${base}/dashboard`)}
                                                    ${footLink('My Courses', `${base}/my-learning`)}
                                                    ${footLink('Live Classes', `${base}/hms-classes`)}
                                                    ${footLink('Assignments', `${base}/assignments`)}
                                                    ${footLink('Support', 'mailto:info@codebegun.com')}
                                                </td>
                                                <td width="33%" valign="top">
                                                    <div style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Connect With Us</div>
                                                    ${footLink('LinkedIn', 'https://www.linkedin.com/company/codbegun')}
                                                    ${footLink('Instagram', 'https://www.instagram.com/codebegun')}
                                                    ${footLink('YouTube', 'https://www.youtube.com/@codebegun')}
                                                    ${footLink('Website', 'https://codebegun.com')}
                                                    <div style="margin-top: 10px; font-size: 12px; color: #a9bcd8; line-height: 1.7;">
                                                        📞 +91-6301099587<br>
                                                        ✉️ info@codebegun.com
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 22px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.12);">
                                        <div style="font-size: 11px; color: #8fa6c6; line-height: 1.7; padding-top: 14px;">
                                            📍 Registered Office: Plot No.4, Flat No.102, SM Reddy Complex, Madhapur, Hyderabad, Telangana 500081, India.
                                        </div>
                                        <div style="font-size: 11px; color: #6f88ab; line-height: 1.7; margin-top: 10px;">
                                            &copy; ${year} Savas Tech Solution Pvt Ltd. All rights reserved.<br>
                                            You're receiving this email because an account was created for you at CodeBegun. If you did not expect this, you can safely ignore it.
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Gets the plain text version of the email
 */
export function getStudentWelcomeEmailPlainText({
  studentName,
  setupLink,
  mobileNumber
}: EmailTemplateData): string {
  return `WELCOME TO CODEBEGUN

Hi ${studentName},
${mobileNumber ? `\nMobile: ${mobileNumber}\n` : ''}
Welcome to CodeBegun! We're excited to have you join our learning community. Whether you're looking to master new skills, build your portfolio, or prepare for your dream role, you're in the right place.

WHAT YOU GET AT CODEBEGUN:

1. Access Premium Courses - Learn from industry experts with practical, real-world projects
2. Attempt Quizzes & Tests - Assess your knowledge and track progress in real-time
3. Submit Projects & Assignments - Get hands-on experience and build your portfolio
4. Receive Mentorship & Feedback - Get guidance from experienced mentors and participate in mock interviews

SETUP YOUR PASSWORD:

${setupLink}

This link expires in 24 hours.

WHAT HAPPENS NEXT?

1. Click the button above to set your password
2. Complete your profile with your details
3. Connect with mentors and get personalized guidance

SUPPORT:

If you have any questions or need assistance, feel free to reply to this email or reach out to our support team at info@codebegun.com

STAY CONNECTED:

LinkedIn: https://www.linkedin.com/company/codbegun
Instagram: https://www.instagram.com/codebegun
YouTube: https://www.youtube.com/@codebegun
Website: https://codebegun.com

---

CodeBegun
Savas Tech Solution Pvt Ltd
Plot No.4, Flat No.102, SM Reddy Complex
Madhapur, Hyderabad, Telangana 500081
info@codebegun.com
Phone: +91-6301099587 | +91-9063906358

LinkedIn: https://www.linkedin.com/company/codbegun
Instagram: https://www.instagram.com/codebegun
YouTube: https://www.youtube.com/@codebegun
Website: https://codebegun.com

© ${new Date().getFullYear()} CodeBegun. All rights reserved.
If you did not request this account, ignore this email.`;
}

/**
 * Subject line options for A/B testing
 */
export const SUBJECT_LINE_OPTIONS = {
  option1: "Welcome to CodeBegun - Start Your Learning Journey Today",
  option2: "You're Invited to CodeBegun: Set Up Your Account Now",
  option3: "Join CodeBegun - Your Path to Mastery Starts Here",
  option4: "Welcome Aboard! Complete Your CodeBegun Registration"
};

// Default subject line (most effective)
export const DEFAULT_SUBJECT_LINE = SUBJECT_LINE_OPTIONS.option1;

/**
 * Password Reset Email HTML Template
 */
export function getPasswordResetEmailHtml({
  studentName,
  setupLink
}: EmailTemplateData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - CodeBegun</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fb; line-height: 1.6; color: #333;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; margin: 0; padding: 20px 0;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="100%" style="max-width: 650px; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; margin: 0; border-collapse: collapse;">
                    
                    <!-- HEADER -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 40px 30px; text-align: center; color: white;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <p style="margin: 0 0 10px 0; font-size: 28px;">🔐</p>
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Password Reset</h1>
                                        <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.85); font-size: 15px;">CodeBegun</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- BODY -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <!-- Greeting -->
                            <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">Hi ${studentName},</p>

                            <!-- Message -->
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #555; line-height: 1.7;">
                                We received a request to reset your password for your CodeBegun account. Click the button below to create a new password. If you didn't make this request, you can safely ignore this email.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0;">
                                            <tr>
                                                <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 16px 45px; border-radius: 8px; text-align: center;">
                                                    <a href="${setupLink}" style="color: white; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                                                        Reset Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Warning -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; background-color: #fef3f2; padding: 15px; border-radius: 6px; border-left: 4px solid #d32f2f; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 13px; color: #7f2620; margin: 0;">
                                        <strong>Security Notice:</strong> This link expires in 1 hour and can only be used once. Never share this link with anyone.
                                    </td>
                                </tr>
                            </table>

                            <!-- Backup Link -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; background-color: #fafafa; padding: 15px; border-radius: 6px; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 12px; color: #999; margin: 0;">
                                        <strong>Link not working?</strong> Copy and paste this in your browser:<br>
                                        <code style="background-color: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 11px; color: #555; font-family: 'Courier New', monospace;">
                                            ${setupLink}
                                        </code>
                                    </td>
                                </tr>
                            </table>

                            <!-- Action Items -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 25px 0; background-color: #f8f9fb; padding: 15px; border-radius: 6px; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 13px; color: #555; margin: 0;">
                                        <p style="margin: 0 0 10px 0; font-weight: 600; color: #517ff4;">Tips for a Secure Password:</p>
                                        <p style="margin: 0 0 5px 0;">• Use a mix of uppercase, lowercase, numbers, and symbols</p>
                                        <p style="margin: 0 0 5px 0;">• Make it at least 8 characters long</p>
                                        <p style="margin: 0;">• Avoid using personal information or common words</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Support -->
                            <p style="margin: 0 0 20px 0; font-size: 13px; color: #999;">
                                If you didn't request this password reset, please contact our support team immediately at <a href="mailto:infocodebegun@gmail.com" style="color: #517ff4; text-decoration: none;">infocodebegun@gmail.com</a>
                            </p>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                <tr>
                                    <td style="color: white; text-align: center; margin: 0; padding: 0 0 12px 0;">
                                        <p style="margin: 0; font-size: 14px; font-weight: 700;">CodeBegun</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.9); text-align: center; margin: 0; padding: 0 0 10px 0;">
                                        <p style="margin: 0; font-size: 12px;">Savas Tech Solution Pvt Ltd</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.85); text-align: center; margin: 0; padding: 0 0 10px 0;">
                                        <p style="margin: 0; font-size: 11px; line-height: 1.5;">
                                            Plot No.4, Flat No.102, SM Reddy Complex<br>
                                            Madhapur, Hyderabad, Telangana 500081
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: rgba(255,255,255,0.9); text-align: center; margin: 0; padding: 0 0 10px 0;">
                                        <p style="margin:0; font-size:12px;">📞 +91-6301099587 &nbsp;|&nbsp; +91-9063906358</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; padding: 0 0 12px 0;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="padding: 0 8px;"><a href="https://www.linkedin.com/company/codbegun" style="color: rgba(255,255,255,0.9); text-decoration: none; font-size: 12px;">LinkedIn</a></td>
                                                <td style="color: rgba(255,255,255,0.4); font-size: 12px;">|</td>
                                                <td style="padding: 0 8px;"><a href="https://www.instagram.com/codebegun" style="color: rgba(255,255,255,0.9); text-decoration: none; font-size: 12px;">Instagram</a></td>
                                                <td style="color: rgba(255,255,255,0.4); font-size: 12px;">|</td>
                                                <td style="padding: 0 8px;"><a href="https://codebegun.com" style="color: rgba(255,255,255,0.9); text-decoration: none; font-size: 12px;">Website</a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="text-align: center; margin: 0; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
                                        <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.7);">
                                            © ${new Date().getFullYear()} CodeBegun. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Gets the plain text version of the password reset email
 */
export function getPasswordResetEmailPlainText({
  studentName,
  setupLink
}: EmailTemplateData): string {
  return `PASSWORD RESET - CODEBEGUN

Hi ${studentName},

We received a request to reset your password for your CodeBegun account. Click the link below to create a new password. If you didn't make this request, you can safely ignore this email.

RESET PASSWORD:

${setupLink}

This link expires in 1 hour.

SECURITY NOTICE:

This link can only be used once. Never share this link with anyone.

TIPS FOR A SECURE PASSWORD:

• Use a mix of uppercase, lowercase, numbers, and symbols
• Make it at least 8 characters long
• Avoid using personal information or common words

SUPPORT:

If you didn't request this password reset, please contact our support team immediately at infocodebegun@gmail.com

---

CodeBegun
Savas Tech Solution Pvt Ltd
Plot No.4, Flat No.102, SM Reddy Complex
Madhapur, Hyderabad, Telangana 500081
Phone: +91-6301099587 | +91-9063906358

© ${new Date().getFullYear()} CodeBegun. All rights reserved.`;
}

// ─── Tenant Admin Onboarding Email ───────────────────────────────────────────

export interface TenantAdminEmailData {
  adminName: string;
  organizationName: string;
  email: string;
  password: string;
  loginLink: string;
  enabledModules: string[];
}

export function getTenantAdminWelcomeEmailHtml({
  adminName,
  organizationName,
  email,
  password,
  loginLink,
  enabledModules
}: TenantAdminEmailData): string {
  const moduleListHtml = enabledModules.map(m =>
    `<li style="margin:4px 0;color:#374151;">✅ ${m}</li>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Organization is Ready — CodeBegun</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f8f9fb;line-height:1.6;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:620px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;border-collapse:collapse;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,#517ff4 0%,#9234e8 100%);padding:40px 30px;text-align:center;color:#fff;">
            <img src="https://platform.codebegun.com/assets/logo.png" alt="CodeBegun" style="height:44px;display:block;margin:0 auto 10px;" />
            <span style="font-size:22px;font-weight:bold;color:#fff;display:block;">CodeBegun</span>
            <h1 style="margin:16px 0 0;font-size:26px;font-weight:700;">Your Organization is Ready! 🎉</h1>
            <p style="margin:8px 0 0;font-size:15px;opacity:0.9;">Welcome aboard, ${adminName}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${adminName}</strong>,</p>
            <p style="margin:0 0 24px;color:#555;font-size:15px;">
              Your organization <strong>"${organizationName}"</strong> has been set up on 
              <strong>CodeBegun LMS</strong>. You can now log in and start managing your institution.
            </p>

            <!-- Credentials box -->
            <div style="background:#f0f4ff;border:1px solid #d0dbff;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
              <h3 style="margin:0 0 14px;font-size:15px;color:#374151;">🔑 Your Login Credentials</h3>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:4px 0;color:#6b7280;font-size:14px;width:90px;">Email:</td>
                  <td style="padding:4px 0;font-size:14px;font-weight:600;">${email}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6b7280;font-size:14px;">Password:</td>
                  <td style="padding:4px 0;font-size:14px;font-weight:600;letter-spacing:1px;">${password}</td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-size:12px;color:#d97706;">⚠ Please change your password after first login.</p>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${loginLink}" style="display:inline-block;background:linear-gradient(90deg,#517ff4,#9234e8);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                Login to Your Dashboard →
              </a>
              <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">Or copy this link: ${loginLink}</p>
            </div>

            <!-- Enabled modules -->
            ${enabledModules.length > 0 ? `
            <div style="background:#f9fafb;border-radius:8px;padding:18px 22px;margin-bottom:24px;">
              <h3 style="margin:0 0 12px;font-size:15px;color:#374151;">🚀 Modules Enabled for You</h3>
              <ul style="margin:0;padding-left:4px;list-style:none;">
                ${moduleListHtml}
              </ul>
            </div>` : ''}

            <!-- What to do next -->
            <div style="border-left:4px solid #517ff4;padding-left:16px;margin-bottom:24px;">
              <h3 style="margin:0 0 10px;font-size:14px;color:#374151;">📋 Next Steps</h3>
              <ol style="margin:0;padding-left:18px;color:#555;font-size:14px;line-height:1.8;">
                <li>Log in using the credentials above</li>
                <li>Change your password immediately</li>
                <li>Add departments and members</li>
                <li>Configure student features from the admin panel</li>
                <li>Invite students using the Registration Link in your dashboard</li>
              </ol>
            </div>

            <p style="color:#6b7280;font-size:13px;margin:0;">
              Need help? Reach us at 
              <a href="mailto:infocodebegun@gmail.com" style="color:#517ff4;">infocodebegun@gmail.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} CodeBegun · Savas Tech Solution Pvt Ltd · Hyderabad, India
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function getTenantAdminWelcomeEmailPlainText({
  adminName,
  organizationName,
  email,
  password,
  loginLink,
  enabledModules
}: TenantAdminEmailData): string {
  return `Welcome to CodeBegun — ${organizationName} is Ready!

Hi ${adminName},

Your organization "${organizationName}" has been set up on CodeBegun LMS.

LOGIN CREDENTIALS
-----------------
Email:    ${email}
Password: ${password}

⚠ Please change your password after first login.

Login here: ${loginLink}

ENABLED MODULES
---------------
${enabledModules.map(m => `• ${m}`).join('\n')}

NEXT STEPS
----------
1. Log in using the credentials above
2. Change your password immediately
3. Add departments and members
4. Configure student features
5. Invite students via the Registration Link in your dashboard

Need help? Email us at infocodebegun@gmail.com

---
CodeBegun · Savas Tech Solution Pvt Ltd · Hyderabad, India
© ${new Date().getFullYear()} CodeBegun. All rights reserved.`;
}

