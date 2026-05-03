/**
 * Direct Meta Token Updater
 * Usage: node update-meta-token.js <your-EAA-token>
 *
 * This bypasses the LMS UI encryption entirely and stores the token
 * directly (plain text — the decrypt function handles plain tokens fine).
 */

const token = process.argv[2];
if (!token) {
  console.error('Usage: node update-meta-token.js EAAxxxxxxx...');
  console.error('Get the token from: https://developers.facebook.com/tools/explorer/');
  process.exit(1);
}
if (!token.startsWith('EAA')) {
  console.error('❌ Token must start with EAA — you may have copied the wrong value.');
  process.exit(1);
}

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

let MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (MONGO_URI && MONGO_URI.includes('@mongodb:')) {
  MONGO_URI = MONGO_URI.replace('@mongodb:', '@localhost:');
}
if (MONGO_URI && !MONGO_URI.includes('@')) {
  MONGO_URI = MONGO_URI.replace('mongodb://', 'mongodb://admin:password123@') + (MONGO_URI.includes('?') ? '&authSource=admin' : '?authSource=admin');
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  const result = await mongoose.connection.collection('leadsourceconfigs').updateMany(
    {},
    { $set: { 'metaAds.config.pageAccessToken': token } }
  );

  if (result.matchedCount === 0) {
    console.log('❌ No LeadSourceConfig documents found. Create one via LMS Settings first.');
  } else {
    console.log(`✅ Token updated in ${result.modifiedCount} tenant(s). Token starts with: ${token.substring(0, 15)}...`);
    console.log('');
    console.log('Now run: node diagnose-meta-leads.js');
    console.log('Section [4] should show ✅ Token valid');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
