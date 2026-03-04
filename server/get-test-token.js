const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    // Create a test JWT token for admin user
    const adminUser = await mongoose.connection.db.collection('users').findOne({ email: 'admin@test.com' });
    
    const token = jwt.sign(
      {
        userId: adminUser._id.toString(),
        email: adminUser.email,
        tenantId: adminUser.tenantId.toString(),
        roles: adminUser.roles
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    console.log('Test Token:', token);
    console.log('User TenantId:', adminUser.tenantId.toString());
    console.log('\nTo test the API, run:');
    console.log(`curl -H "Authorization: Bearer ${token}" -H "Tenant-ID: ${adminUser.tenantId.toString()}" http://localhost:5000/api/v1/quizzes/report/list`);
    
    mongoose.connection.close();
  });
