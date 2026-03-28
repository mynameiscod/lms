// MongoDB Initialization Script for LMS SaaS
// This script runs when MongoDB container starts for the first time

print('🚀 Initializing LMS SaaS Database...');

// Switch to the application database
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || 'lms_saas');

// Create application user
const appUser = process.env.MONGO_USER || 'lms_user';
const appPassword = process.env.MONGO_PASSWORD || 'change_this_password';

try {
    db.createUser({
        user: appUser,
        pwd: appPassword,
        roles: [
            {
                role: 'readWrite',
                db: process.env.MONGO_INITDB_DATABASE || 'lms_saas'
            }
        ]
    });
    print(`✅ Created application user: ${appUser}`);
} catch (error) {
    if (error.code === 11000) {
        print(`⚠️  User ${appUser} already exists`);
    } else {
        print(`❌ Error creating user: ${error.message}`);
    }
}

// Create initial collections with proper indexes
print('📊 Creating collections and indexes...');

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ isActive: 1 });
print('✅ Users collection and indexes created');

// Tenants collection
db.createCollection('tenants');
db.tenants.createIndex({ subdomain: 1 }, { unique: true });
db.tenants.createIndex({ domain: 1 }, { unique: true });
db.tenants.createIndex({ isActive: 1 });
db.tenants.createIndex({ createdAt: 1 });
print('✅ Tenants collection and indexes created');

// Content collection
db.createCollection('content');
db.content.createIndex({ tenantId: 1 });
db.content.createIndex({ type: 1 });
db.content.createIndex({ isPublished: 1 });
db.content.createIndex({ createdBy: 1 });
db.content.createIndex({ createdAt: 1 });
db.content.createIndex({ title: 'text', description: 'text' });
print('✅ Content collection and indexes created');

// Quizzes collection
db.createCollection('quizzes');
db.quizzes.createIndex({ tenantId: 1 });
db.quizzes.createIndex({ contentId: 1 });
db.quizzes.createIndex({ isActive: 1 });
db.quizzes.createIndex({ createdBy: 1 });
db.quizzes.createIndex({ createdAt: 1 });
print('✅ Quizzes collection and indexes created');

// Quiz attempts collection
db.createCollection('quizattempts');
db.quizattempts.createIndex({ quizId: 1 });
db.quizattempts.createIndex({ userId: 1 });
db.quizattempts.createIndex({ tenantId: 1 });
db.quizattempts.createIndex({ submittedAt: 1 });
db.quizattempts.createIndex({ score: 1 });
print('✅ Quiz attempts collection and indexes created');

// Sessions collection
db.createCollection('sessions');
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ userId: 1 });
print('✅ Sessions collection and indexes created');

// Attendance collection
db.createCollection('attendance');
db.attendance.createIndex({ userId: 1 });
db.attendance.createIndex({ tenantId: 1 });
db.attendance.createIndex({ date: 1 });
db.attendance.createIndex({ contentId: 1 });
print('✅ Attendance collection and indexes created');

// Invitations collection
db.createCollection('invitations');
db.invitations.createIndex({ email: 1 });
db.invitations.createIndex({ tenantId: 1 });
db.invitations.createIndex({ token: 1 }, { unique: true });
db.invitations.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.invitations.createIndex({ isUsed: 1 });
print('✅ Invitations collection and indexes created');

// Audit logs collection
db.createCollection('auditlogs');
db.auditlogs.createIndex({ userId: 1 });
db.auditlogs.createIndex({ tenantId: 1 });
db.auditlogs.createIndex({ action: 1 });
db.auditlogs.createIndex({ timestamp: 1 });
db.auditlogs.createIndex({ ipAddress: 1 });
print('✅ Audit logs collection and indexes created');

// Create a default super admin if none exists
try {
    const adminExists = db.users.findOne({ role: 'superadmin' });
    
    if (!adminExists) {
        const defaultAdmin = {
            _id: new ObjectId(),
            email: 'admin@lms-saas.com',
            password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewOQ7YVlAEYG.Hse', // Default: admin123
            firstName: 'System',
            lastName: 'Administrator',
            role: 'superadmin',
            isActive: true,
            isEmailVerified: true,
            tenantId: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        db.users.insertOne(defaultAdmin);
        print('✅ Default super admin created (email: admin@lms-saas.com, password: admin123)');
        print('⚠️  IMPORTANT: Change the default admin password after first login!');
    } else {
        print('✅ Super admin already exists');
    }
} catch (error) {
    print(`❌ Error creating default admin: ${error.message}`);
}

// Create default tenant for demo purposes
try {
    const demoTenantExists = db.tenants.findOne({ subdomain: 'demo' });
    
    if (!demoTenantExists) {
        const demoTenant = {
            _id: new ObjectId(),
            name: 'Demo Organization',
            subdomain: 'demo',
            domain: null,
            isActive: true,
            settings: {
                allowRegistration: true,
                theme: 'default',
                timezone: 'UTC',
                language: 'en'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        db.tenants.insertOne(demoTenant);
        print('✅ Demo tenant created (subdomain: demo)');
    } else {
        print('✅ Demo tenant already exists');
    }
} catch (error) {
    print(`❌ Error creating demo tenant: ${error.message}`);
}

// Display final statistics
print('\n📈 Database initialization completed!');
print('Final statistics:');
print(`• Collections: ${db.runCommand("listCollections").cursor.firstBatch.length}`);
print(`• Users: ${db.users.countDocuments()}`);
print(`• Tenants: ${db.tenants.countDocuments()}`);
print(`• Total indexes: ${db.stats().indexes}`);

print('\n🔐 Security Notes:');
print('• Change default admin password: admin@lms-saas.com / admin123');
print('• Review user permissions regularly');
print('• Enable MongoDB authentication in production');
print('• Consider enabling TLS/SSL for database connections');

print('\n✅ LMS SaaS database initialization complete! 🎉');