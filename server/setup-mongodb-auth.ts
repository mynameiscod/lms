import { MongoClient, Db } from 'mongodb';

/**
 * Script to set up MongoDB authentication
 * Usage: npx ts-node setup-mongodb-auth.ts
 */

const MONGODB_HOST = process.env.MONGODB_HOST || 'localhost';
const MONGODB_PORT = process.env.MONGODB_PORT || '27017';
const ADMIN_DB = 'admin';
const LMS_DB = 'lms-saas';
const NEW_USER = 'lms_user';
const NEW_PASSWORD = process.env.MONGO_PASSWORD || 'lms_secure_password_123';

async function setupMongoDBAuth() {
  const connectionUrl = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}`;
  const client = new MongoClient(connectionUrl);

  try {
    console.log('[MongoDB Auth Setup] Connecting to MongoDB...');
    await client.connect();
    console.log('[MongoDB Auth Setup] Connected successfully!');

    const adminDb = client.db(ADMIN_DB);
    const lmsDb = client.db(LMS_DB);

    // Check if user already exists
    try {
      const existingUsers = await adminDb.admin().listUsers();
      const userExists = existingUsers.some(u => u.user === NEW_USER);
      
      if (userExists) {
        console.log(`[MongoDB Auth Setup] User "${NEW_USER}" already exists`);
        // Update password
        console.log(`[MongoDB Auth Setup] Updating password for existing user...`);
        await adminDb.admin().command({
          updateUser: NEW_USER,
          pwd: NEW_PASSWORD,
          db: ADMIN_DB
        });
        console.log(`[MongoDB Auth Setup] Password updated`);
      } else {
        console.log(`[MongoDB Auth Setup] Creating new user "${NEW_USER}"...`);
        
        // Create user with admin and database owner roles
        await adminDb.admin().command({
          createUser: NEW_USER,
          pwd: NEW_PASSWORD,
          roles: [
            { role: 'root', db: ADMIN_DB }
          ]
        });
        console.log(`[MongoDB Auth Setup] User created successfully!`);
      }
    } catch (err: any) {
      if (err.message.includes('command createUser requires authentication')) {
        console.log('[MongoDB Auth Setup] Authentication already enabled');
      } else {
        throw err;
      }
    }

    // Generate connection strings
    const connectionStringNoAuth = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/${LMS_DB}`;
    const connectionStringWithAuth = `mongodb://${NEW_USER}:${encodeURIComponent(NEW_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${LMS_DB}?authSource=admin`;

    console.log('\n' + '='.repeat(70));
    console.log('MONGODB CONNECTION STRINGS');
    console.log('='.repeat(70));
    console.log('\n📌 For MongoDB Compass:\n');
    console.log(`${connectionStringWithAuth}\n`);
    console.log('📌 Connection Details:');
    console.log(`  Host: ${MONGODB_HOST}`);
    console.log(`  Port: ${MONGODB_PORT}`);
    console.log(`  Username: ${NEW_USER}`);
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log(`  Database: ${LMS_DB}`);
    console.log(`  Authentication Database: ${ADMIN_DB}`);
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ MongoDB authentication setup complete!\n');

    // Also show for .env file
    console.log('📝 Add to your .env file for remote access:\n');
    console.log(`MONGODB_URI=${connectionStringWithAuth}\n`);

  } catch (error: any) {
    console.error('[MongoDB Auth Setup] Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('[MongoDB Auth Setup] Connection closed');
  }
}

// Run the setup
setupMongoDBAuth().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
