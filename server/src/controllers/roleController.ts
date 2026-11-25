import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { RoleService } from '../services/roleService';
import { PERMISSION_GROUPS, SUPER_ADMIN_GRANTED, PLATFORM_ONLY } from '../middleware/roleGuard';
import { modulesForTenant } from '../middleware/moduleGate';
import { moduleOfPermission, groupOfPermission } from '../config/permissionModules';

const roleService = new RoleService();

const isSuper = (req: AuthenticatedRequest) => req.user?.role === 'SUPER_ADMIN';

/**
 * The permissions a role ends up with when someone other than a super admin saves it: everything
 * they asked for except the super-admin-only ones, which stay exactly as the role already had them.
 */
const guardGrants = async (req: AuthenticatedRequest, requested: string[], existing: string[] = []): Promise<string[]> => {
  requested = (requested || []).filter((p) => !PLATFORM_ONLY.includes(p));
  if (isSuper(req)) return requested;
  // A permission of a module the institute does not have cannot be added; one the role already has
  // stays, so switching the module back on later needs no role edits.
  const offered = await offeredFor(req);
  const blocked = (p: string) => SUPER_ADMIN_GRANTED.includes(p) || !offered(p);
  const kept = existing.filter(blocked);
  return Array.from(new Set([...requested.filter((p) => !blocked(p)), ...kept]));
};

/**
 * Whether a permission is offered to this person on the Roles screen: not to an institute admin when it
 * belongs to a module their institute does not have (config/permissionModules). The super admin, and an
 * institute whose modules cannot be read, see everything (fail open: a database blip must not empty the screen).
 */
async function offeredFor(req: AuthenticatedRequest): Promise<(permKey: string) => boolean> {
  if (isSuper(req) || !req.tenantId) return () => true;
  let modules: Record<string, boolean>;
  try { modules = await modulesForTenant(String(req.tenantId)); } catch { return () => true; }
  return (permKey: string) => {
    const group = groupOfPermission(PERMISSION_GROUPS as any, permKey);
    const mod = group ? moduleOfPermission(group, permKey) : null;
    return !mod || modules[mod] !== false;
  };
}

export const getAvailablePermissions = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<any>>
) => {
  const offered = await offeredFor(req);
  res.status(200).json({
    success: true,
    message: 'Available permissions fetched',
    // Nobody is shown what cannot be given: the platform keys never go on a role, an institute admin
    // does not see the super-admin-only ones, nor the permissions of modules their institute does not have.
    data: Object.fromEntries(Object.entries(PERMISSION_GROUPS).map(([k, g]) => [k, {
      ...g, permissions: g.permissions.filter((p) => !PLATFORM_ONLY.includes(p.key) && (isSuper(req) || !SUPER_ADMIN_GRANTED.includes(p.key)) && offered(p.key)),
    }]).filter(([, g]: any) => g.permissions.length > 0)),
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
      permissions: await guardGrants(req, permissions || []),
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
      updateData.permissions = await guardGrants(req, permissions, current?.permissions || []);
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

    const role = await roleService.addPermissions(roleId, req.tenantId!, await guardGrants(req, permissions));

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

    const role = await roleService.removePermissions(roleId, req.tenantId!, await guardGrants(req, permissions));

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
