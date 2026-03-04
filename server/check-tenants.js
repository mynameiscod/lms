const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Get login user and their tenant
    const adminUser = await db.collection('users').findOne({ email: 'admin@test.com' });
    console.log('Admin User TenantId:', adminUser?.tenantId);
    
    // Get Quiz 002 tenant
    const quiz002 = await db.collection('quizzes').findOne({ _id: new (require('mongodb').ObjectId)('69a8391864ad5f28809953b9') });
    console.log('Quiz 002 TenantId:', quiz002?.tenantId);
    
    // List all unique tenant IDs
    const tenants = await db.collection('tenants').find({}).toArray();
    console.log('\nAll Tenants:');
    tenants.forEach(t => {
      console.log(`  ${t.name} (${t._id})`);
    });
    
    // Check which tenant owns each quiz
    const quizzes = await db.collection('quizzes').find({}).toArray();
    console.log('\nQuizzes by Tenant:');
    quizzes.forEach(q => {
      console.log(`  ${q.title} -> TenantId: ${q.tenantId}`);
    });
    
    mongoose.connection.close();
  });
