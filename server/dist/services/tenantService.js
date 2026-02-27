"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const Tenant_1 = __importDefault(require("../models/Tenant"));
class TenantService {
    async createTenant(name, slug, adminId, description) {
        const existingTenant = await Tenant_1.default.findOne({ slug });
        if (existingTenant) {
            throw new Error('Tenant slug already exists');
        }
        const tenant = new Tenant_1.default({
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
    async getTenantById(tenantId) {
        return await Tenant_1.default.findById(tenantId).populate('adminId', 'email firstName lastName');
    }
    async updateTenant(tenantId, updateData) {
        return await Tenant_1.default.findByIdAndUpdate(tenantId, updateData, { new: true });
    }
    async getAllTenants() {
        return await Tenant_1.default.find({ isActive: true });
    }
}
exports.TenantService = TenantService;
//# sourceMappingURL=tenantService.js.map