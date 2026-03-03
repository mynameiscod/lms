import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { AuthService } from '../services/authService';

const authService = new AuthService();

// Register a new organization with admin user
export const registerOrganization = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { organizationName, email, firstName, lastName, password } = req.body;

    if (!organizationName || !email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Organization name, email, firstName, lastName, and password are required'
      });
    }

    // Create organization (tenant) + admin user using existing service
    // The authService.register will create tenant if slug doesn't exist
    const user = await authService.register(email, firstName, lastName, password, organizationName);

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