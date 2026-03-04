const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas-dev')
  .then(async () => {
    const db = mongoose.connection.db;
    
    // Get all quizzes and check their availability with detailed time info
    const quizzes = await db.collection('quizzes').find({}).toArray();
    console.log('DETAILED QUIZ AVAILABILITY CHECK:\n');
    
    const now = new Date();
    console.log('Current Time (UTC):', now.toISOString());
    console.log('Current Time (IST):', new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString(), '\n');
    
    quizzes.forEach(quiz => {
      console.log(`Quiz: ${quiz.title}`);
      
      const startDateUTC = new Date(quiz.startDate);
      const endDateUTC = new Date(quiz.endDate);
      const [startHour, startMin] = quiz.startTime.split(':').map(Number);
      const [endHour, endMin] = quiz.endTime.split(':').map(Number);
      
      // Build start datetime (assuming IST)
      const startDateTime = new Date(
        startDateUTC.getUTCFullYear(),
        startDateUTC.getUTCMonth(),
        startDateUTC.getUTCDate(),
        startHour,
        startMin,
        0,
        0
      );
      const startDateTimeUTC = new Date(startDateTime.getTime() - (5.5 * 60 * 60 * 1000));
      
      // Build end datetime
      const endDateTime = new Date(
        endDateUTC.getUTCFullYear(),
        endDateUTC.getUTCMonth(),
        endDateUTC.getUTCDate(),
        endHour,
        endMin,
        59,
        999
      );
      const endDateTimeUTC = new Date(endDateTime.getTime() - (5.5 * 60 * 60 * 1000));
      
      console.log(`  Start: ${quiz.startDate.toISOString().split('T')[0]} at ${quiz.startTime} IST`);
      console.log(`  End:   ${quiz.endDate.toISOString().split('T')[0]} at ${quiz.endTime} IST`);
      console.log(`  Start (UTC): ${startDateTimeUTC.toISOString()}`);
      console.log(`  End   (UTC): ${endDateTimeUTC.toISOString()}`);
      
      console.log(`  ✓ isActive: ${quiz.isActive}`);
      console.log(`  ✓ access: ${quiz.access} | accessibleTo: ${quiz.accessibleTo}`);
      
      if (now < startDateTimeUTC) {
        console.log(`  ❌ BLOCKED: Not started yet`);
      } else if (now > endDateTimeUTC) {
        console.log(`  ❌ BLOCKED: Quiz has ended (${Math.floor((now - endDateTimeUTC) / 1000 / 60)} minutes ago)`);
      } else {
        console.log(`  ✅ AVAILABLE: Can be taken now`);
      }
      console.log('');
    });
    
    mongoose.connection.close();
  });
