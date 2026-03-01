import 'dotenv/config';
import { EmailService } from './src/services/emailService';

async function testSendToUser() {
  console.log('\n' + '='.repeat(70));
  console.log('📧 TESTING EMAIL SEND TO: gsivaprasad2015@gmail.com');
  console.log('='.repeat(70) + '\n');

  const emailService = new EmailService();

  const testEmail = 'gsivaprasad2015@gmail.com';
  const testName = 'Siva Prasad';
  const testToken = 'ACTUAL_RESET_TOKEN_FROM_DB';
  const setupLink = `http://localhost:3000/setup-password?token=${testToken}&email=${testEmail}`;

  console.log('📊 Configuration:');
  console.log('   Test Email:', testEmail);
  console.log('   Test Name:', testName);
  console.log('   Setup Link:', setupLink);
  console.log('\n' + '-'.repeat(70) + '\n');

  try {
    console.log('🚀 Sending email...\n');
    await emailService.sendWelcomeEmail(testEmail, testName, setupLink);
    
    console.log('-'.repeat(70));
    console.log('\n✅ EMAIL SENT SUCCESSFULLY\n');
    console.log('📧 Details:');
    console.log('   ✓ Email was sent to: gsivaprasad2015@gmail.com');
    console.log('   ✓ Check your Gmail inbox and SPAM folder');
    console.log('   ✓ Email may take 30-60 seconds to arrive\n');
    console.log('⚠️  If NOT received:');
    console.log('   1. Check SPAM/Promotions folder');
    console.log('   2. Check if Gmail is blocking the email');
    console.log('   3. Verify Nodemailer has permission\n');
    
    process.exit(0);
  } catch (error: any) {
    console.log('-'.repeat(70));
    console.log('\n❌ FAILED TO SEND EMAIL\n');
    console.error('Error:', error.message);
    console.log('\nTroubleshoot:');
    console.log('   - Is the app password correct?');
    console.log('   - Is Gmail 2FA enabled?');
    console.log('   - Are there any security blocks?\n');
    
    process.exit(1);
  }
}

testSendToUser();
