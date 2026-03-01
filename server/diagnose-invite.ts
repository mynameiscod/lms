import 'dotenv/config';
import { EmailService } from './src/services/emailService';
import { UserService } from './src/services/userService';
import mongoose from 'mongoose';

async function diagnoseInvite() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNOSING COMPLETE INVITE EMAIL FLOW');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Check environment
    console.log('📋 Step 1: Checking Email Configuration...');
    console.log('   EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
    console.log('   EMAIL_USER:', process.env.EMAIL_USER);
    console.log('   EMAIL_PASSWORD length:', (process.env.EMAIL_PASSWORD || '').length);
    console.log('   EMAIL_FROM:', process.env.EMAIL_FROM);
    console.log('   ✅ Configuration loaded\n');

    // Step 2: Check MongoDB
    console.log('📋 Step 2: Connecting to MongoDB...');
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not set');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ MongoDB connected\n');

    // Step 3: Test email service
    console.log('📋 Step 3: Testing Email Service...');
    const emailService = new EmailService();
    const testEmail = 'test@example.com';
    const testName = 'Test User';
    const testLink = 'http://localhost:3000/setup-password?token=TEST123&email=test@example.com';
    
    try {
      await emailService.sendWelcomeEmail(testEmail, testName, testLink);
      console.log('   ✅ Email Service Works!\n');
    } catch (emailError: any) {
      console.log('   ❌ Email Service Failed!');
      console.log('   Error:', emailError.message);
      console.log('\n');
      throw emailError;
    }

    console.log('-'.repeat(70));
    console.log('\n✅ DIAGNOSIS COMPLETE - ALL SYSTEMS WORKING\n');
    console.log('Summary:');
    console.log('  ✅ Environment variables loaded');
    console.log('  ✅ MongoDB connected');
    console.log('  ✅ Email service functional');
    console.log('  ✅ Ready to send invites\n');

    console.log('Next Steps:');
    console.log('  1. Go to http://localhost:3000');
    console.log('  2. Login as admin');
    console.log('  3. Users Management → Create New User');
    console.log('  4. Fill in student details');
    console.log('  5. Click "Send Invitation Email"');
    console.log('  6. Email should arrive in inbox\n');

    process.exit(0);
  } catch (error: any) {
    console.log('-'.repeat(70));
    console.log('\n❌ DIAGNOSIS FAILED\n');
    console.error('Error:', error.message);
    console.error('Details:', error);
    console.log('\n⚠️  Check:');
    console.log('  1. Is MongoDB running?');
    console.log('  2. Is Gmail app password correct in .env?');
    console.log('  3. Is 2FA enabled on Gmail account?');
    console.log('  4. Are environment variables loaded?\n');
    
    process.exit(1);
  }
}

diagnoseInvite();
