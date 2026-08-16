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

    /**
     * In production, a server that cannot reach its database is not a server.
     *
     * This used to log "continuing anyway" and carry on, which is how a blue/green cutover
     * to an instance with no database looked like a successful deploy: the process was up,
     * the old health endpoint returned OK, and every request 500'd. Refusing to start makes
     * that a deploy that visibly did not happen — the previous slot keeps serving.
     *
     * Development still continues, because working on the client with no local Mongo is a
     * legitimate thing to do and the readiness endpoint reports the truth either way.
     */
    if (process.env.NODE_ENV === 'production') throw error;
    console.warn('⚠️  Continuing anyway (non-production) - database operations will fail');
  }
};

export default connectDB;