import mongoose, { Connection } from 'mongoose';

/**
 * A connection string with the credentials taken out.
 *
 * MONGODB_URI is `mongodb://user:password@host:port/db?authSource=admin` in every deployed
 * environment, so printing it verbatim wrote the database root password into docker logs,
 * any log shipper and every deploy transcript. Host and database name are the only parts of
 * a startup line anybody needs, and the only parts that are not a secret.
 *
 * Parsed with a string match rather than `new URL()` because the one thing this must never
 * do is fall back to printing the original: anything that is not a recognisable mongodb URI
 * returns a fixed label instead, so a malformed value cannot be echoed either.
 */
export function redactMongoUri(uri: string): string {
  const m = /^mongodb(?:\+srv)?:\/\/(.*)$/i.exec(String(uri || ''));
  if (!m) return '(unrecognised connection string)';
  // Userinfo runs to the LAST '@' — a password may legitimately contain one.
  const afterUserInfo = m[1].slice(m[1].lastIndexOf('@') + 1);
  // The query string carries options and can carry credentials of its own.
  return afterUserInfo.split('?')[0] || '(unknown host)';
}

/**
 * Strip any connection string out of text we did not write.
 *
 * Driver errors for a malformed URI can quote the URI back at you, so the message from a
 * failed connect is not safe to log as-is.
 */
const scrubUri = (text: string): string =>
  String(text || '').replace(/mongodb(?:\+srv)?:\/\/\S*/gi, '<redacted connection string>');

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas';

    console.log(`🔗 Connecting to MongoDB: ${redactMongoUri(mongoURI)}`);

    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      /*
       * A five-second socket timeout is a five-second ceiling on every database operation.
       *
       * That is generous when writes are small and fatal when they are not: under a live
       * exam the larger writes ran past five seconds, were killed mid-flight, retried, and
       * ran past it again. The retries were the load. Requests sat for three minutes behind
       * that churn while the CPU idled at 200%, because nothing was working — everything was
       * waiting on an operation that kept being cut.
       *
       * Forty-five seconds is long enough that a slow write finishes instead of thrashing,
       * and short enough that a genuinely dead socket is still noticed.
       */
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      /* Explicit, so the ceiling is a decision rather than whatever the driver defaults to. */
      maxPoolSize: 50,
      minPoolSize: 5,
      retryWrites: false
    });

    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', scrubUri(error.message));

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