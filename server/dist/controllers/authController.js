"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const authService_1 = require("../services/authService");
const authService = new authService_1.AuthService();
const register = async (req, res) => {
    try {
        const { email, firstName, lastName, password, tenantId } = req.body;
        if (!email || !firstName || !lastName || !password || !tenantId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Email, firstName, lastName, password, and tenantId are required'
            });
        }
        const user = await authService.register(email, firstName, lastName, password, tenantId);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { userId: user._id }
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
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Email and password are required'
            });
        }
        const result = await authService.login(email, password);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: result
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.login = login;
//# sourceMappingURL=authController.js.map