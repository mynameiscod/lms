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
}
