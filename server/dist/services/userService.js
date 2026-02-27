"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = __importDefault(require("../models/User"));
class UserService {
    async getAllUsers(tenantId) {
        return await User_1.default.find({ tenantId, isActive: true });
    }
    async getUsersByTenant(tenantId) {
        return await User_1.default.find({ tenantId, isActive: true });
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
        return await User_1.default.findByIdAndDelete(userId);
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
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map