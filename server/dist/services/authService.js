"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const Tenant_1 = __importDefault(require("../models/Tenant"));
class AuthService {
    async register(email, firstName, lastName, password, tenantId) {
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists');
        }
        const user = new User_1.default({
            email,
            firstName,
            lastName,
            password,
            tenantId,
            role: 'STUDENT'
        });
        await user.save();
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