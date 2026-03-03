const { MongoClient } = require('mongodb');

/**
 * Script to set up MongoDB authentication
 * Usage: node setup-mongodb-auth.js
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

    // Try to create or update user
    try {
      console.log(`[MongoDB Auth Setup] Creating user "${NEW_USER}"...`);
      
      await adminDb.admin().command({
        createUser: NEW_USER,
        pwd: NEW_PASSWORD,
        roles: [
          { role: 'root', db: ADMIN_DB }
        ]
      });
      console.log(`[MongoDB Auth Setup] User created successfully!`);
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`[MongoDB Auth Setup] User "${NEW_USER}" already exists`);
        console.log(`[MongoDB Auth Setup] Updating password...`);
        try {
          await adminDb.admin().command({
            updateUser: NEW_USER,
            pwd: NEW_PASSWORD,
            db: ADMIN_DB
          });
          console.log(`[MongoDB Auth Setup] Password updated`);
        } catch (updateErr) {
          console.log(`[MongoDB Auth Setup] Password update attempted`);
        }
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
    console.log('\nFor MongoDB Compass:\n');
    console.log(`${connectionStringWithAuth}\n`);
    console.log('Connection Details:');
    console.log(`  Host: ${MONGODB_HOST}`);
    console.log(`  Port: ${MONGODB_PORT}`);
    console.log(`  Username: ${NEW_USER}`);
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log(`  Database: ${LMS_DB}`);
    console.log(`  Authentication Database: ${ADMIN_DB}`);
    console.log('\n' + '='.repeat(70));
    console.log('\nMongoDB authentication setup complete!\n');

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('\nTo set up MongoDB authentication on VPS:');
    console.error(`   ssh root@${MONGODB_HOST}`);
    console.error(`   cd ~/lms/server`);
    console.error(`   MONGO_PASSWORD="${NEW_PASSWORD}" node setup-mongodb-auth.js\n`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupMongoDBAuth().catch(console.error);
