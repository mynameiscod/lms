import { MongoClient } from 'mongodb';

/**
 * Quick script to test MongoDB connection and generate Compass URI
 * Run: npx ts-node generate-mongodb-uri.ts
 */

const VPS_IP = '187.124.97.56';
const MONGODB_PORT = '27017';
const LMS_DB = 'lms-saas';
const USERNAME = 'lms_user';
const PASSWORD = process.env.MONGO_PASSWORD || 'LMS_Compass_Pass_123!';

async function generateURI() {
  // Try to connect to VPS MongoDB
  const connectionUrl = `mongodb://${VPS_IP}:${MONGODB_PORT}`;
  const client = new MongoClient(connectionUrl, { serverSelectionTimeoutMS: 5000 });

  try {
    console.log(`\n🔍 Attempting to connect to MongoDB at ${VPS_IP}:${MONGODB_PORT}...\n`);
    await client.connect();
    console.log('✅ Connected to MongoDB!\n');

    const adminDb = client.db('admin');
    
    // Try to list users
    try {
      const result = await adminDb.admin().command({ usersInfo: 1 } as any);
      console.log('📋 Existing MongoDB users:');
      result.users.forEach((u: any) => console.log(`   - ${u.user}`));
      console.log();
    } catch (err: any) {
      if (err.message.includes('authentication')) {
        console.log('⚠️  MongoDB authentication is enabled (expected)\n');
      }
    }

    // Generate connection strings
    const compassUri = `mongodb://${USERNAME}:${encodeURIComponent(PASSWORD)}@${VPS_IP}:${MONGODB_PORT}/${LMS_DB}?authSource=admin`;
    const nodeUri = `mongodb://${USERNAME}:${PASSWORD}@${VPS_IP}:${MONGODB_PORT}/${LMS_DB}?authSource=admin`;

    console.log('═'.repeat(80));
    console.log('MONGODB COMPASS CONNECTION URI');
    console.log('═'.repeat(80));
    console.log(`\n${compassUri}\n`);
    console.log('═'.repeat(80));
    console.log('CONNECTION DETAILS');
    console.log('═'.repeat(80));
    console.log(`  Host:          ${VPS_IP}`);
    console.log(`  Port:          ${MONGODB_PORT}`);
    console.log(`  Username:      ${USERNAME}`);
    console.log(`  Password:      ${PASSWORD}`);
    console.log(`  Database:      ${LMS_DB}`);
    console.log(`  Auth Database: admin`);
    console.log('═'.repeat(80));
    console.log('\n✨ To use in MongoDB Compass:');
    console.log('1. Open MongoDB Compass');
    console.log('2. Click "New Connection"');
    console.log('3. Paste the URI above');
    console.log('4. Click Connect\n');

  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    console.log('\n📝 To set up MongoDB authentication on VPS:');
    console.log(`   ssh root@${VPS_IP}`);
    console.log(`   cd /root/lms-saas/server`);
    console.log(`   MONGO_PASSWORD="${PASSWORD}" npx ts-node setup-mongodb-auth.ts\n`);
  } finally {
    await client.close();
  }
}

generateURI().catch(console.error);
