const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Find attempts for Quiz 002
    const quizId = '69a8391864ad5f28809953b9';
    const attempts = await db.collection('quizattempts').find({ quizId: quizId }).toArray();
    
    console.log('Attempts for Quiz 002:');
    console.log('Total:', attempts.length);
    attempts.forEach((a, i) => {
      console.log(`  ${i+1}. Status: ${a.status}, TenantId: ${a.tenantId}, Submitted: ${a.submittedAt ? 'Yes' : 'No'}`);
    });
    
    // Also check all quizzes and their attempt counts
    console.log('\nAll Quizzes and Attempts:');
    const quizzes = await db.collection('quizzes').find({}).toArray();
    for (const quiz of quizzes) {
      const count = await db.collection('quizattempts').countDocuments({ quizId: quiz._id.toString() });
      if (count > 0) {
        console.log(`  ${quiz.title} (${quiz._id}): ${count} attempts`);
      }
    }
    
    mongoose.connection.close();
  });
