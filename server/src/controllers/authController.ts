import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AuthService } from '../services/authService';
import { EmailService } from '../services/emailService';
import User from '../models/User';
import Tenant from '../models/Tenant';
import { jwtSecret } from '../config/secrets';

const authService = new AuthService();

// Friendly display names for module keys
const MODULE_LABELS: Record<string, string> = {
  courses: 'Courses',
  attendance: 'Attendance',
  quizzes: 'Quizzes & Assessments',
  assignments: 'Assignments',
  classRecordings: 'Class Recordings',
  codeAssessments: 'Code Assessments',
  mockInterviews: 'Mock Interviews',
  placement: 'Placement',
  leads: 'Leads & CRM',
  marketing: 'Marketing'
};

// Register a new organization with admin user
export const registerOrganization = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const {
      organizationName, email, firstName, lastName, password,
      studentFeatures, modules, type, subscriptionPlan
    } = req.body;

    if (!organizationName || !email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Organization name, email, firstName, lastName, and password are required'
      });
    }

    // Create organization (tenant) + admin user
    const user = await authService.registerOrganizationFull(
      email, firstName, lastName, password, organizationName,
      { studentFeatures, modules, type, subscriptionPlan }
    );

    // Generate frontend links
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const tenantId = user.tenantId?.toString();
    const loginLink = `${frontendUrl}/login?tenantId=${tenantId}`;

    // Send welcome email to tenant admin (non-blocking)
    const emailService = new EmailService();
    const enabledModules = modules
      ? Object.entries(modules as Record<string, boolean>)
          .filter(([, v]) => v)
          .map(([k]) => MODULE_LABELS[k] || k)
      : Object.values(MODULE_LABELS); // all enabled by default

    emailService.sendTenantAdminWelcomeEmail({
      adminName: `${firstName} ${lastName}`,
      organizationName,
      email,
      password,
      loginLink,
      enabledModules
    }).catch(() => { /* non-blocking */ });

    // Generate token for auto-login
    const loginResult = await authService.login(email, password);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: loginResult
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const register = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { email, firstName, lastName, password, tenantId } = req.body;

    if (!email || !firstName || !lastName || !password || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email, firstName, lastName, password, and tenantId are required'
      });
    }

    const user = await authService.register(email, firstName, lastName, password, tenantId);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { userId: user._id }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

// Forgot Password - Send reset email
export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Don't reveal deactivation status — treat same as not found
    if (!user.isActive) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (1 hour)
    user.resetToken = hashedToken;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    // Send email
    try {
      const emailService = new EmailService();
      await emailService.sendPasswordResetEmail(
        user.email,
        user.firstName,
        resetUrl
      );
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Reset the token fields if email fails
      user.resetToken = undefined;
      user.resetTokenExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.',
        error: 'Email service error'
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message
    });
  }
};

// Refresh Token - Return a new JWT using the current valid token
export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided', error: 'MISSING_TOKEN' });
    }
    const oldToken = authHeader.split(' ')[1];
    const secret = jwtSecret();
    let decoded: any;
    try {
      decoded = jwt.verify(oldToken, secret as string);
    } catch {
      return res.status(401).json({ success: false, message: 'Token invalid or expired', error: 'INVALID_TOKEN' });
    }
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive', error: 'USER_INACTIVE' });
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const newToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, tenantId: user.tenantId },
      secret as string,
      { expiresIn } as any
    );
    return res.status(200).json({ success: true, message: 'Token refreshed', data: { token: newToken } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Token refresh failed', error: error.message });
  }
};

// Reset Password - Verify token and set new password
export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
        error: 'Missing required fields'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
        error: 'Password too short'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        error: 'Invalid token'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};