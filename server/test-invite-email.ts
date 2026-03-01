import 'dotenv/config';
import { EmailService } from './src/services/emailService';

async function testEmailInvite() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING EMAIL INVITE FLOW');
  console.log('='.repeat(60) + '\n');

  const emailService = new EmailService();

  const testEmail = 'test.student@example.com';
  const testName = 'Test Student';
  const testToken = 'TEST_TOKEN_12345_67890_ABCDEF';
  const setupLink = `http://localhost:3000/setup-password?token=${testToken}&email=${testEmail}`;

  console.log('📊 Test Configuration:');
  console.log('   Test Email:', testEmail);
  console.log('   Test Name:', testName);
  console.log('   Test Token:', testToken);
  console.log('   Setup Link:', setupLink);
  console.log('\n' + '-'.repeat(60) + '\n');

  try {
    console.log('🚀 Sending test welcome email...\n');
    await emailService.sendWelcomeEmail(testEmail, testName, setupLink);
    
    console.log('-'.repeat(60));
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY\n');
    console.log('📧 Email Status: SENT');
    console.log('✓ If you see "✅ STATUS: EMAIL SENT SUCCESSFULLY" above');
    console.log('  the email was delivered to your Gmail inbox\n');
    
    process.exit(0);
  } catch (error: any) {
    console.log('-'.repeat(60));
    console.log('\n❌ TEST FAILED\n');
    console.error('Error Details:', error.message);
    console.error('Full Error:', error);
    console.log('\n⚠️  Common Issues:');
    console.log('  1. Gmail App Password is wrong or has spaces');
    console.log('  2. 2-Factor Authentication not enabled on Gmail');
    console.log('  3. Gmail account has not allowed app access yet\n');
    
    process.exit(1);
  }
}

testEmailInvite();
