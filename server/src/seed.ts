import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import User from './models/User';
import Tenant from './models/Tenant';
import Role from './models/Role';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-saas';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

const seed = async () => {
  try {
    await connectDB();

    // Delete existing test users to ensure fresh password hashes
    await User.deleteMany({ email: { $in: ['admin@test.com', 'student@test.com', 'instructor@test.com', 'tempAdmin@seed.internal'] } });
    console.log('✅ Cleared old test users');

    // Define permissions
    const allPermissions = [
      'manage_roles', 'manage_users', 'create_courses', 'edit_courses', 'delete_courses',
      'view_courses', 'manage_enrollments', 'view_reports', 'manage_tenant',
      'create_quiz', 'edit_quiz', 'delete_quiz', 'view_quiz', 'create_question',
      'edit_question', 'delete_question', 'view_attendance', 'edit_attendance'
    ];

    const instructorPermissions = [
      'create_courses', 'edit_courses', 'view_courses', 'manage_enrollments',
      'view_reports', 'create_quiz', 'edit_quiz', 'delete_quiz', 'view_quiz',
      'create_question', 'edit_question', 'delete_question'
    ];

    // Create admin role if not exists
    let adminRole: any = await Role.findOne({ name: 'TENANT_ADMIN' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'TENANT_ADMIN',
        description: 'Tenant Administrator',
        permissions: allPermissions,
      });
      console.log('✅ Admin Role created');
    } else {
      // Update existing role to include all permissions
      await Role.updateOne({ name: 'TENANT_ADMIN' }, { permissions: allPermissions });
    }

    // Create instructor role if not exists
    let instructorRole: any = await Role.findOne({ name: 'INSTRUCTOR' });
    if (!instructorRole) {
      instructorRole = await Role.create({
        name: 'INSTRUCTOR',
        description: 'Instructor',
        permissions: instructorPermissions,
      });
      console.log('✅ Instructor Role created');
    } else {
      // Update existing role to include report viewing permission
      await Role.updateOne({ name: 'INSTRUCTOR' }, { permissions: instructorPermissions });
    }

    // Create student role if not exists
    let studentRole: any = await Role.findOne({ name: 'STUDENT' });
    if (!studentRole) {
      studentRole = await Role.create({
        name: 'STUDENT',
        description: 'Student',
        permissions: ['view_courses', 'view_quiz'],
      });
      console.log('✅ Student Role created');
    }

    // Create or get test tenant
    let tenant = await Tenant.findOne({ name: 'Test Tenant' });
    if (!tenant) {
      // Create admin user first for adminId (password will be hashed by pre-save)
      const tempAdminUser = await User.create({
        email: 'tempAdmin@seed.internal',
        password: 'Test123!', // Plain text - will be hashed by pre-save hook
        firstName: 'Temp',
        lastName: 'Admin',
        tenantId: new mongoose.Types.ObjectId(),
        role: 'TENANT_ADMIN',
        isActive: false,
      });

      // Now create the real tenant with proper adminId
      tenant = await Tenant.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        adminId: tempAdminUser._id,
        isActive: true,
      });

      // Update temp user with actual tenant
      await User.updateOne({ _id: tempAdminUser._id }, { tenantId: tenant._id });

      console.log('✅ Test Tenant created');
    } else {
      console.log('ℹ️  Test Tenant already exists');
    }

    // Create test admin user (password will be hashed by pre-save hook)
    const adminUser = await User.create({
      email: 'admin@test.com',
      password: 'Test123!', // Plain text - will be hashed by pre-save hook
      firstName: 'Admin',
      lastName: 'User',
      tenantId: tenant?._id,
      role: 'TENANT_ADMIN',
      isActive: true,
    });
    console.log('✅ Test Admin user created');
    console.log('   Email: admin@test.com');
    console.log('   Password: Test123!');

    // Create test student user (password will be hashed by pre-save hook)
    const studentUser = await User.create({
      email: 'student@test.com',
      password: 'Test123!', // Plain text - will be hashed by pre-save hook
      firstName: 'Student',
      lastName: 'User',
      tenantId: tenant?._id,
      role: 'STUDENT',
      isActive: true,
    });
    console.log('✅ Test Student user created');
    console.log('   Email: student@test.com');
    console.log('   Password: Test123!');

    // Create test instructor user (password will be hashed by pre-save hook)
    const instructorUser = await User.create({
      email: 'instructor@test.com',
      password: 'Test123!', // Plain text - will be hashed by pre-save hook
      firstName: 'Instructor',
      lastName: 'User',
      tenantId: tenant?._id,
      role: 'INSTRUCTOR',
      isActive: true,
    });
    console.log('✅ Test Instructor user created');
    console.log('   Email: instructor@test.com');
    console.log('   Password: Test123!');

    console.log('\n✅ Seeding completed successfully!\n');
    console.log('Test Credentials:');
    console.log('─────────────────');
    console.log('Admin Login:');
    console.log('  Email: admin@test.com');
    console.log('  Password: Test123!');
    console.log('  Tenant: Test Tenant (optional)');
    console.log('\nInstructor Login:');
    console.log('  Email: instructor@test.com');
    console.log('  Password: Test123!');
    console.log('  Tenant: Test Tenant (optional)');
    console.log('\nStudent Login:');
    console.log('  Email: student@test.com');
    console.log('  Password: Test123!');
    console.log('  Tenant: Test Tenant (optional)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seed();
