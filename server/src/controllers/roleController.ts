import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { RoleService } from '../services/roleService';
import { PERMISSION_GROUPS, SUPER_ADMIN_GRANTED } from '../middleware/roleGuard';

const roleService = new RoleService();

const isSuper = (req: AuthenticatedRequest) => req.user?.role === 'SUPER_ADMIN';

/**
 * The permissions a role ends up with when someone other than a super admin saves it: everything
 * they asked for except the super-admin-only ones, which stay exactly as the role already had them.
 */
const guardGrants = (req: AuthenticatedRequest, requested: string[], existing: string[] = []): string[] => {
  if (isSuper(req)) return requested;
  const kept = existing.filter((p) => SUPER_ADMIN_GRANTED.includes(p));
  return [...requested.filter((p) => !SUPER_ADMIN_GRANTED.includes(p)), ...kept];
};

export const getAvailablePermissions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  res.status(200).json({
    success: true,
    message: 'Available permissions fetched',
    // An institute admin is not shown what they cannot give.
    data: isSuper(req) ? PERMISSION_GROUPS : Object.fromEntries(Object.entries(PERMISSION_GROUPS).map(([k, g]) => [k, {
      ...g, permissions: g.permissions.filter((p) => !SUPER_ADMIN_GRANTED.includes(p.key)),
    }])),
  });
};

export const createRole = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: 'Role name is required'
      });
    }

    const roleData = {
      name,
      description,
      permissions: guardGrants(req, permissions || []),
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
    const { name, description, permissions } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) {
      const current: any = isSuper(req) ? null : await roleService.getRoleById(roleId, req.tenantId!);
      updateData.permissions = guardGrants(req, permissions, current?.permissions || []);
    }

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

    const role = await roleService.addPermissions(roleId, req.tenantId!, guardGrants(req, permissions));

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

    const role = await roleService.removePermissions(roleId, req.tenantId!, guardGrants(req, permissions));

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
