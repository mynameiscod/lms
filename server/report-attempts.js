const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;

    // Get all quiz attempts grouped by quiz
    const quizzes = await db.collection('quizzes').find({}).toArray();
    console.log('QUIZ REPORT - Attempts Status:\n');
    
    for (const quiz of quizzes) {
      const attempts = await db.collection('quizattempts').find({ quizId: quiz._id.toString() }).toArray();
      if (attempts.length > 0 || quiz.title.includes('002')) {
        console.log(`Quiz: ${quiz.title} (${quiz._id})`);
        console.log(`  Tenant: ${quiz.tenantId}`);
        const statuses = {};
        attempts.forEach(a => {
          statuses[a.status] = (statuses[a.status] || 0) + 1;
        });
        console.log(`  Attempt Statuses:`, statuses);
        console.log(`  Total: ${attempts.length}`);
      }
    }
    
    mongoose.connection.close();
  });
