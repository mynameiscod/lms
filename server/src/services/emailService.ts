import nodemailer from 'nodemailer';
import { 
  getStudentWelcomeEmailHtml, 
  getStudentWelcomeEmailPlainText,
  getPasswordResetEmailHtml,
  getPasswordResetEmailPlainText,
  DEFAULT_SUBJECT_LINE 
} from './emailTemplates';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log('\n📧 [EMAIL SERVICE] Initializing Email Service');
    
    // Configure email transporter
    if (process.env.EMAIL_SERVICE === 'smtp') {
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
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASSWORD || 'your-app-password'
        }
      });
      console.log('   Status: ✅ Gmail Transporter Created\n');
    }
  }

  async sendWelcomeEmail(
    email: string,
    firstName: string,
    setupLink: string
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Welcome Email Request');
    console.log('   Recipient:', email);
    console.log('   Student Name:', firstName);
    console.log('   Setup Link:', setupLink);

    // Generate HTML and plain text versions
    const htmlContent = getStudentWelcomeEmailHtml({
      studentName: firstName,
      setupLink: setupLink
    });

    const plainTextContent = getStudentWelcomeEmailPlainText({
      studentName: firstName,
      setupLink: setupLink
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: DEFAULT_SUBJECT_LINE,
      html: htmlContent,
      text: plainTextContent
    };

    try {
      console.log('   Status: Sending...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
      console.log('   Message ID:', info.messageId);
      console.log('   Response:', info.response);
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Reset Your Password - CodeBegun',
      html: htmlContent,
      text: plainTextContent
    };

    try {
      console.log('   Status: Sending...');
      await this.transporter.sendMail(mailOptions);
      console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
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

    const mailOptions = {
      from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `📋 Attendance Marked: ${statusText} - ${formattedDate}`,
      html: htmlContent,
      text: plainTextContent
    };

    try {
      console.log('   Status: Sending...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
      console.log('   Message ID:', info.messageId);
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
    totalMarks: number
  ): Promise<void> {
    console.log('\n📧 [EMAIL SERVICE] Quiz Notification Email Request');
    console.log('   Recipient:', email);
    console.log('   Student Name:', studentName);
    console.log('   Quiz Title:', quizTitle);

    const formattedStartDate = startDate.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedEndDate = endDate.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #005897 0%, #0077cc 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 24px;">📝 New Quiz Available!</h2>
        </div>
        
        <div style="background: #f9f9f9; padding: 2rem; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hello <strong>${studentName}</strong>,</p>
          
          <p style="color: #666; line-height: 1.6;">
            A new quiz has been assigned to you. Please complete it before the deadline.
          </p>

          <div style="background: white; border-left: 4px solid #005897; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
            <h3 style="margin: 0 0 1rem 0; color: #005897;">${quizTitle}</h3>
            ${quizDescription ? `<p style="margin: 0.5rem 0; color: #666;">${quizDescription}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 1rem 0;">
            <p style="margin: 0.5rem 0;"><strong>📅 Available From:</strong> ${formattedStartDate}</p>
            <p style="margin: 0.5rem 0;"><strong>⏰ Deadline:</strong> ${formattedEndDate}</p>
            <p style="margin: 0.5rem 0;"><strong>⏱️ Duration:</strong> ${totalTime} minutes</p>
            <p style="margin: 0.5rem 0;"><strong>📊 Total Marks:</strong> ${totalMarks}</p>
          </div>

          <p style="color: #666; line-height: 1.6;">
            Log in to your account to start the quiz. Make sure to complete it before the deadline!
          </p>

          <div style="text-align: center; margin: 2rem 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/quizzes" 
               style="background: #005897; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Quizzes
            </a>
          </div>

          <p style="margin-bottom: 0; color: #999; font-size: 12px; border-top: 1px solid #e0e0e0; padding-top: 1rem;">
            This is an automated message from CodeBegun Learning Management System. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    const plainTextContent = `
New Quiz Available!

Hello ${studentName},

A new quiz has been assigned to you. Please complete it before the deadline.

Quiz Details:
Title: ${quizTitle}
${quizDescription ? `Description: ${quizDescription}` : ''}
Available From: ${formattedStartDate}
Deadline: ${formattedEndDate}
Duration: ${totalTime} minutes
Total Marks: ${totalMarks}

Log in to your account to start the quiz. Make sure to complete it before the deadline!

This is an automated message from CodeBegun Learning Management System.
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `CodeBegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `📝 New Quiz: ${quizTitle} - Action Required`,
      html: htmlContent,
      text: plainTextContent
    };

    try {
      console.log('   Status: Sending...');
      const info = await this.transporter.sendMail(mailOptions);
      console.log('   ✅ STATUS: EMAIL SENT SUCCESSFULLY');
      console.log('   Message ID:', info.messageId);
      console.log('📧 [EMAIL SERVICE] Email delivery complete\n');
    } catch (error: any) {
      console.log('   ❌ STATUS: EMAIL SENT FAILED');
      console.error('   Error:', error.message);
      // Don't throw - quiz creation should succeed even if email fails
      console.log('📧 [EMAIL SERVICE] Email delivery failed (quiz still created)\n');
    }
  }
}
