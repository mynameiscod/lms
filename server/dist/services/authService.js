"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Tenant_1 = __importDefault(require("../models/Tenant"));
class AuthService {
    async register(email, firstName, lastName, password, tenantIdentifier) {
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists');
        }
        let tenantId;
        let isNewTenant = false;
        // Check if tenantIdentifier is a valid ObjectId
        if (mongoose_1.default.Types.ObjectId.isValid(tenantIdentifier)) {
            const tenant = await Tenant_1.default.findById(tenantIdentifier);
            if (tenant) {
                tenantId = tenant._id;
            }
            else {
                throw new Error('Tenant not found');
            }
        }
        else {
            // Treat it as a tenant name/slug - look up or create
            const slug = tenantIdentifier.toLowerCase().replace(/\s+/g, '-');
            let tenant = await Tenant_1.default.findOne({
                $or: [{ slug }, { name: tenantIdentifier }]
            });
            if (!tenant) {
                // Create a placeholder user ID for adminId (will be updated after user creation)
                const placeholderAdminId = new mongoose_1.default.Types.ObjectId();
                tenant = new Tenant_1.default({
                    name: tenantIdentifier,
                    slug,
                    adminId: placeholderAdminId,
                    isActive: true,
                    subscriptionPlan: 'free'
                });
                await tenant.save();
                isNewTenant = true;
            }
            tenantId = tenant._id;
        }
        // If user is creating a new tenant, make them TENANT_ADMIN
        // Otherwise, they're joining an existing tenant as STUDENT
        const userRole = isNewTenant ? 'TENANT_ADMIN' : 'STUDENT';
        const user = new User_1.default({
            email,
            firstName,
            lastName,
            password,
            tenantId,
            role: userRole
        });
        await user.save();
        // Update tenant's adminId to the new user if they created the tenant
        if (isNewTenant) {
            await Tenant_1.default.findByIdAndUpdate(tenantId, { adminId: user._id });
        }
        return user;
    }
    async login(email, password) {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        const tenant = await Tenant_1.default.findById(user.tenantId);
        const secret = process.env.JWT_SECRET || 'secret-key';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        // Type assertion to bypass TypeScript strict checks
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId
        }, secret, { expiresIn });
        return {
            token,
            user: {
                _id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                tenantId: user.tenantId,
                isActive: user.isActive
            },
            tenant
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map