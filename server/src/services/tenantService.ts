import Tenant, { ITenant } from '../models/Tenant';

export class TenantService {
  async createTenant(
    name: string,
    slug: string,
    adminId: string,
    description?: string
  ): Promise<ITenant> {
    const existingTenant = await Tenant.findOne({ slug });
    if (existingTenant) {
      throw new Error('Tenant slug already exists');
    }

    const tenant = new Tenant({
      name,
      slug,
      adminId,
      description,
      subscriptionPlan: 'free',
      isActive: true
    });

    await tenant.save();
    return tenant;
  }

  async getTenantById(tenantId: string): Promise<ITenant | null> {
    return await Tenant.findById(tenantId).populate('adminId', 'email firstName lastName');
  }

  async updateTenant(tenantId: string, updateData: Partial<ITenant>): Promise<ITenant | null> {
    return await Tenant.findByIdAndUpdate(tenantId, updateData, { new: true });
  }

  async getAllTenants(): Promise<ITenant[]> {
    return await Tenant.find({ isActive: true });
  }
}