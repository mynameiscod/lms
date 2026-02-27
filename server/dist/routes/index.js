"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authRoutes_1 = __importDefault(require("./authRoutes"));
const tenantRoutes_1 = __importDefault(require("./tenantRoutes"));
const courseRoutes_1 = __importDefault(require("./courseRoutes"));
const enrollmentRoutes_1 = __importDefault(require("./enrollmentRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const router = express_1.default.Router();
router.use('/auth', authRoutes_1.default);
router.use('/tenants', tenantRoutes_1.default);
router.use('/courses', courseRoutes_1.default);
router.use('/enrollments', enrollmentRoutes_1.default);
router.use('/users', userRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map