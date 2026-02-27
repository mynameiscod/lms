"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateUser = exports.deactivateUser = exports.deleteUser = exports.updateUserRole = exports.getUserById = exports.getUsers = void 0;
const userService_1 = require("../services/userService");
const userService = new userService_1.UserService();
const getUsers = async (req, res) => {
    try {
        const users = await userService.getUsersByTenant(req.tenantId);
        res.json({
            success: true,
            message: 'Users fetched successfully',
            data: users
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch users'
        });
    }
};
exports.getUsers = getUsers;
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User fetched successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch user'
        });
    }
};
exports.getUserById = getUserById;
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required'
            });
        }
        const user = await userService.changeUserRole(userId, role);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User role updated successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update user role'
        });
    }
};
exports.updateUserRole = updateUserRole;
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.deleteUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User deleted successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete user'
        });
    }
};
exports.deleteUser = deleteUser;
const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.deactivateUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User deactivated successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to deactivate user'
        });
    }
};
exports.deactivateUser = deactivateUser;
const activateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userService.activateUser(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User activated successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to activate user'
        });
    }
};
exports.activateUser = activateUser;
//# sourceMappingURL=userController.js.map