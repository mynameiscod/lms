const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev';

mongoose.connect(mongoUri)
  .then(async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    // Try all possible collection names
    for (const collName of ['quizattempts', 'quiz_attempts', 'quizAttempt', 'QuizAttempt']) {
      try {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`\nFound ${collName}: ${count} documents`);
          const sample = await db.collection(collName).findOne();
          console.log('Sample:', JSON.stringify(sample, null, 2));
        }
      } catch(e) {}
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
