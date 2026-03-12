"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const courseController_1 = require("../controllers/courseController");
const auth_1 = require("../middleware/auth");
const tenantResolver_1 = require("../middleware/tenantResolver");
const roleGuard_1 = require("../middleware/roleGuard");
const router = express_1.default.Router();
// CRUD routes
router.post('/', auth_1.authMiddleware, tenantResolver_1.tenantResolver, (0, roleGuard_1.roleGuard)(['create_courses']), courseController_1.createCourse);
router.get('/', auth_1.authMiddleware, tenantResolver_1.tenantResolver, courseController_1.getCoursesByTenant);
router.get('/:courseId', auth_1.authMiddleware, courseController_1.getCourseById);
router.put('/:courseId', auth_1.authMiddleware, tenantResolver_1.tenantResolver, (0, roleGuard_1.roleGuard)(['edit_courses']), courseController_1.updateCourse);
router.delete('/:courseId', auth_1.authMiddleware, tenantResolver_1.tenantResolver, (0, roleGuard_1.roleGuard)(['delete_courses']), courseController_1.deleteCourse);
router.patch('/:courseId/status', auth_1.authMiddleware, tenantResolver_1.tenantResolver, (0, roleGuard_1.roleGuard)(['edit_courses']), courseController_1.toggleCourseStatus);
exports.default = router;
//# sourceMappingURL=courseRoutes.js.map