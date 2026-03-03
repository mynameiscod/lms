import mongoose, { Connection } from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas';
    
    console.log(`🔗 Connecting to MongoDB: ${mongoURI}`);

    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      retryWrites: false
    });

    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.warn('⚠️  Continuing anyway - database operations may fail');
  }
};

export default connectDB;