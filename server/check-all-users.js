const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    // Get users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('All Users:');
    users.forEach(u => {
      console.log(`  ${u.email} -> Role: ${u.role}`);
    });
    
    mongoose.connection.close();
  });
