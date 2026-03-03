"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const tenantMiddleware_1 = require("../middleware/tenantMiddleware");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
// PUBLIC ROUTES (no auth required)
// Setup password from email link (public route - no auth required for new students)
router.post('/setup-password', userController_1.setupPassword);
// Apply auth and tenant middleware to all other routes
router.use(auth_1.authMiddleware);
router.use(tenantMiddleware_1.tenantMiddleware);
// Create a new user (requires manage_tenant_users permission)
router.post('/', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.createUser);
// Get all users in tenant
router.get('/', userController_1.getUsers);
// Get user by ID
router.get('/:userId', userController_1.getUserById);
// Update user role
router.patch('/:userId/role', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.updateUserRole);
// Deactivate user
router.patch('/:userId/deactivate', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.deactivateUser);
// Activate user
router.patch('/:userId/activate', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.activateUser);
// Delete user
router.delete('/:userId', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.deleteUser);
// Onboarding Routes
// Invite a student (requires manage_tenant_users permission)
router.post('/invite/student', (0, roleGuard_1.roleGuard)(['manage_tenant_users']), userController_1.inviteStudent);
// Update user profile
router.patch('/:userId/profile', userController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map