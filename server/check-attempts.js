const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;
    const attempts = await db.collection('quizattempts').find({}).toArray();
    console.log('QUIZ ATTEMPTS SUMMARY:');
    console.log('Total attempts:', attempts.length);
    attempts.forEach((a, i) => {
      console.log(`  ${i+1}. Quiz: ${a.quizId}, Status: ${a.status}, Submitted: ${a.submittedAt ? 'Yes' : 'No'}`);
    });
    
    // Group by status
    const byStatus = {};
    attempts.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });
    console.log('\nBy Status:', byStatus);
    
    mongoose.connection.close();
  });
