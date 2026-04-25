import nodemailer from 'nodemailer';
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

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private useBrevoApi: boolean = false;

  constructor() {
    console.log('\n📧 [EMAIL SERVICE] Initializing Email Service');
    
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    
    // Configure email transporter based on service type
    if (emailService === 'brevo') {
      // Brevo (formerly Sendinblue) - Use HTTP API
      console.log('   Service Type: Brevo (HTTP API)');
      console.log('   Email From:', process.env.EMAIL_FROM || process.env.EMAIL_USER);
      this.useBrevoApi = true;
      console.log('   Status: ✅ Brevo API Configured\n');
    } else if (emailService === 'smtp') {
      // Custom SMTP configuration (e.g., Ethereal, SendGrid SMTP, etc.)
      console.log('   Service Type: SMTP');
      console.log('   SMTP Host:', process.env.SMTP_HOST);
      console.log('   SMTP Port:', process.env.SMTP_PORT);
      console.log('   Email User:', process.env.EMAIL_USER);
      
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // false for STARTTLS, true for TLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('   Status: ✅ SMTP Transporter Created\n');
    } else {
      // Gmail configuration
      console.log('   Service Type: Gmail');
      console.log('   Email User:', process.env.EMAIL_USER);
      console.log('   Password Length:', (process.env.EMAIL_PASSWORD || '').length, 'characters');
      
      this.transporter = nodemailer.createTransport({
        service: emailService,
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASSWORD || 'your-app-password'
        }
      });
      console.log('   Status: ✅ Gmail Transporter Created\n');
    }
  }

  private async sendViaBrevoApi(to: string, subject: string, htmlContent: string, textContent: string): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM?.match(/^([^<]+)/)?.[1]?.trim() || 'CodeBegun';
    
    console.log('   📤 Brevo API Call:');
    console.log('      From:', fromName, '<' + fromEmail + '>');
    console.log('      To:', to);
    console.log('      Subject:', subject);
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY || '',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
          to: email, subject, html, text
        });
      }
    } catch (err) {
      console.error('❌ sendNewDriveEmail failed:', err);
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
          from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
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
}
