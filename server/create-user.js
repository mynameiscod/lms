const { MongoClient, Admin } = require('mongodb');

/**
 * Create MongoDB user without auth required (runs locally, connects to remote)
 * Usage: node create-user.js
 */

const MONGODB_HOST = '187.124.97.56';
const MONGODB_PORT = '27017';
const USERNAME = 'lms_user';
const PASSWORD = 'LMS_Compass_Pass_123!';

async function createUser() {
  // Connect without auth first (assuming auth not yet fully enforced)
  const uri = `mongodb://${MONGODB_HOST}:${MONGODB_PORT}`;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

  try {
    console.log(`[MongoDB] Connecting to ${MONGODB_HOST}:${MONGODB_PORT}...`);
    await client.connect();
    console.log('[MongoDB] Connected!');

    const adminDb = client.db('admin');
    
    try {
      console.log(`[MongoDB] Creating user "${USERNAME}"...`);
      const result = await adminDb.admin().command({
        createUser: USERNAME,
        pwd: PASSWORD,
        roles: [{ role: 'root', db: 'admin' }]
      });
      console.log('[MongoDB] ✅ User created successfully!');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`[MongoDB] User "${USERNAME}" already exists. Updating password...`);
        await adminDb.admin().command({
          updateUser: USERNAME,
          pwd: PASSWORD
        });
        console.log('[MongoDB] ✅ Password updated!');
      } else {
        throw err;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('MongoDB Compass Connection URI:');
    console.log('='.repeat(70));
    console.log(`\nmongodb://${USERNAME}:${encodeURIComponent(PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/lms-saas?authSource=admin\n`);
    console.log('='.repeat(70));
    console.log('Connection Details:');
    console.log(`  Host: ${MONGODB_HOST}:${MONGODB_PORT}`);
    console.log(`  Username: ${USERNAME}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log(`  Auth Database: admin`);
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('[MongoDB] Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createUser().catch(console.error);
