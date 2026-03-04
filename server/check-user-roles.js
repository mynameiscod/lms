const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    // Get admin user
    const adminUser = await mongoose.connection.db.collection('users').findOne({ email: 'admin@test.com' });
    console.log('Admin User:');
    console.log('  Email:', adminUser.email);
    console.log('  Roles:', adminUser.roles);
    console.log('  TenantId:', adminUser.tenantId);
    
    // Get role details
    for (const roleId of adminUser.roles) {
      const role = await mongoose.connection.db.collection('roles').findOne({ _id: mongoose.Types.ObjectId.isValid(roleId) ? new mongoose.Types.ObjectId(roleId) : roleId });
      if (role) {
        console.log(`\nRole: ${role.name}`);
        console.log('  Permissions:', role.permissions);
      }
    }
    
    mongoose.connection.close();
  });
