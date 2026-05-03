require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

let uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
if (uri.includes('@mongodb:')) uri = uri.replace('@mongodb:', '@localhost:');
if (!uri.includes('@')) {
  uri = uri.replace('mongodb://', 'mongodb://admin:password123@');
  uri += uri.includes('?') ? '&authSource=admin' : '?authSource=admin';
}

mongoose.connect(uri).then(async () => {
  // First trim any existing pageId values across all docs
  const docs = await mongoose.connection.collection('leadsourceconfigs').find({}).toArray();
  for (const doc of docs) {
    const existing = doc.metaAds?.config?.pageId || '';
    const trimmed = existing.trim();
    if (existing !== trimmed) {
      console.log(`  Trimming pageId from "${existing}" to "${trimmed}"`);
    }
  }

  const r = await mongoose.connection.collection('leadsourceconfigs').updateMany(
    {},
    { $set: { 'metaAds.config.pageId': '862759496824378' } }
  );
  console.log('✅ pageId updated in', r.modifiedCount, 'document(s)');
  console.log('New pageId: "862759496824378" (no trailing spaces)');
  await mongoose.disconnect();
}).catch(e => { console.error('❌', e.message); process.exit(1); });
