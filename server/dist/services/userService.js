"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = __importDefault(require("../models/User"));
class UserService {
    async createUser(email, firstName, lastName, password, role, tenantId, batchId) {
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Create new user - password will be hashed by pre-save hook
        const user = new User_1.default({
            email,
            firstName,
            lastName,
            password,
            role: role || 'STUDENT',
            tenantId,
            isActive: true,
            profileComplete: false,
            batchId: batchId || undefined,
            batchJoinedDate: batchId ? new Date() : undefined
        });
        await user.save();
        return user;
    }
    async getAllUsers(tenantId) {
        // Return all users (including inactive) for admin management
        return await User_1.default.find({ tenantId });
    }
    async getUsersByTenant(tenantId) {
        // Return all users (including inactive) for admin management
        return await User_1.default.find({ tenantId });
    }
    async getUserById(userId) {
        return await User_1.default.findById(userId);
    }
    async updateUserRole(userId, role) {
        return await User_1.default.findByIdAndUpdate(userId, { role }, { new: true });
    }
    async changeUserRole(userId, role) {
        return await User_1.default.findByIdAndUpdate(userId, { role }, { new: true });
    }
    async deleteUser(userId) {
        // Soft delete - mark user as inactive instead of removing from database
        return await User_1.default.findByIdAndUpdate(userId, { isActive: false }, { new: true });
    }
    async getUserByEmail(email) {
        return await User_1.default.findOne({ email });
    }
    async deactivateUser(userId) {
        return await User_1.default.findByIdAndUpdate(userId, { isActive: false }, { new: true });
    }
    async activateUser(userId) {
        return await User_1.default.findByIdAndUpdate(userId, { isActive: true }, { new: true });
    }
    async setResetToken(userId, token, expires) {
        return await User_1.default.findByIdAndUpdate(userId, {
            resetToken: token,
            resetTokenExpires: expires
        }, { new: true });
    }
    async clearResetToken(userId) {
        return await User_1.default.findByIdAndUpdate(userId, {
            resetToken: null,
            resetTokenExpires: null
        }, { new: true });
    }
    async updatePassword(userId, newPassword) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.password = newPassword;
        await user.save();
        return user;
    }
    async updateUser(userId, updateData) {
        return await User_1.default.findByIdAndUpdate(userId, updateData, { new: true });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map