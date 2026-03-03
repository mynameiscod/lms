"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.setupPassword = exports.inviteStudent = exports.activateUser = exports.deactivateUser = exports.deleteUser = exports.updateUserRole = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const userService_1 = require("../services/userService");
const emailService_1 = require("../services/emailService");
const crypto_1 = __importDefault(require("crypto"));
const userService = new userService_1.UserService();
const emailService = new emailService_1.EmailService();
const createUser = async (req, res) => {
    try {
        const { email, firstName, lastName, password, role } = req.body;
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Email, firstName, lastName, and password are required'
            });
        }
        const user = await userService.createUser(email, firstName, lastName, password, role || 'STUDENT', req.tenantId);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: user
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
exports.createUser = createUser;
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
// Onboarding Endpoints
const inviteStudent = async (req, res) => {
    try {
        const { email, firstName, lastName, batchId } = req.body;
        console.log('\n👤 [INVITE STUDENT] Received invitation request');
        console.log('   Email:', email);
        console.log('   Name:', firstName, lastName);
        console.log('   Batch ID:', batchId);
        if (!email || !firstName || !lastName) {
            console.log('   ❌ Validation failed: Missing required fields\n');
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Email, firstName, and lastName are required'
            });
        }
        // Check if user already exists
        const existingUser = await userService.getUserByEmail(email);
        if (existingUser) {
            console.log('   ❌ User already exists\n');
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }
        // Create user with temporary password
        console.log('   Step 1: Creating user...');
        const tempPassword = crypto_1.default.randomBytes(8).toString('hex');
        const user = await userService.createUser(email, firstName, lastName, tempPassword, 'STUDENT', req.tenantId, batchId);
        console.log('   ✅ User created:', user._id);
        // Generate reset token for password setup
        console.log('   Step 2: Generating reset token...');
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await userService.setResetToken(user._id.toString(), resetToken, resetTokenExpires);
        console.log('   ✅ Reset token generated (expires: 24 hours)');
        // Generate setup link
        const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password?token=${resetToken}&email=${email}`;
        console.log('   ✅ Setup link generated');
        // Send welcome email
        console.log('   Step 3: Attempting to send welcome email...');
        try {
            await emailService.sendWelcomeEmail(email, firstName, setupLink);
            console.log('   ✅ Welcome email sent successfully');
        }
        catch (emailError) {
            console.log('   ❌ Warning: Email sending failed, but user was created');
            console.error('   Email Error:', emailError.message);
        }
        console.log('   🎉 Student invitation process complete\n');
        res.status(201).json({
            success: true,
            message: 'Student invited successfully. Welcome email sent.',
            data: { userId: user._id, email: user.email }
        });
    }
    catch (error) {
        console.log('   ❌ INVITATION FAILED');
        console.error('   Error:', error.message);
        console.log('👤 [INVITE STUDENT] Process failed\n');
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.inviteStudent = inviteStudent;
const setupPassword = async (req, res) => {
    try {
        const { email, token, password } = req.body;
        if (!email || !token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Email, token, and password are required'
            });
        }
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        // Find user and validate token
        const user = await userService.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (!user.resetToken || user.resetToken !== token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
            return res.status(400).json({
                success: false,
                message: 'Token has expired'
            });
        }
        // Update password and clear reset token
        await userService.updatePassword(user._id.toString(), password);
        await userService.clearResetToken(user._id.toString());
        res.json({
            success: true,
            message: 'Password setup successful. You can now login.',
            data: { email: user.email }
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
exports.setupPassword = setupPassword;
const updateProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { phone, bio, avatar, linkedin, github, profileComplete } = req.body;
        const updateData = {};
        if (phone !== undefined)
            updateData.phone = phone;
        if (bio !== undefined)
            updateData.bio = bio;
        if (avatar !== undefined)
            updateData.avatar = avatar;
        if (linkedin !== undefined)
            updateData.linkedin = linkedin;
        if (github !== undefined)
            updateData.github = github;
        if (profileComplete !== undefined)
            updateData.profileComplete = profileComplete;
        const user = await userService.updateUser(userId, updateData);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update profile'
        });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=userController.js.map