"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const enrollmentController_1 = require("../controllers/enrollmentController");
const auth_1 = require("../middleware/auth");
const tenantResolver_1 = require("../middleware/tenantResolver");
const roleGuard_1 = require("../middleware/roleGuard");
const router = express_1.default.Router();
router.post('/enroll', auth_1.authMiddleware, tenantResolver_1.tenantResolver, enrollmentController_1.enrollStudent);
router.get('/my-enrollments', auth_1.authMiddleware, tenantResolver_1.tenantResolver, enrollmentController_1.getStudentEnrollments);
router.get('/:courseId', auth_1.authMiddleware, (0, roleGuard_1.roleGuard)(['view_enrolled_students']), enrollmentController_1.getCourseEnrollments);
exports.default = router;
//# sourceMappingURL=enrollmentRoutes.js.map