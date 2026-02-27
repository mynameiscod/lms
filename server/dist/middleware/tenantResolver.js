"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolver = void 0;
const tenantResolver = (req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({
            success: false,
            message: 'Tenant ID not provided'
        });
    }
    req.tenantId = tenantId;
    next();
};
exports.tenantResolver = tenantResolver;
//# sourceMappingURL=tenantResolver.js.map