require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

let uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
if (uri.includes('@mongodb:')) uri = uri.replace('@mongodb:', '@localhost:');
if (!uri.includes('@')) {
  uri = uri.replace('mongodb://', 'mongodb://admin:password123@');
  uri += uri.includes('?') ? '&authSource=admin' : '?authSource=admin';
}

mongoose.connect(uri).then(async () => {
  const r = await mongoose.connection.collection('leadsourceconfigs').updateMany(
    {},
    { $set: { 'metaAds.config.pageId': '862759496824378' } }
  );
  console.log('✅ pageId updated in', r.modifiedCount, 'document(s)');
  console.log('New pageId: 862759496824378');
  await mongoose.disconnect();
}).catch(e => { console.error('❌', e.message); process.exit(1); });
