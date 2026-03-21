import { Response, Request } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types';
import { EmailService } from '../services/emailService';
import crypto from 'crypto';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import Course from '../models/Course';
import User from '../models/User';
import Role from '../models/Role';
import { ROLE_PERMISSIONS } from '../middleware/roleGuard';
import csvParser from 'csv-parser';

const userService = new UserService();
const emailService = new EmailService();

// Helper function to check batch capacity
const checkBatchCapacity = async (batchId: string, tenantId: string): Promise<{ batch: any; isFull: boolean; enrolledCount: number; capacity: number }> => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new Error('Batch not found');
  }
  const enrolledCount = await User.countDocuments({ batchId, tenantId, isActive: true, role: 'STUDENT' });
  const capacity = batch.capacity || 30;
  return { batch, isFull: enrolledCount >= capacity, enrolledCount, capacity };
};

// Helper function to auto-enroll student in batch's course
const autoEnrollInBatchCourse = async (userId: string, batchId: string, tenantId: string): Promise<void> => {
  try {
    console.log(`   📚 Auto-enrolling student in batch course...`);
    console.log(`      User ID: ${userId}, Batch ID: ${batchId}`);
    
    const batch = await Batch.findById(batchId);
    if (!batch) {
      console.log(`   ⚠️ Batch not found: ${batchId}`);
      return;
    }
    
    console.log(`      Batch found: ${batch.name}`);
    console.log(`      Batch courseId: ${batch.courseId}`);
    
    if (!batch.courseId) {
      console.log(`   ⚠️ Batch has no associated course`);
      return;
    }
    
    // Check if already enrolled
    const existing = await Enrollment.findOne({ userId, courseId: batch.courseId, tenantId });
    if (existing) {
      console.log(`   ℹ️ Student already enrolled in course`);
      return;
    }
    
    // Create enrollment
    const enrollment = new Enrollment({ 
      userId, 
      courseId: batch.courseId, 
      tenantId,
      status: 'enrolled',
      progress: 0,
      enrolledAt: new Date()
    });
    await enrollment.save();
    
    // Increment course enrollment count
    await Course.findByIdAndUpdate(batch.courseId, { $inc: { enrollmentCount: 1 } });
    
    console.log(`   ✅ Auto-enrolled in batch course (Course ID: ${batch.courseId})`);
  } catch (error: any) {
    console.error(`   ❌ Failed to auto-enroll in batch course:`, error.message);
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, firstName, lastName, password, role, customRoleId } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email, firstName, lastName, and password are required'
      });
    }

    const user = await userService.createUser(
      email,
      firstName,
      lastName,
      password,
      role || 'STUDENT',
      req.tenantId!,
      undefined,
      customRoleId || undefined
    );

    // Generate reset token for password setup
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userService.setResetToken(user._id.toString(), resetToken, resetTokenExpires);

    // Generate setup link and send welcome email
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${resetToken}&email=${email}`;
    let emailSent = false;
    let emailError = null;
    try {
      await emailService.sendWelcomeEmail(email, firstName, setupLink);
      emailSent = true;
      console.log(`   ✅ Welcome email sent to ${email}`);
    } catch (err: any) {
      console.log(`   ❌ Email sending failed for ${email}: ${err.message}`);
      emailError = err.message;
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'User created successfully. Welcome email sent.'
        : 'User created but email could not be sent.',
      data: user,
      emailSent,
      emailError,
      setupLink: !emailSent ? setupLink : undefined
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await userService.getUsersByTenant(req.tenantId!);
    res.json({
      success: true,
      message: 'Users fetched successfully',
      data: users
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users'
    });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User fetched successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user'
    });
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, customRoleId } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const updateData: any = { role };
    // Allow setting or clearing customRoleId
    updateData.customRoleId = customRoleId || null;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user role'
    });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await userService.deleteUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
};

export const deactivateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await userService.deactivateUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deactivate user'
    });
  }
};

export const activateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await userService.activateUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate user'
    });
  }
};

// Onboarding Endpoints

export const inviteStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, firstName, lastName, batchId, role, customRoleId, mobileNumber } = req.body;

    console.log('\n👤 [INVITE STUDENT] Received invitation request');
    console.log('   Email:', email);
    console.log('   Name:', firstName, lastName);
    console.log('   Batch ID:', batchId);

    if (!email || !firstName || !lastName) {
      console.log('   ❌ Validation failed: Missing required fields\n');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email, firstName, and lastName are required'
      });
    }

    // Check batch capacity before adding student
    if (batchId) {
      try {
        const { isFull, enrolledCount, capacity } = await checkBatchCapacity(batchId, req.tenantId!);
        if (isFull) {
          console.log(`   ❌ Batch is full (${enrolledCount}/${capacity})\n`);
          return res.status(400).json({
            success: false,
            message: `Batch is full. Current enrollment: ${enrolledCount}/${capacity}. Cannot add more students.`
          });
        }
        console.log(`   📊 Batch capacity: ${enrolledCount}/${capacity}`);
      } catch (err: any) {
        console.log(`   ❌ Batch capacity check failed: ${err.message}`);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    let user;
    
    if (existingUser) {
      // Check if user is inactive (was deleted) - reactivate them
      if (!existingUser.isActive) {
        console.log('   🔄 Reactivating previously deleted user...');
        existingUser.isActive = true;
        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        if (batchId) {
          existingUser.batchId = batchId;
          existingUser.batchJoinedDate = new Date();
        }
        await existingUser.save();
        user = existingUser;
        console.log('   ✅ User reactivated:', user._id);
        
        // Auto-enroll in batch course if batch has a course
        if (batchId) {
          await autoEnrollInBatchCourse(user._id.toString(), batchId, req.tenantId!);
        }
      } else {
        // User exists and is active
        console.log('   ❌ User already exists and is active\n');
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }
    } else {
      // Create new user with temporary password
      console.log('   Step 1: Creating user...');
      const tempPassword = crypto.randomBytes(8).toString('hex');
      user = await userService.createUser(
        email,
        firstName,
        lastName,
        tempPassword,
        role || 'STUDENT',
        req.tenantId!,
        batchId,
        customRoleId || undefined
      );
      console.log('   ✅ User created:', user._id);
      
      // Auto-enroll in batch course if batch has a course
      if (batchId) {
        await autoEnrollInBatchCourse(user._id.toString(), batchId, req.tenantId!);
      }
    }

    // Generate reset token for password setup
    console.log('   Step 2: Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await userService.setResetToken(user._id.toString(), resetToken, resetTokenExpires);
    console.log('   ✅ Reset token generated (expires: 24 hours)');

    // Generate setup link
    const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${resetToken}&email=${email}`;
    console.log('   ✅ Setup link generated');

    // Send welcome email
    console.log('   Step 3: Attempting to send welcome email...');
    let emailSent = false;
    let emailError = null;
    try {
      await emailService.sendWelcomeEmail(email, firstName, setupLink, mobileNumber);
      emailSent = true;
      console.log('   ✅ Welcome email sent successfully');
    } catch (err: any) {
      console.log('   ❌ Warning: Email sending failed, but user was created');
      console.error('   Email Error:', err.message);
      emailError = err.message;
      
      // Parse common Gmail errors for user-friendly messages
      if (err.message.includes('Daily user sending limit exceeded')) {
        emailError = 'Gmail daily sending limit exceeded. Please try again tomorrow or use a different email service.';
      } else if (err.message.includes('Invalid login') || err.message.includes('authentication')) {
        emailError = 'Email authentication failed. Please check SMTP credentials.';
      } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        emailError = 'Unable to connect to email server. Please check network settings.';
      }
    }

    console.log('   🎉 Student invitation process complete\n');
    
    // Return response with email status
    const response: any = {
      success: true,
      message: emailSent 
        ? 'Student invited successfully. Welcome email sent.'
        : 'Student created but email could not be sent.',
      data: { 
        userId: user._id, 
        email: user.email,
        setupLink: !emailSent ? setupLink : undefined // Only include link if email failed
      },
      emailSent,
      emailError
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    console.log('   ❌ INVITATION FAILED');
    console.error('   Error:', error.message);
    console.log('👤 [INVITE STUDENT] Process failed\n');
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getMyPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select('role customRoleId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let permissions: string[] = [];
    if (user.customRoleId) {
      const customRole = await Role.findById(user.customRoleId);
      permissions = customRole ? customRole.permissions : (ROLE_PERMISSIONS[user.role] || []);
    } else {
      permissions = ROLE_PERMISSIONS[user.role] || [];
    }

    res.json({ success: true, data: { permissions } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const setupPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email, token, and password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user and validate token
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Block inactive/deactivated users
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact your administrator.'
      });
    }

    if (!user.resetToken || user.resetToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }

    // Update password and clear reset token
    await userService.updatePassword(user._id.toString(), password);
    await userService.clearResetToken(user._id.toString());

    res.json({
      success: true,
      message: 'Password setup successful. You can now login.',
      data: { email: user.email }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { phone, bio, avatar, linkedin, github, profileComplete } = req.body;

    const updateData: any = {};
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (github !== undefined) updateData.github = github;
    if (profileComplete !== undefined) updateData.profileComplete = profileComplete;

    const user = await userService.updateUser(userId, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update profile'
    });
  }
};

// Bulk upload students from CSV
export const bulkUploadStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { students, batchId } = req.body;

    console.log('\n📤 [BULK UPLOAD] Received bulk upload request');
    console.log('   Number of students:', students?.length || 0);
    console.log('   Batch ID:', batchId);

    if (!batchId) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID is required for bulk upload'
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No students data provided'
      });
    }

    // Verify batch exists and check capacity
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check batch capacity
    const { enrolledCount, capacity } = await checkBatchCapacity(batchId, req.tenantId!);
    const availableSlots = capacity - enrolledCount;
    console.log(`   📊 Batch capacity: ${enrolledCount}/${capacity} (${availableSlots} slots available)`);

    if (availableSlots <= 0) {
      return res.status(400).json({
        success: false,
        message: `Batch is full. Current enrollment: ${enrolledCount}/${capacity}. Cannot add more students.`
      });
    }

    if (students.length > availableSlots) {
      return res.status(400).json({
        success: false,
        message: `Cannot add ${students.length} students. Only ${availableSlots} slot(s) available in this batch (${enrolledCount}/${capacity}).`
      });
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: students.length
    };

    for (const studentData of students) {
      const { email, firstName, lastName } = studentData;

      // Validate required fields
      if (!email || !firstName || !lastName) {
        results.failed.push({
          email: email || 'N/A',
          firstName: firstName || 'N/A',
          lastName: lastName || 'N/A',
          error: 'Missing required fields (email, firstName, lastName)'
        });
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        results.failed.push({
          email,
          firstName,
          lastName,
          error: 'Invalid email format'
        });
        continue;
      }

      try {
        // Check if user already exists
        const existingUser = await userService.getUserByEmail(email);
        let user;

        if (existingUser) {
          if (!existingUser.isActive) {
            // Reactivate previously deleted user
            existingUser.isActive = true;
            existingUser.firstName = firstName;
            existingUser.lastName = lastName;
            existingUser.batchId = batchId;
            existingUser.batchJoinedDate = new Date();
            await existingUser.save();
            user = existingUser;
          } else {
            results.failed.push({
              email,
              firstName,
              lastName,
              error: 'User already exists'
            });
            continue;
          }
        } else {
          // Create new user
          const tempPassword = crypto.randomBytes(8).toString('hex');
          user = await userService.createUser(
            email,
            firstName,
            lastName,
            tempPassword,
            'STUDENT',
            req.tenantId!,
            batchId
          );
        }

        // Auto-enroll in batch course if batch has a course
        await autoEnrollInBatchCourse(user._id.toString(), batchId, req.tenantId!);

        // Generate reset token for password setup
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for bulk

        await userService.setResetToken(user._id.toString(), resetToken, resetTokenExpires);

        // Generate setup link
        const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${resetToken}&email=${email}`;

        // Try to send email (don't fail the whole operation if email fails)
        let emailSent = false;
        try {
          await emailService.sendWelcomeEmail(email, firstName, setupLink);
          emailSent = true;
        } catch (emailErr: any) {
          console.log(`   ⚠️ Email failed for ${email}: ${emailErr.message}`);
        }

        results.successful.push({
          email,
          firstName,
          lastName,
          userId: user._id,
          emailSent
        });

      } catch (err: any) {
        results.failed.push({
          email,
          firstName,
          lastName,
          error: err.message || 'Failed to create user'
        });
      }
    }

    console.log(`   ✅ Bulk upload complete: ${results.successful.length} success, ${results.failed.length} failed\n`);

    res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${results.successful.length} students added, ${results.failed.length} failed.`,
      data: results
    });

  } catch (error: any) {
    console.error('   ❌ Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Bulk upload failed',
      error: error.message
    });
  }
};

// Download CSV template for bulk upload
export const downloadBulkTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = 'email,firstName,lastName\njohn.doe@example.com,John,Doe\njane.smith@example.com,Jane,Smith';
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="student_upload_template.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate template'
    });
  }
};