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
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to CodeBegun</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fb; line-height: 1.6; color: #333;">
    <!-- Main container with background -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fb; margin: 0; padding: 20px 0;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <!-- Content wrapper -->
                <table width="100%" style="max-width: 650px; background-color: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden; margin: 0; border-collapse: collapse;">
                    
                    <!-- HEADER SECTION with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 0;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                <tr>
                                    <td style="padding: 40px 30px; text-align: center; color: white;">
                                        <!-- Logo/Brand -->
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; margin-bottom: 20px;">
                                            <tr>
                                                <td style="font-size: 28px; font-weight: bold; color: white; text-align: center;">
                                                    <span style="font-size: 32px; margin-right: 8px;">🚀</span>CodeBegun
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Title -->
                                        <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 0;">
                                            <tr>
                                                <td style="color: white; text-align: center;">
                                                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to CodeBegun</h1>
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Subtitle -->
                                        <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 12px 0 0 0;">
                                            <tr>
                                                <td style="color: rgba(255, 255, 255, 0.85); text-align: center; font-size: 16px;">
                                                    Your learning journey starts now
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- BODY SECTION -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <!-- Greeting -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 10px 0;">
                                <tr>
                                    <td style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0;">
                                        Hi ${studentName},
                                    </td>
                                </tr>
                            </table>

                            ${mobileNumber ? `
                            <!-- Mobile Number -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
                                <tr>
                                    <td style="font-size: 14px; color: #555; margin: 0;">
                                        <span style="font-weight: 600; color: #374151;">📱 Mobile:</span> ${mobileNumber}
                                    </td>
                                </tr>
                            </table>` : ''}

                            <!-- Welcome Message -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                <tr>
                                    <td style="font-size: 16px; color: #555; line-height: 1.7; margin: 0;">
                                        Welcome to CodeBegun! 🎓 We're excited to have you join our learning community. Whether you're looking to master new skills, build your portfolio, or prepare for your dream role, you're in the right place.
                                    </td>
                                </tr>
                            </table>

                            <!-- What You Can Do -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; border-radius: 8px; border-collapse: collapse;">
                                <tr>
                                    <td style="background-color: #f8f9fb; padding: 20px; border-radius: 8px;">
                                        <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #517ff4; text-transform: uppercase; letter-spacing: 0.5px;">What You Get at CodeBegun</p>
                                        
                                        <!-- Feature 1 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600;">Access Premium Courses</span> - Learn from industry experts with practical, real-world projects
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Feature 2 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600;">Attempt Quizzes & Tests</span> - Assess your knowledge and track progress in real-time
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Feature 3 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600;">Submit Projects & Assignments</span> - Get hands-on experience and build your portfolio
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Feature 4 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600;">Receive Mentorship & Feedback</span> - Get guidance from experienced mentors and participate in mock interviews
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 0;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0;">
                                            <tr>
                                                <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 16px 45px; border-radius: 8px; text-align: center;">
                                                    <a href="${setupLink}" style="color: white; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                                                        Setup Your Password
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Expiration Notice -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; text-align: center;">
                                <tr>
                                    <td style="font-size: 13px; color: #999; margin: 0;">
                                        This link expires in 24 hours. If you didn't request this account, you can safely ignore this email.
                                    </td>
                                </tr>
                            </table>

                            <!-- Backup Link -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; background-color: #fafafa; padding: 15px; border-radius: 6px; border-collapse: collapse;">
                                <tr>
                                    <td style="font-size: 12px; color: #999; margin: 0;">
                                        <strong>Link not working?</strong> Copy and paste this in your browser:<br>
                                        <code style="background-color: #f0f0f0; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 11px; color: #555; font-family: 'Courier New', monospace;">
                                            ${setupLink}
                                        </code>
                                    </td>
                                </tr>
                            </table>

                            <!-- What Happens Next -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
                                <tr>
                                    <td style="margin: 0;">
                                        <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">What Happens Next?</p>
                                        
                                        <!-- Step 1 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600; color: #517ff4;">1.</span> Click the button above to set your password
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Step 2 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600; color: #517ff4;">2.</span> Complete your profile with your details
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Step 3 -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                            <tr>
                                                <td style="font-size: 14px; color: #555; padding: 0;">
                                                    <span style="font-weight: 600; color: #517ff4;">3.</span> Connect with mentors and get personalized guidance
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Support -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; padding-top: 20px; border-top: 1px solid #e8e8e8;">
                                <tr>
                                    <td style="font-size: 14px; color: #555; margin: 0; line-height: 1.7;">
                                        If you have any questions or need assistance, feel free to reply to this email or reach out to our support team at <a href="mailto:info@codebegun.com" style="color: #517ff4; text-decoration: none; font-weight: 500;">info@codebegun.com</a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Social Links -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0; padding: 20px 0; text-align: center; border-top: 1px solid #e8e8e8; border-bottom: 1px solid #e8e8e8;">
                                <tr>
                                    <td style="font-size: 13px; color: #999; margin: 0; margin-bottom: 12px;">
                                        Stay connected with CodeBegun
                                    </td>
                                </tr>
                                <tr>
                                    <td style="margin: 0;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto; text-align: center;">
                                            <tr>
                                                <td style="padding: 0 12px;">
                                                    <a href="https://www.linkedin.com/company/codbegun" style="color: #517ff4; text-decoration: none; font-size: 13px; font-weight: 500;">LinkedIn</a>
                                                </td>
                                                <td style="padding: 0 12px; color: #ddd;">|</td>
                                                <td style="padding: 0 12px;">
                                                    <a href="https://www.instagram.com/codebegun" style="color: #517ff4; text-decoration: none; font-size: 13px; font-weight: 500;">Instagram</a>
                                                </td>
                                                <td style="padding: 0 12px; color: #ddd;">|</td>
                                                <td style="padding: 0 12px;">
                                                    <a href="https://www.youtube.com/@codebegun" style="color: #517ff4; text-decoration: none; font-size: 13px; font-weight: 500;">YouTube</a>
                                                </td>
                                                <td style="padding: 0 12px; color: #ddd;">|</td>
                                                <td style="padding: 0 12px;">
                                                    <a href="https://codebegun.com" style="color: #517ff4; text-decoration: none; font-size: 13px; font-weight: 500;">Website</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER SECTION with Brand Colors -->
                    <tr>
                        <td style="background: linear-gradient(90deg, #517ff4 0%, #9234e8 100%); padding: 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
                                <!-- Company Name -->
                                <tr>
                                    <td style="color: white; text-align: center; margin: 0; padding: 0 0 15px 0;">
                                        <p style="margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -0.3px;">
                                            CodeBegun
                                        </p>
                                    </td>
                                </tr>

                                <!-- Legal Entity -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.9); text-align: center; margin: 0; padding: 0 0 10px 0;">
                                        <p style="margin: 0; font-size: 13px; font-weight: 500;">
                                            Savas Tech Solution Pvt Ltd
                                        </p>
                                    </td>
                                </tr>

                                <!-- Address -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.8); text-align: center; margin: 0; padding: 0 0 15px 0;">
                                        <p style="margin: 0; font-size: 12px; line-height: 1.6;">
                                            Plot No.4, Flat No.102, SM Reddy Complex<br>
                                            Madhapur, Hyderabad, Telangana 500081
                                        </p>
                                    </td>
                                </tr>

                                <!-- Support Email -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.9); text-align: center; margin: 0; padding: 0 0 15px 0;">
                                        <p style="margin: 0; font-size: 12px;">
                                            <a href="mailto:info@codebegun.com" style="color: rgba(255, 255, 255, 0.95); text-decoration: none; font-weight: 500;">
                                                info@codebegun.com
                                            </a>
                                        </p>
                                    </td>
                                </tr>

                                <!-- Copyright & Disclaimer -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.7); text-align: center; margin: 0; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
                                        <p style="margin: 0; font-size: 11px; line-height: 1.6;">
                                            © ${new Date().getFullYear()} CodeBegun. All rights reserved.<br>
                                            If you did not request this account, ignore this email.
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
                                    <td style="color: rgba(255, 255, 255, 0.85); text-align: center; margin: 0; padding: 0 0 12px 0;">
                                        <p style="margin: 0; font-size: 11px; line-height: 1.5;">
                                            Plot No.4, Flat No.102, SM Reddy Complex<br>
                                            Madhapur, Hyderabad, Telangana 500081
                                        </p>
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

© ${new Date().getFullYear()} CodeBegun. All rights reserved.`;
}
