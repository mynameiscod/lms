"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTenant = exports.getTenant = exports.createTenant = void 0;
const tenantService_1 = require("../services/tenantService");
const tenantService = new tenantService_1.TenantService();
const createTenant = async (req, res) => {
    try {
        const { name, slug, adminId, description } = req.body;
        if (!name || !slug || !adminId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Name, slug, and adminId are required'
            });
        }
        const tenant = await tenantService.createTenant(name, slug, adminId, description);
        res.status(201).json({
            success: true,
            message: 'Tenant created successfully',
            data: tenant
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.createTenant = createTenant;
const getTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const tenant = await tenantService.getTenantById(tenantId);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found',
                error: 'Tenant does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Tenant fetched successfully',
            data: tenant
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.getTenant = getTenant;
const updateTenant = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const updateData = req.body;
        const tenant = await tenantService.updateTenant(tenantId, updateData);
        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found',
                error: 'Tenant does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Tenant updated successfully',
            data: tenant
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.updateTenant = updateTenant;
//# sourceMappingURL=tenantController.js.map