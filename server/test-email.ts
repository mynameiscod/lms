import 'dotenv/config';
import { EmailService } from './src/services/emailService';

async function testEmail() {
  try {
    console.log('🧪 Testing Email Service...');
    console.log('Email Config:');
    console.log('  Service:', process.env.EMAIL_SERVICE);
    console.log('  User:', process.env.EMAIL_USER);
    console.log('  Host:', process.env.SMTP_HOST);
    console.log('  Port:', process.env.SMTP_PORT);
    console.log('');
    
    const emailService = new EmailService();
    
    console.log('📧 Sending test email...');
    await emailService.sendWelcomeEmail(
      'test@example.com',
      'Test Student',
      'http://localhost:3000/setup-password?token=test123&email=test@example.com'
    );
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Check Ethereal: https://ethereal.email/messages');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Email failed to send:');
    console.error(error.message);
    process.exit(1);
  }
}

testEmail();
