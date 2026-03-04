const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Get all quizzes and check their availability
    const quizzes = await db.collection('quizzes').find({}).toArray();
    console.log('QUIZ AVAILABILITY CHECK:\n');
    console.log('Current Date: March 4, 2026');
    console.log('Current UTC Time:', new Date().toLocaleString('en-IN', { timeZone: 'UTC' }), '\n');
    
    const now = new Date();
    
    quizzes.forEach(quiz => {
      console.log(`Quiz: ${quiz.title}`);
      console.log(`  Access: ${quiz.access}`);
      console.log(`  Active: ${quiz.isActive}`);
      console.log(`  Accessible To: ${quiz.accessibleTo}`);
      console.log(`  Date: ${quiz.startDate.toISOString().split('T')[0]}`);
      console.log(`  Time: ${quiz.startTime} - ${quiz.endTime}`);
      
      // Check date
      const startDate = new Date(quiz.startDate);
      const endDate = new Date(quiz.endDate);
      
      if (now < startDate) {
        console.log(`  ❌ Quiz has NOT started yet (starts ${startDate.toDateString()})`);
      } else if (now > endDate) {
        console.log(`  ❌ Quiz has ENDED (ended ${endDate.toDateString()})`);
      } else {
        console.log(`  ✓ Date range is OK`);
      }
      
      console.log('');
    });
    
    mongoose.connection.close();
  });
