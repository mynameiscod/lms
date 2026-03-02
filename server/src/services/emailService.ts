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
      from: process.env.EMAIL_FROM || `Codebegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🚀 Welcome to Codebegun LMS - Ready to Learn?',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px;">🎓 CODEBEGUN</div>
            <div style="font-size: 14px; color: #e8eef7; letter-spacing: 2px;">Learning Management System</div>
          </div>
          
          <!-- Main Content -->
          <div style="background: #ffffff; padding: 40px 30px; border-left: 4px solid #1a73e8; border-right: 4px solid #1a73e8;">
            <p style="color: #1a73e8; font-size: 18px; font-weight: 600; margin-bottom: 20px;">Hello ${firstName}! 👋</p>
            
            <p style="color: #555; font-size: 15px; margin-bottom: 15px;">
              Welcome to <strong>Codebegun LMS</strong>! We're thrilled to have you on board. This is your gateway to world-class learning experiences, expert-led courses, and continuous skill development.
            </p>
            
            <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1a73e8;">
              <p style="color: #1a73e8; font-weight: 600; margin-bottom: 10px;">📝 Next Step: Complete Your Profile</p>
              <p style="color: #555; font-size: 14px; margin: 0;">
                Click the button below to set your password and get instant access to all courses and materials.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${setupLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
                color: white;
                padding: 14px 45px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(26, 115, 232, 0.3);
              ">
                🔐 SET PASSWORD & LOGIN
              </a>
            </div>
            
            <!-- Backup Link -->
            <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0;">
              <strong>Link not working?</strong> Copy and paste in browser:<br/>
              <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${setupLink}</code>
            </p>
            
            <!-- Security Info -->
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
              <p style="color: #856404; font-size: 13px; margin: 0;">
                <strong>🔒 Security Notice:</strong> This link will expire in 24 hours. Never share this email or link with anyone.
              </p>
            </div>
            
            <!-- Feature Highlights -->
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="font-weight: 600; color: #1a73e8; margin-bottom: 12px;">✨ What You Get at Codebegun:</p>
              <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
                <li style="margin-bottom: 8px;">📚 Access to premium courses and learning materials</li>
                <li style="margin-bottom: 8px;">👨‍🏫 Learn from experienced instructors</li>
                <li style="margin-bottom: 8px;">🏆 Track your progress and earn certificates</li>
                <li style="margin-bottom: 8px;">💬 Interactive community and peer support</li>
              </ul>
            </div>
            
            <p style="color: #555; font-size: 14px; margin-top: 25px;">
              Questions? Our support team is here to help. Reply to this email or visit our help center.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #1a1a1a; color: #ffffff; padding: 30px 20px; border-radius: 0 0 10px 10px; text-align: center;">
            <!-- Social Media Links -->
            <div style="margin-bottom: 20px;">
              <p style="font-size: 13px; margin-bottom: 12px; color: #999;">Follow Codebegun</p>
              <div style="display: flex; justify-content: center; gap: 15px;">
                <a href="https://www.linkedin.com/company/codebegun" style="color: #0a66c2; text-decoration: none; font-size: 12px;">LinkedIn</a>
                <a href="https://www.instagram.com/codebegun" style="color: #e1306c; text-decoration: none; font-size: 12px;">Instagram</a>
                <a href="https://www.codebegun.com" style="color: #1a73e8; text-decoration: none; font-size: 12px;">Website</a>
              </div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
            
            <!-- Company Info -->
            <div style="font-size: 12px; color: #999;">
              <p style="margin: 8px 0;">
                <strong>Codebegun Learning Private Limited</strong><br/>
                📧 support@codebegun.com<br/>
                🌐 www.codebegun.com
              </p>
              <p style="margin: 15px 0 0 0; font-size: 11px;">
                © ${new Date().getFullYear()} Codebegun. All rights reserved.<br/>
                <a href="https://www.codebegun.com/privacy" style="color: #666; text-decoration: none;">Privacy Policy</a> | 
                <a href="https://www.codebegun.com/terms" style="color: #666; text-decoration: none;">Terms of Service</a>
              </p>
            </div>
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
      from: process.env.EMAIL_FROM || `Codebegun <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset - Codebegun LMS',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <div style="font-size: 32px; font-weight: bold; color: white; margin-bottom: 10px;">🎓 CODEBEGUN</div>
            <div style="font-size: 14px; color: #e8eef7; letter-spacing: 2px;">Learning Management System</div>
          </div>
          
          <!-- Main Content -->
          <div style="background: #ffffff; padding: 40px 30px; border-left: 4px solid #1a73e8; border-right: 4px solid #1a73e8;">
            <p style="color: #1a73e8; font-size: 18px; font-weight: 600; margin-bottom: 20px;">Password Reset Request 🔐</p>
            
            <p style="color: #555; font-size: 15px; margin-bottom: 15px;">
              Hi ${firstName},
            </p>
            
            <p style="color: #555; font-size: 15px; margin-bottom: 15px;">
              We received a request to reset your password for your Codebegun LMS account. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1a73e8;">
              <p style="color: #1a73e8; font-weight: 600; margin-bottom: 10px;">Click Below to Reset Your Password</p>
              <p style="color: #555; font-size: 14px; margin: 0;">
                You have <strong>1 hour</strong> to reset your password using the link below.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetLink}" style="
                display: inline-block;
                background: linear-gradient(135deg, #d32f2f 0%, #c62828 100%);
                color: white;
                padding: 14px 45px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(211, 47, 47, 0.3);
              ">
                🔐 RESET PASSWORD
              </a>
            </div>
            
            <!-- Backup Link -->
            <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0;">
              <strong>Link not working?</strong> Copy and paste in browser:<br/>
              <code style="background: #f5f5f5; padding: 8px 12px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 11px;">${resetLink}</code>
            </p>
            
            <!-- Security Alert -->
            <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #d32f2f;">
              <p style="color: #c62828; font-size: 13px; margin: 0;">
                <strong>⚠️ Security Alert:</strong> This link expires in 1 hour and can only be used once. Never share this link with anyone. Codebegun staff will never ask for your password.
              </p>
            </div>
            
            <!-- Additional Info -->
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="font-weight: 600; color: #555; margin-bottom: 12px;">🛡️ Protecting Your Account</p>
              <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
                <li style="margin-bottom: 8px;">Use a strong, unique password</li>
                <li style="margin-bottom: 8px;">Enable two-factor authentication if available</li>
                <li style="margin-bottom: 8px;">Never share your login credentials</li>
              </ul>
            </div>
            
            <p style="color: #555; font-size: 14px; margin-top: 25px;">
              If you didn't request this password reset, please contact our support team immediately.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #1a1a1a; color: #ffffff; padding: 30px 20px; border-radius: 0 0 10px 10px; text-align: center;">
            <!-- Social Media Links -->
            <div style="margin-bottom: 20px;">
              <p style="font-size: 13px; margin-bottom: 12px; color: #999;">Follow Codebegun</p>
              <div style="display: flex; justify-content: center; gap: 15px;">
                <a href="https://www.linkedin.com/company/codebegun" style="color: #0a66c2; text-decoration: none; font-size: 12px;">LinkedIn</a>
                <a href="https://www.instagram.com/codebegun" style="color: #e1306c; text-decoration: none; font-size: 12px;">Instagram</a>
                <a href="https://www.codebegun.com" style="color: #1a73e8; text-decoration: none; font-size: 12px;">Website</a>
              </div>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;">
            
            <!-- Company Info -->
            <div style="font-size: 12px; color: #999;">
              <p style="margin: 8px 0;">
                <strong>Codebegun Learning Private Limited</strong><br/>
                📧 support@codebegun.com<br/>
                🌐 www.codebegun.com
              </p>
              <p style="margin: 15px 0 0 0; font-size: 11px;">
                © ${new Date().getFullYear()} Codebegun. All rights reserved.<br/>
                <a href="https://www.codebegun.com/privacy" style="color: #666; text-decoration: none;">Privacy Policy</a> | 
                <a href="https://www.codebegun.com/terms" style="color: #666; text-decoration: none;">Terms of Service</a>
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
