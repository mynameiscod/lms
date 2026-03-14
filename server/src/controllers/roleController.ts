import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { RoleService } from '../services/roleService';
import { PERMISSION_GROUPS } from '../middleware/roleGuard';

const roleService = new RoleService();

export const getAvailablePermissions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  res.status(200).json({
    success: true,
    message: 'Available permissions fetched',
    data: PERMISSION_GROUPS
  });
};

export const createRole = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Role name is required'
      });
    }

    const roleData = {
      name,
      permissions: permissions || [],
      tenantId: req.tenantId!
    };

    const role = await roleService.createRole(roleData);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getRolesByTenant = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const roles = await roleService.getRolesByTenant(req.tenantId!);

    res.status(200).json({
      success: true,
      message: 'Roles fetched successfully',
      data: roles
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const getRoleById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { roleId } = req.params;

    const role = await roleService.getRoleById(roleId, req.tenantId!);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
        error: 'Role does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role fetched successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const updateRole = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { roleId } = req.params;
    const { name, permissions } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = permissions;

    const role = await roleService.updateRole(roleId, req.tenantId!, updateData);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
        error: 'Role does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const deleteRole = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { roleId } = req.params;

    const role = await roleService.deleteRole(roleId, req.tenantId!);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
        error: 'Role does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const addPermissions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Permissions array is required'
      });
    }

    const role = await roleService.addPermissions(roleId, req.tenantId!, permissions);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
        error: 'Role does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Permissions added successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};

export const removePermissions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Permissions array is required'
      });
    }

    const role = await roleService.removePermissions(roleId, req.tenantId!, permissions);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
        error: 'Role does not exist'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Permissions removed successfully',
      data: role
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
};
