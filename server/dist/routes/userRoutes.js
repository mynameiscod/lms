"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const tenantMiddleware_1 = require("../middleware/tenantMiddleware");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth and tenant middleware to all routes
router.use(auth_1.authMiddleware);
router.use(tenantMiddleware_1.tenantMiddleware);
// Get all users in tenant
router.get('/', userController_1.getUsers);
// Get user by ID
router.get('/:userId', userController_1.getUserById);
// Update user role
router.patch('/:userId/role', userController_1.updateUserRole);
// Deactivate user
router.patch('/:userId/deactivate', userController_1.deactivateUser);
// Activate user
router.patch('/:userId/activate', userController_1.activateUser);
// Delete user
router.delete('/:userId', userController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map