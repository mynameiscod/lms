import nodemailer from 'nodemailer';
import * as settings from './settingsService';
import {
  getStudentWelcomeEmailHtml, 
  getStudentWelcomeEmailPlainText,
  getPasswordResetEmailHtml,
  getPasswordResetEmailPlainText,
  DEFAULT_SUBJECT_LINE,
  getTenantAdminWelcomeEmailHtml,
  getTenantAdminWelcomeEmailPlainText,
  TenantAdminEmailData
} from './emailTemplates';

/** Optional per-send headers (threading + deliverability). */
export interface EmailSendOpts {
  messageId?: string;
  inReplyTo?: string;
  references?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
}

export class EmailService {
  // Optional tenantId → resolves that tenant's own email config (sender/SMTP),
  // falling back to the platform settings and then .env. Built lazily so values
  // set in the Platform Settings UI take effect without a redeploy.
  private tenantId?: string;
  private _transporter: nodemailer.Transporter | null = null;
  private _sig = '';

  constructor(tenantId?: string) {
    this.tenantId = tenantId;
  }

  private cfg(key: string): string {
    return settings.getStr(key, '', this.tenantId);
  }

  private get useBrevoApi(): boolean {
    return (this.cfg('EMAIL_SERVICE') || 'gmail') === 'brevo';
  }

  private fromHeader(): string {
    return this.cfg('EMAIL_FROM') || `CodeBegun <${this.cfg('EMAIL_USER')}>`;
  }

  private get transporter(): nodemailer.Transporter {
    const service = this.cfg('EMAIL_SERVICE') || 'gmail';
    const sig = [service, this.cfg('SMTP_HOST'), this.cfg('SMTP_PORT'), this.cfg('SMTP_SECURE'), this.cfg('EMAIL_USER'), this.cfg('EMAIL_PASSWORD')].join('|');
    if (this._transporter && this._sig === sig) return this._transporter;
    this._sig = sig;

    if (service === 'smtp') {
      this._transporter = nodemailer.createTransport({
        host: this.cfg('SMTP_HOST'),
        port: parseInt(this.cfg('SMTP_PORT') || '587'),
        secure: this.cfg('SMTP_SECURE') === 'true', // false for STARTTLS, true for TLS
        auth: { user: this.cfg('EMAIL_USER'), pass: this.cfg('EMAIL_PASSWORD') },
      });
    } else {
      // Gmail — port 587 with STARTTLS (465 is blocked on most VPS providers).
      this._transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: this.cfg('EMAIL_USER') || 'your-email@gmail.com',
          pass: this.cfg('EMAIL_PASSWORD') || 'your-app-password',
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 15_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      });
    }
    return this._transporter;
  }

  /** Send a plain test email to verify the current (platform or tenant) config. */
  async sendTestEmail(to: string): Promise<void> {
    const subject = '✅ CodeBegun email configuration test';
    const html = `<div style="font-family:Arial,sans-serif"><h2>It works! 🎉</h2><p>Your CodeBegun email configuration is sending correctly.</p><p style="color:#888;font-size:12px">Provider: ${this.cfg('EMAIL_SERVICE') || 'gmail'} · From: ${this.fromHeader()}</p></div>`;
    const text = 'It works! Your CodeBegun email configuration is sending correctly.';
    if (this.useBrevoApi) {
      await this.sendViaBrevoApi(to, subject, html, text);
    } else {
      await this.transporter.sendMail({ from: this.fromHeader(), to, subject, html, text });
    }
  }

  private async sendViaBrevoApi(to: string, subject: string, htmlContent: string, textContent: string, attachments?: { filename: string; content: Buffer }[]): Promise<void> {
    const fromRaw = this.cfg('EMAIL_FROM');
    const fromEmail = fromRaw.match(/<(.+)>/)?.[1] || this.cfg('EMAIL_USER');
    const fromName = fromRaw.match(/^([^<]+)/)?.[1]?.trim() || 'CodeBegun';
    
    console.log('   📤 Brevo API Call:');
    console.log('      From:', fromName, '<' + fromEmail + '>');
    console.log('      To:', to);
    console.log('      Subject:', subject);
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': this.cfg('BREVO_API_KEY'),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        ...(attachments && attachments.length
          ? { attachment: attachments.map(a => ({ name: a.filename, content: a.content.toString('base64') })) }
          : {}),
      })
    });

    const responseData = await response.json() as { message?: string; messageId?: string };
    console.log('      Brevo Response:', response.status, JSON.stringify(responseData));

    if (!response.ok) {
      throw new Error(`Brevo API error: ${responseData.message || response.statusText}`);
    }
    
    console.log('      ✅ Message ID:', responseData.messageId || 'N/A');
  }

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    setupLink: string,
    mobileNumber?: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Welcome Email Request');
    console.log('   Recipient:', email);
    console.log('   Student Name:', firstName);
    console.log('   Setup Link:', setupLink);

    // Generate HTML and plain text versions
    const htmlContent = getStudentWelcomeEmailHtml({
      studentName: firstName,
      setupLink: setupLink,
      mobileNumber
    });

    const plainTextContent = getStudentWelcomeEmailPlainText({
      studentName: firstName,
      setupLink: setupLink,
      mobileNumber
    });

    try {
      console.log('   Status: Sending...');
      
      if (this.useBrevoApi) {
        // Use Brevo HTTP API
        await this.sendViaBrevoApi(email, DEFAULT_SUBJECT_LINE, htmlContent, plainTextContent);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY (Brevo API)');
      } else {
        // Use nodemailer transporter
        const mailOptions = {
          from: this.fromHeader(),
          to: email,
          subject: DEFAULT_SUBJECT_LINE,
          html: htmlContent,
          text: plainTextContent
        };
        const info = await this.transporter!.sendMail(mailOptions);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
      }
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error: any) {
      console.log('   ❌ STATUS: EMAIL SENT FAILED');
      console.error('   Error Code:', error.code);
      console.error('   Error Message:', error.message);
      console.error('   Full Error:', error);
      console.log('📧 [EMAIL SERVICE] Email delivery failed\n');
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  // Generic email sender — used for fee receipts / reminders / outreach.
  // `opts` lets callers control threading (messageId/inReplyTo/references),
  // Reply-To, and custom headers (e.g. List-Unsubscribe) — needed for the
  // partner-outreach conversation + deliverability.
  async sendGenericEmail(
    email: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    attachments?: { filename: string; content: Buffer }[],
    opts?: EmailSendOpts
  ): Promise<boolean> {
    const text = textContent || htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, htmlContent, text, attachments);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: email,
          subject,
          html: htmlContent,
          text,
          ...(attachments && attachments.length ? { attachments: attachments.map(a => ({ filename: a.filename, content: a.content })) } : {}),
          ...(opts?.messageId ? { messageId: opts.messageId } : {}),
          ...(opts?.inReplyTo ? { inReplyTo: opts.inReplyTo } : {}),
          ...(opts?.references ? { references: opts.references } : {}),
          ...(opts?.replyTo ? { replyTo: opts.replyTo } : {}),
          ...(opts?.headers ? { headers: opts.headers } : {}),
        });
      }
      return true;
    } catch (error: any) {
      console.error('[EMAIL SERVICE] sendGenericEmail failed:', error?.message);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetLink: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Password Reset Email Request');
    console.log('   Recipient:', email);
    console.log('   Reset Link:', resetLink);

    // Generate HTML and plain text versions
    const htmlContent = getPasswordResetEmailHtml({
      studentName: firstName,
      setupLink: resetLink
    });

    const plainTextContent = getPasswordResetEmailPlainText({
      studentName: firstName,
      setupLink: resetLink
    });

    const subject = '🔐 Reset Your Password - CodeBegun';

    try {
      console.log('   Status: Sending...');
      
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, htmlContent, plainTextContent);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY (Brevo API)');
      } else {
        const mailOptions = {
          from: this.fromHeader(),
          to: email,
          subject: subject,
          html: htmlContent,
          text: plainTextContent
        };
        await this.transporter!.sendMail(mailOptions);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
      }
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendAttendanceNotificationEmail(
    email: string,
    studentName: string,
    status: 'absent' | 'leave',
    date: Date,
    batchName?: string,
    remarks?: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Attendance Notification Email Request');
    console.log('   Recipient:', email);
    console.log('   Student Name:', studentName);
    console.log('   Status:', status);
    console.log('   Date:', date);

    const statusText = status === 'absent' ? 'ABSENT' : 'ON LEAVE';
    const formattedDate = date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">Attendance Notification</h2>
        </div>
        
        <div style="background: #f9f9f9; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hello <strong>${studentName}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            Your attendance for <strong>${formattedDate}</strong> has been marked as <strong style="color: #d32f2f;">${statusText}</strong>.
          </p>

          <div style="background: white; border-left: 4px solid #667eea; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
            <p style="margin: 0.5rem 0;"><strong>Date:</strong> ${formattedDate}</p>
            ${batchName ? `<p style="margin: 0.5rem 0;"><strong>Batch:</strong> ${batchName}</p>` : ''}
            <p style="margin: 0.5rem 0;"><strong>Status:</strong> <span style="color: #d32f2f; font-weight: bold;">${statusText}</span></p>
            ${remarks ? `<p style="margin: 0.5rem 0;"><strong>Remarks:</strong> ${remarks}</p>` : ''}
          </div>

          <p style="color: #666; line-height: 1.6;">
            If you believe this is an error, please contact your instructor or admin immediately.
          </p>

          <p style="margin-bottom: 0; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 1rem;">
            This is an automated message from CodeBegun Learning Management System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const plainTextContent = `
Attendance Notification

Hello ${studentName},

Your attendance for ${formattedDate} has been marked as ${statusText}.

Details:
Date: ${formattedDate}
${batchName ? `Batch: ${batchName}` : ''}
Status: ${statusText}
${remarks ? `Remarks: ${remarks}` : ''}

If you believe this is an error, please contact your instructor or admin immediately.

This is an automated message from CodeBegun Learning Management System.
    `;

    const subject = `📋 Attendance Marked: ${statusText} - ${formattedDate}`;

    try {
      console.log('   Status: Sending...');
      
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, htmlContent, plainTextContent);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY (Brevo API)');
      } else {
        const mailOptions = {
          from: this.fromHeader(),
          to: email,
          subject: subject,
          html: htmlContent,
          text: plainTextContent
        };
        const info = await this.transporter!.sendMail(mailOptions);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
        console.log('   Message ID:', info.messageId);
      }
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error: any) {
      console.log('   ❌ STATUS: EMAIL SENT FAILED');
      console.error('   Error:', error.message);
      // Don't throw - attendance should be saved even if email fails
      console.log('📧 [EMAIL SERVICE] Email delivery failed (attendance still saved)\n');
    }
  }

  async sendQuizNotificationEmail(
    email: string,
    studentName: string,
    quizTitle: string,
    quizDescription: string | undefined,
    startDate: Date,
    endDate: Date,
    totalTime: number,
    totalMarks: number,
    startTime?: string,
    endTime?: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Quiz Notification Email Request');
    console.log('   Recipient:', email);
    console.log('   Student Name:', studentName);
    console.log('   Quiz Title:', quizTitle);

    const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedEndDate = endDate.toLocaleDateString('en-IN', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Format time from 24h (HH:mm) to 12h (h:mm AM/PM)
    const formatTime = (time: string | undefined): string => {
      if (!time) return '';
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h = hours % 12 || 12;
      return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    const formattedStartTime = formatTime(startTime);
    const formattedEndTime = formatTime(endTime);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const motivationalQuotes = [
      'Every expert was once a beginner. You\'ve got this!',
      'Success is the sum of small efforts repeated day in and day out.',
      'Believe in yourself — you are more prepared than you think!',
      'The only way to do great work is to challenge yourself. Go ace it!',
      'Your potential is limitless. Show what you\'ve learned!'
    ];
    const motivation = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
        
        <!-- Logo / Brand Header -->
        <tr><td style="text-align: center; padding: 24px 0 16px;">
          <span style="font-size: 28px; font-weight: 800; color: #005897; letter-spacing: -0.5px;">Code</span><span style="font-size: 28px; font-weight: 800; color: #f97316; letter-spacing: -0.5px;">Begun</span>
          <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">Learning Management System</p>
        </td></tr>

        <!-- Hero Banner -->
        <tr><td>
          <div style="background: linear-gradient(135deg, #005897 0%, #0369a1 50%, #0284c7 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #ffffff; line-height: 1.3;">New Quiz Assigned!</h1>
            <p style="margin: 8px 0 0; font-size: 15px; color: #bae6fd; font-weight: 400;">Time to showcase your knowledge</p>
          </div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background: #ffffff; padding: 32px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px; font-size: 16px; color: #334155;">Hi <strong style="color: #0f172a;">${studentName}</strong>,</p>
          <p style="margin: 0 0 24px; font-size: 15px; color: #475569; line-height: 1.7;">
            A new quiz has been assigned to you. Review the details below and make sure to attempt it within the scheduled window.
          </p>

          <!-- Quiz Details Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
            <div style="background: linear-gradient(90deg, #005897, #0284c7); padding: 16px 20px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">${quizTitle}</h2>
              ${quizDescription ? `<p style="margin: 6px 0 0; font-size: 13px; color: #bae6fd; line-height: 1.5;">${quizDescription}</p>` : ''}
            </div>
            <div style="padding: 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 8px 0; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Start Date</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">📅 ${formattedStartDate}</p>
                    ${formattedStartTime ? `<p style="margin: 2px 0 0; font-size: 13px; color: #0284c7; font-weight: 600;">🕐 ${formattedStartTime}</p>` : ''}
                  </td>
                  <td width="50%" style="padding: 8px 0; vertical-align: top;">
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">End Date</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">📅 ${formattedEndDate}</p>
                    ${formattedEndTime ? `<p style="margin: 2px 0 0; font-size: 13px; color: #dc2626; font-weight: 600;">🕐 ${formattedEndTime}</p>` : ''}
                  </td>
                </tr>
              </table>

              <div style="border-top: 1px solid #e2e8f0; margin: 12px 0;"></div>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Duration</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">⏱️ ${totalTime} minutes</p>
                  </td>
                  <td width="50%" style="padding: 8px 0;">
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">Total Marks</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #1e293b; font-weight: 600;">🏆 ${totalMarks} marks</p>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Motivation Box -->
          <div style="background: linear-gradient(135deg, #fef3c7, #fff7ed); border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6; font-style: italic;">💪 "${motivation}"</p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 28px 0;">
            <a href="${frontendUrl}/quizzes" 
               style="display: inline-block; background: linear-gradient(135deg, #005897, #0284c7); color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0,88,151,0.3);">
              Start Quiz →
            </a>
          </div>

          <!-- Tips -->
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 8px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #166534;">💡 Quick Tips</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #15803d; line-height: 1.8;">
              <li>Find a quiet place with a stable internet connection</li>
              <li>Read each question carefully before answering</li>
              <li>Keep an eye on the timer and manage your time wisely</li>
              <li>Don't forget to submit before the deadline!</li>
            </ul>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background: #1e293b; border-radius: 0 0 16px 16px; padding: 24px 32px; text-align: center;">
          <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700;">
            <span style="color: #60a5fa;">Code</span><span style="color: #fb923c;">Begun</span>
          </p>
          <p style="margin: 0 0 12px; font-size: 11px; color: #64748b;">Empowering learners, one quiz at a time.</p>
          <p style="margin: 0; font-size: 11px; color: #475569;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    const plainTextContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CodeBegun - New Quiz Assigned!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${studentName},

A new quiz has been assigned to you. Here are the details:

📝 QUIZ: ${quizTitle}
${quizDescription ? `📖 Description: ${quizDescription}\n` : ''}
📅 Start: ${formattedStartDate}${formattedStartTime ? ` at ${formattedStartTime}` : ''}
📅 End:   ${formattedEndDate}${formattedEndTime ? ` at ${formattedEndTime}` : ''}
⏱️  Duration: ${totalTime} minutes
🏆 Total Marks: ${totalMarks}

💪 "${motivation}"

👉 Login to take the quiz: ${frontendUrl}/quizzes

💡 Tips:
  • Find a quiet place with stable internet
  • Read each question carefully
  • Manage your time wisely
  • Submit before the deadline!

— CodeBegun LMS
    `;

    const subject = `📝 New Quiz: ${quizTitle} - Action Required`;

    try {
      console.log('   Status: Sending...');
      
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, htmlContent, plainTextContent);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY (Brevo API)');
      } else {
        const mailOptions = {
          from: this.fromHeader(),
          to: email,
          subject: subject,
          html: htmlContent,
          text: plainTextContent
        };
        const info = await this.transporter!.sendMail(mailOptions);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
        console.log('   Message ID:', info.messageId);
      }
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error: any) {
      console.log('   ❌ STATUS: EMAIL SENT FAILED');
      console.error('   Error:', error.message);
      // Don't throw - quiz creation should succeed even if email fails
      console.log('📧 [EMAIL SERVICE] Email delivery failed (quiz still created)\n');
    }
  }

  async sendAssignmentNotificationEmail(
    email: string,
    studentName: string,
    assignmentTitle: string,
    assignmentType: string,
    description: string | undefined,
    dueDate: Date,
    totalPoints: number,
    difficulty: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Assignment Notification Email Request');
    console.log('   Recipient:', email);
    console.log('   Assignment:', assignmentTitle);
    console.log('   Due Date:', dueDate);

    const formattedDueDate = dueDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const typeEmoji: Record<string, string> = {
      coding: '💻',
      mcq: '📝',
      theory: '📖',
      project: '🚀',
      sql: '🗃️'
    };

    const difficultyColor: Record<string, string> = {
      beginner: '#10b981',
      easy: '#22c55e',
      medium: '#f59e0b',
      hard: '#ef4444',
      expert: '#7c3aed'
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">${typeEmoji[assignmentType] || '📋'} New Assignment Available</h2>
        </div>
        
        <div style="background: #f9f9f9; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hello <strong>${studentName}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            A new assignment has been published for you to complete.
          </p>

          <div style="background: white; border-left: 4px solid #3b82f6; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
            <h3 style="margin: 0 0 1rem 0; color: #1e293b;">${assignmentTitle}</h3>
            ${description ? `<p style="margin: 0.5rem 0; color: #64748b;">${description.substring(0, 200)}${description.length > 200 ? '...' : ''}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0;">
            <p style="margin: 0.5rem 0;"><strong>Type:</strong> <span style="text-transform: capitalize;">${assignmentType}</span></p>
            <p style="margin: 0.5rem 0;"><strong>Difficulty:</strong> <span style="color: ${difficultyColor[difficulty] || '#6b7280'}; font-weight: 600; text-transform: capitalize;">${difficulty}</span></p>
            <p style="margin: 0.5rem 0;"><strong>Points:</strong> ${totalPoints}</p>
            <p style="margin: 0.5rem 0;"><strong>Due Date:</strong> <span style="color: #dc2626;">${formattedDueDate}</span></p>
          </div>

          <div style="text-align: center; margin: 1.5rem 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments" 
               style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Assignment
            </a>
          </div>

          <p style="color: #64748b; line-height: 1.6;">
            Make sure to complete this assignment before the due date to avoid late submission penalties.
          </p>

          <p style="margin-bottom: 0; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 1rem;">
            This is an automated message from CodeBegun Learning Management System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const plainTextContent = `
New Assignment Available

Hello ${studentName},

A new assignment has been published for you to complete.

Assignment Details:
Title: ${assignmentTitle}
Type: ${assignmentType}
Difficulty: ${difficulty}
Points: ${totalPoints}
Due Date: ${formattedDueDate}

${description ? `Description: ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}` : ''}

View your assignment at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/assignments

Make sure to complete this assignment before the due date to avoid late submission penalties.

This is an automated message from CodeBegun Learning Management System.
    `;

    const subject = `${typeEmoji[assignmentType] || '📋'} New Assignment: ${assignmentTitle} - Due ${dueDate.toLocaleDateString()}`;

    try {
      console.log('   Status: Sending...');
      
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, htmlContent, plainTextContent);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY (Brevo API)');
      } else {
        const mailOptions = {
          from: this.fromHeader(),
          to: email,
          subject: subject,
          html: htmlContent,
          text: plainTextContent
        };
        const info = await this.transporter!.sendMail(mailOptions);
        console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
        console.log('   Message ID:', info.messageId);
      }
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error: any) {
      console.log('   ❌ STATUS: EMAIL SENT FAILED');
      console.error('   Error:', error.message);
      // Don't throw - assignment publish should succeed even if email fails
      console.log('📧 [EMAIL SERVICE] Email delivery failed (assignment still published)\n');
    }
  }

  // ─── Placement status alert ──────────────────────────────────────────────────
  async sendPlacementStatusEmail(
    email: string,
    firstName: string,
    companyName: string,
    role: string,
    status: 'shortlisted' | 'selected' | 'placed' | 'rejected'
  ): Promise<void> {
    const statusMeta: Record<string, { emoji: string; color: string; headline: string }> = {
      shortlisted: { emoji: '🎯', color: '#f59e0b', headline: 'You have been Shortlisted!' },
      selected:    { emoji: '✅', color: '#10b981', headline: 'Congratulations — You are Selected!' },
      placed:      { emoji: '🎉', color: '#059669', headline: 'You are Placed! Congratulations!' },
      rejected:    { emoji: '📋', color: '#6b7280', headline: 'Application Status Update' },
    };
    const meta = statusMeta[status] || { emoji: '📋', color: '#6b7280', headline: 'Placement Status Update' };
    const subject = `${meta.emoji} ${meta.headline} — ${companyName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${meta.color}; color: white; padding: 2rem; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${meta.emoji} ${meta.headline}</h2>
        </div>
        <div style="background: #f9f9f9; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p>Hello <strong>${firstName}</strong>,</p>
          <p>Your application for <strong>${role}</strong> at <strong>${companyName}</strong> has been updated.</p>
          <div style="background: white; border-left: 4px solid ${meta.color}; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Company:</strong> ${companyName}</p>
            <p style="margin: 0.5rem 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${meta.color}; font-weight: bold; text-transform: uppercase;">${status}</span></p>
          </div>
          ${status === 'placed' ? '<p style="color: #059669; font-weight: bold;">Welcome aboard! Our team will reach out with next steps.</p>' : ''}
          <p style="color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 1rem; margin-bottom: 0;">
            This is an automated message from CodeBegun LMS. Do not reply.
          </p>
        </div>
      </div>`;
    const text = `${meta.headline}\n\nHello ${firstName},\n\nYour application for ${role} at ${companyName} has been updated.\nStatus: ${status.toUpperCase()}\n\nCodeBegun LMS`;
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, html, text);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: email, subject, html, text
        });
      }
    } catch (err) {
      console.error('❌ sendPlacementStatusEmail failed:', err);
      // Non-fatal — don't throw
    }
  }

  // ─── New placement drive alert ───────────────────────────────────────────────
  async sendNewDriveEmail(
    email: string,
    firstName: string,
    companyName: string,
    role: string,
    applyDeadline: string,
    link: string
  ): Promise<void> {
    const subject = `🚀 New Placement Drive — ${companyName} (${role})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🚀 New Placement Drive</h2>
        </div>
        <div style="background: #f9f9f9; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p>Hello <strong>${firstName}</strong>,</p>
          <p>A new placement drive is open and you may be eligible!</p>
          <div style="background: white; border-left: 4px solid #2563eb; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Company:</strong> ${companyName}</p>
            <p style="margin: 0.5rem 0;"><strong>Role:</strong> ${role}</p>
            <p style="margin: 0;"><strong>Apply by:</strong> ${applyDeadline}</p>
          </div>
          <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: bold;">View Drive &amp; Apply</a>
          <p style="color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 1rem; margin: 1.5rem 0 0;">
            This is an automated message from CodeBegun LMS. Do not reply.
          </p>
        </div>
      </div>`;
    const text = `New Placement Drive — ${companyName} (${role})\n\nHello ${firstName},\nApply by: ${applyDeadline}\n${link}`;
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, html, text);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: email, subject, html, text
        });
      }
    } catch (err) {
      console.error('❌ sendNewDriveEmail failed:', err);
    }
  }

  async sendTechBattleApprovalEmail(opts: {
    email: string;
    name: string;
    quizUrl: string;
    eventTitle: string;
    eventDate?: Date;
    eventTimeIST?: string;
    techBattleUrl?: string;
  }): Promise<void> {
    const { email, name, quizUrl, eventTitle, eventDate, eventTimeIST, techBattleUrl } = opts;
    const firstName = name.split(' ')[0];

    // ── Format display date/time ──────────────────────────────────────────
    const displayDate = eventDate
      ? eventDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      : '';
    const displayTime = eventTimeIST || '';

    // ── Google Calendar link ──────────────────────────────────────────────
    let googleCalUrl = '';
    if (eventDate) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const fmtDate = (d: Date) =>
        `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

      // The date part (year/month/day) is what the admin entered — treat it as IST date.
      // The time comes from eventTimeIST (e.g. "07:00 PM IST"). Parse it and convert to UTC.
      let startUtc: Date;
      if (eventTimeIST) {
        const timeMatch = eventTimeIST.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          if (timeMatch[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
          if (timeMatch[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
          // Combine stored UTC date (which carries the IST calendar date) with IST time,
          // then subtract IST offset (5h30m) to get true UTC.
          const istOffsetMs = 5.5 * 60 * 60 * 1000;
          const year  = eventDate.getUTCFullYear();
          const month = eventDate.getUTCMonth();
          const day   = eventDate.getUTCDate();
          startUtc = new Date(Date.UTC(year, month, day, hours, minutes, 0) - istOffsetMs);
        } else {
          startUtc = eventDate;
        }
      } else {
        startUtc = eventDate;
      }

      const start = fmtDate(startUtc);
      const end   = fmtDate(new Date(startUtc.getTime() + 60 * 60 * 1000)); // +1 hr
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: eventTitle,
        dates: `${start}/${end}`,
        details: `Weekly Tech Battle — solve timed interview questions from top tech companies.\n\nYour quiz link: ${quizUrl}`,
        location: 'Online',
      });
      googleCalUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://platform.codebegun.com';
    const techBattleLink = techBattleUrl || `${frontendUrl}/tech-battle`;
    const logoUrl = 'https://platform.codebegun.com/assets/logo.png';

    const subject = `✓ Registration Confirmed — ${eventTitle}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1a2332;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

  <!-- LOGO HEADER -->
  <tr><td style="background:#ffffff;padding:28px 32px 20px;border-bottom:1px solid #e8edf3;text-align:left;">
    <img src="${logoUrl}" alt="CodeBegun" style="height:44px;width:auto;display:block;" onerror="this.style.display='none'" />
  </td></tr>

  <!-- HERO BODY -->
  <tr><td style="padding:36px 40px 28px;">

    <!-- Badge -->
    <div style="display:inline-block;border:1.5px solid #00b8a9;border-radius:20px;padding:5px 16px;margin-bottom:20px;">
      <span style="color:#00b8a9;font-size:12px;font-weight:700;letter-spacing:1px;">✓ REGISTRATION CONFIRMED</span>
    </div>

    <!-- Headline -->
    <h1 style="margin:0 0 16px;font-size:32px;font-weight:800;color:#0d1b2a;line-height:1.2;">You're in, ${firstName}!</h1>

    <!-- Body copy -->
    <p style="margin:0 0 28px;font-size:16px;color:#4a5568;line-height:1.7;">
      Your spot is confirmed for <strong style="color:#0d1b2a;">${eventTitle}</strong>.
      ${quizUrl
        ? `Your personal quiz link is ready — use the button below to take the quiz when the battle goes live.`
        : `We'll send your quiz link to <strong style="color:#00b8a9;">${email}</strong> right when the battle goes live.`}
      ${displayDate ? `<br><br>See you on <strong style="color:#0d1b2a;">${displayDate}${displayTime ? ` at <strong>${displayTime}</strong>` : ''}</strong>.` : ''}
    </p>

    <!-- Event detail pills -->
    ${(displayDate || displayTime) ? `
    <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        ${displayDate ? `<td style="padding-right:10px;">
          <div style="border:1.5px solid #dbe4f0;border-radius:8px;padding:10px 16px;font-size:14px;color:#2d3748;white-space:nowrap;">
            📅 ${displayDate}
          </div>
        </td>` : ''}
        ${displayTime ? `<td style="padding-right:10px;">
          <div style="border:1.5px solid #dbe4f0;border-radius:8px;padding:10px 16px;font-size:14px;color:#2d3748;white-space:nowrap;">
            🕖 ${displayTime}
          </div>
        </td>` : ''}
        <td>
          <div style="border:1.5px solid #dbe4f0;border-radius:8px;padding:10px 16px;font-size:14px;color:#2d3748;white-space:nowrap;">
            💻 Online
          </div>
        </td>
      </tr>
    </table>` : ''}

    <!-- WHAT TO DO NEXT -->
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8896ab;text-transform:uppercase;">What to do next</p>

    <!-- Step 1 -->
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td width="40" valign="top">
          <div style="width:32px;height:32px;border-radius:50%;background:#0d1b2a;text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#ffffff;">1</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          ${quizUrl
            ? `<p style="margin:0;font-size:15px;color:#1a2332;"><strong>Use your quiz link</strong> — click the button below to open your personal quiz. Keep it safe — it's unique to you.</p>`
            : `<p style="margin:0;font-size:15px;color:#1a2332;"><strong>Watch for the quiz link</strong> — sent to your email &amp; WhatsApp ${displayTime ? `at ${displayTime} sharp` : 'when the battle goes live'}.</p>`}
        </td>
      </tr>
    </table>

    <!-- Step 2 -->
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td width="40" valign="top">
          <div style="width:32px;height:32px;border-radius:50%;background:#00b8a9;text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#ffffff;">2</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <p style="margin:0;font-size:15px;color:#1a2332;"><strong>Solve the timed questions</strong> — real interview questions from top tech companies.</p>
        </td>
      </tr>
    </table>

    <!-- Step 3 -->
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:36px;">
      <tr>
        <td width="40" valign="top">
          <div style="width:32px;height:32px;border-radius:50%;background:#0d1b2a;text-align:center;line-height:32px;font-size:14px;font-weight:700;color:#ffffff;">3</div>
        </td>
        <td style="padding-left:12px;vertical-align:middle;">
          <p style="margin:0;font-size:15px;color:#1a2332;"><strong>Win prizes up to ₹1000</strong> — Myntra vouchers, certificates &amp; a surprise gadget for top 3.</p>
        </td>
      </tr>
    </table>

    <!-- CTA Buttons -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        ${quizUrl ? `
        <td style="padding-right:12px;">
          <a href="${quizUrl}" style="display:inline-block;background:#0d1b2a;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;">
            Open My Quiz Link →
          </a>
        </td>` : `
        <td style="padding-right:12px;">
          <a href="${techBattleLink}" style="display:inline-block;background:#0d1b2a;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;">
            Visit Tech Battle Page →
          </a>
        </td>`}
        ${googleCalUrl ? `
        <td>
          <a href="${googleCalUrl}" style="display:inline-block;background:#ffffff;color:#0d1b2a;padding:14px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;border:1.5px solid #dbe4f0;">
            📅 Add to Calendar
          </a>
        </td>` : ''}
      </tr>
    </table>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#0d1b2a;padding:36px 40px;">

    <!-- Footer Logo -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td>
          <img src="${logoUrl}" alt="CodeBegun" style="height:36px;width:auto;display:block;filter:brightness(0) invert(1);opacity:0.9;" onerror="this.style.display='none'" />
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:12px;color:#8896ab;">Hyderabad-based talent pipeline · Building engineers companies want to hire.</p>

    <!-- Footer columns -->
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;border-top:1px solid #1e3050;padding-top:20px;">
      <tr valign="top">
        <td width="33%" style="padding-right:16px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#8896ab;letter-spacing:1px;text-transform:uppercase;">Programs</p>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.8;">Java Full Stack<br>Python Full Stack<br>Data Science<br>Generative AI</p>
        </td>
        <td width="33%" style="padding-right:16px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#8896ab;letter-spacing:1px;text-transform:uppercase;">Resources</p>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.8;">JavaScript Q&amp;A<br>Java Q&amp;A<br>React Q&amp;A<br>SQL Q&amp;A</p>
        </td>
        <td width="33%">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#8896ab;letter-spacing:1px;text-transform:uppercase;">Contact</p>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.8;">hr@codebegun.com<br>contact@codebegun.com<br>+91 63010 99587<br>Madhapur, Hyderabad</p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:11px;color:#4a5568;border-top:1px solid #1e3050;padding-top:16px;">
      © 2026 CodeBegun · All rights reserved ·
      <a href="${frontendUrl}/privacy" style="color:#8896ab;text-decoration:none;">Privacy</a> ·
      <a href="${frontendUrl}/terms" style="color:#8896ab;text-decoration:none;">Terms</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    const text = `Registration Confirmed — ${eventTitle}

You're in, ${firstName}!

Your spot is confirmed for ${eventTitle}.
${quizUrl ? `\nYour quiz link: ${quizUrl}\n` : ''}
${displayDate ? `Date: ${displayDate}` : ''}
${displayTime ? `Time: ${displayTime}` : ''}
Platform: Online

What to do next:
1. ${quizUrl ? `Use your quiz link: ${quizUrl}` : `Watch for the quiz link — sent to your email at ${displayTime || 'event start'}`}
2. Solve the timed questions — real interview questions from top tech companies.
3. Win prizes up to ₹1000 — Myntra vouchers, certificates & surprise gadget for top 3.

${techBattleLink ? `Visit Tech Battle Page: ${techBattleLink}` : ''}
${googleCalUrl ? `Add to Calendar: ${googleCalUrl}` : ''}

© 2026 CodeBegun | contact@codebegun.com | +91 63010 99587`;

    console.log('\n📧 [EMAIL SERVICE] Tech Battle Approval Email');
    console.log('   Recipient:', email);
    console.log('   Event:', eventTitle);
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(email, subject, html, text);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: email, subject, html, text,
        });
      }
      console.log('   ✅ Tech battle approval email sent\n');
    } catch (err: any) {
      console.error('❌ sendTechBattleApprovalEmail failed:', err.message);
      // Non-fatal — approval still succeeds even if email fails
    }
  }

  async sendTenantAdminWelcomeEmail(data: TenantAdminEmailData): Promise<void> {
    const subject = `🎉 Your Organization "${data.organizationName}" is Ready — CodeBegun`;
    const html = getTenantAdminWelcomeEmailHtml(data);
    const text = getTenantAdminWelcomeEmailPlainText(data);
    console.log('\n📧 [EMAIL SERVICE] Tenant Admin Welcome Email');
    console.log('   Recipient:', data.email);
    console.log('   Organization:', data.organizationName);
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(data.email, subject, html, text);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: data.email,
          subject,
          html,
          text
        });
      }
      console.log('   ✅ Tenant admin welcome email sent\n');
    } catch (err: any) {
      console.error('❌ sendTenantAdminWelcomeEmail failed:', err.message);
      // Don't throw — email failure must not block org creation
    }
  }

  // ─── Mock Interview Invite ────────────────────────────────────────────────────
  async sendInterviewInviteEmail(opts: {
    email: string;
    studentName: string;
    title: string;
    date: string;          // formatted e.g. "25 May 2026"
    time: string;          // e.g. "2:30 PM"
    duration: number;      // minutes
    interviewerName: string;
    venue?: string;
    meetLink?: string;
    criteria: string[];    // criterion labels
    emailSubject: string;
    emailBody: string;     // admin-written description
    calendarLink: string;
  }): Promise<void> {
    const subject = opts.emailSubject || `Interview Scheduled: ${opts.title}`;
    const criteriaList = opts.criteria.map(c => `<li style="margin:4px 0">${c}</li>`).join('');

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f9;margin:0;padding:0">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">📋 Interview Scheduled</h1>
    <p style="color:#bfdbfe;margin:8px 0 0">Hi ${opts.studentName}, your mock interview has been scheduled.</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1e3a5f;margin:0 0 20px;font-size:20px">${opts.title}</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:10px 0;color:#6b7280;width:140px;border-bottom:1px solid #f3f4f6">📅 Date</td><td style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6">${opts.date}</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">⏰ Time</td><td style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6">${opts.time} (${opts.duration} min)</td></tr>
      <tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">👤 Interviewer</td><td style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6">${opts.interviewerName}</td></tr>
      ${opts.venue ? `<tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">📍 Venue</td><td style="padding:10px 0;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6">${opts.venue}</td></tr>` : ''}
      ${opts.meetLink ? `<tr><td style="padding:10px 0;color:#6b7280;border-bottom:1px solid #f3f4f6">🔗 Meet Link</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6"><a href="${opts.meetLink}" style="color:#2563eb">${opts.meetLink}</a></td></tr>` : ''}
    </table>
    ${opts.criteria.length > 0 ? `
    <div style="background:#f0f9ff;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 8px;font-weight:600;color:#1e3a5f">📝 Interview Topics</p>
      <ul style="margin:0;padding-left:20px;color:#374151">${criteriaList}</ul>
    </div>` : ''}
    ${opts.emailBody ? `<div style="color:#374151;line-height:1.7;margin-bottom:24px;white-space:pre-wrap">${opts.emailBody}</div>` : ''}
    <div style="text-align:center;margin:28px 0">
      <a href="${opts.calendarLink}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">📅 Add to Google Calendar</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:20px;text-align:center;color:#9ca3af;font-size:12px">
    <p style="margin:0">This email was sent by CodeBegun LMS. Please do not reply to this email.</p>
  </div>
</div>
</body></html>`;

    const text = `Interview Scheduled: ${opts.title}\n\nHi ${opts.studentName},\n\nDate: ${opts.date}\nTime: ${opts.time} (${opts.duration} min)\nInterviewer: ${opts.interviewerName}\n${opts.venue ? `Venue: ${opts.venue}\n` : ''}${opts.meetLink ? `Meet Link: ${opts.meetLink}\n` : ''}\nTopics: ${opts.criteria.join(', ')}\n\n${opts.emailBody}\n\nAdd to Google Calendar: ${opts.calendarLink}`;

    console.log('\n📧 [EMAIL SERVICE] Interview Invite →', opts.email);
    try {
      if (this.useBrevoApi) {
        await this.sendViaBrevoApi(opts.email, subject, html, text);
      } else {
        await this.transporter!.sendMail({
          from: this.fromHeader(),
          to: opts.email,
          subject,
          html,
          text,
        });
      }
      console.log('   ✅ Interview invite sent to', opts.email);
    } catch (err: any) {
      console.error('❌ sendInterviewInviteEmail failed:', err.message);
      // Non-fatal
    }
  }
}
