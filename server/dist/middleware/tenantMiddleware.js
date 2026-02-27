"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMiddleware = void 0;
const tenantMiddleware = (req, res, next) => {
    // Extract tenant ID from request (e.g., from headers, JWT, or params)
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
    }
    // Attach tenant ID to request object
    req.tenantId = tenantId;
    next();
};
exports.tenantMiddleware = tenantMiddleware;
//# sourceMappingURL=tenantMiddleware.js.map