import { Response, Request } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types';
import { EmailService } from '../services/emailService';
import crypto from 'crypto';

const userService = new UserService();
const emailService = new EmailService();

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, firstName, lastName, password, role } = req.body;

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
      req.tenantId!
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
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
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

    const user = await userService.changeUserRole(userId, role);

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
    const { email, firstName, lastName, batchId } = req.body;

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
        'STUDENT',
        req.tenantId!,
        batchId
      );
      console.log('   ✅ User created:', user._id);
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
    try {
      await emailService.sendWelcomeEmail(email, firstName, setupLink);
      console.log('   ✅ Welcome email sent successfully');
    } catch (emailError: any) {
      console.log('   ❌ Warning: Email sending failed, but user was created');
      console.error('   Email Error:', emailError.message);
    }

    console.log('   🎉 Student invitation process complete\n');
    res.status(201).json({
      success: true,
      message: 'Student invited successfully. Welcome email sent.',
      data: { userId: user._id, email: user.email }
    });
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