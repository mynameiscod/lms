import Role, { IRole } from '../models/Role';

export class RoleService {
  async createRole(roleData: {
    name: string;
    permissions: string[];
    tenantId: string;
  }): Promise<IRole> {
    // Check if role with same name exists for this tenant
    const existingRole = await Role.findOne({
      name: roleData.name,
      tenantId: roleData.tenantId
    });

    if (existingRole) {
      throw new Error('Role with this name already exists for this tenant');
    }

    const role = new Role(roleData);
    await role.save();
    return role;
  }

  async getRolesByTenant(tenantId: string): Promise<IRole[]> {
    return await Role.find({ tenantId });
  }

  async getRoleById(roleId: string, tenantId: string): Promise<IRole | null> {
    return await Role.findOne({ _id: roleId, tenantId });
  }

  async updateRole(
    roleId: string,
    tenantId: string,
    updateData: Partial<Pick<IRole, 'name' | 'permissions'>>
  ): Promise<IRole | null> {
    // If updating name, check for duplicates
    if (updateData.name) {
      const existingRole = await Role.findOne({
        name: updateData.name,
        tenantId,
        _id: { $ne: roleId }
      });

      if (existingRole) {
        throw new Error('Role with this name already exists for this tenant');
      }
    }

    return await Role.findOneAndUpdate(
      { _id: roleId, tenantId },
      { $set: updateData },
      { new: true }
    );
  }

  async deleteRole(roleId: string, tenantId: string): Promise<IRole | null> {
    const role = await Role.findOne({ _id: roleId, tenantId });
    if (role) {
      await Role.deleteOne({ _id: roleId, tenantId });
    }
    return role;
  }

  async addPermissions(
    roleId: string,
    tenantId: string,
    permissions: string[]
  ): Promise<IRole | null> {
    return await Role.findOneAndUpdate(
      { _id: roleId, tenantId },
      { $addToSet: { permissions: { $each: permissions } } },
      { new: true }
    );
  }

  async removePermissions(
    roleId: string,
    tenantId: string,
    permissions: string[]
  ): Promise<IRole | null> {
    return await Role.findOneAndUpdate(
      { _id: roleId, tenantId },
      { $pull: { permissions: { $in: permissions } } },
      { new: true }
    );
  }
}
