"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log(`[AUTH] Path: ${req.method} ${req.path}, Authorization: ${authHeader ? 'Present' : 'Missing'}`);
        const token = authHeader?.split(' ')[1];
        if (!token) {
            console.log('[AUTH] No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret-key');
        console.log(`[AUTH] Token valid for user: ${decoded.id}`);
        // Check if user still exists and is active
        const user = await User_1.default.findById(decoded.id).select('isActive');
        if (!user) {
            console.log('[AUTH] User not found in database');
            return res.status(401).json({
                success: false,
                message: 'User account not found',
                code: 'USER_NOT_FOUND'
            });
        }
        if (!user.isActive) {
            console.log('[AUTH] User account is deactivated');
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact your administrator.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log(`[AUTH] Token verification failed: ${error}`);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map