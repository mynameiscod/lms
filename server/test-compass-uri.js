const { MongoClient } = require('mongodb');

const uri = 'mongodb://lms_user:LMS_Compass_Pass_123!@187.124.97.56:27017/lms-saas?authSource=admin';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

(async () => {
  try {
    console.log('Attempting connection with lms_user credentials...');
    await client.connect();
    console.log('✅ Connected successfully!');
   
    const db = client.db('lms-saas');
    const collections = await db.listCollections().toArray();
    console.log('\n✅ MongoDB Compass Connection URI is ready!');
    console.log('\n' + '='.repeat(70));
    console.log('CONNECTION URI FOR MONGODB COMPASS:');
    console.log('='.repeat(70));
    console.log(`${uri}\n`);
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.log('\nTrying to create user now...\n');
  } finally {
    await client.close();
  }
})();
