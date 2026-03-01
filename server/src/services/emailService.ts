import nodemailer from 'nodemailer';

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

    const mailOptions = {
      from: process.env.EMAIL_FROM || `LMS <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Welcome to LMS - Complete Your Profile!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Welcome to LMS! 🎓</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              You've been invited to join our Learning Management System. To get started, please complete your registration by setting up your password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 40px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                font-size: 16px;
              ">
                Complete Your Registration
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Or copy this link: <a href="${setupLink}" style="color: #667eea;">${setupLink}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't expect this email, please ignore it.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} LMS. All rights reserved.</p>
          </div>
        </div>
      `
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
    const mailOptions = {
      from: process.env.EMAIL_FROM || `LMS <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Request - LMS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px 20px; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px;">Hi <strong>${firstName}</strong>,</p>
            
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              You requested to reset your password. Click the link below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 40px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                font-size: 16px;
              ">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              Or copy this link: <a href="${resetLink}" style="color: #667eea;">${resetLink}</a>
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This link will expire in 1 hour. If you didn't request this, please ignore it.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send reset email');
    }
  }
}
